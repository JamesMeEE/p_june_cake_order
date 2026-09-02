var SHEET_ID = '1ZfVCaK9ut-0rNo4kbSn3zJ3JPa4TkI0iW8BzlV80FuM';
var ORDERS_SHEET = 'Orders';
var RESULT_SHEET = 'ResolveTest';
var MAPLINK_COL_HEADER = 'MapLink';

var UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
var UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function testResolveMapLinks() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var orders = ss.getSheetByName(ORDERS_SHEET);
  if (!orders) throw new Error('ไม่พบชีต ' + ORDERS_SHEET);

  var data = orders.getDataRange().getValues();
  if (data.length < 2) { Logger.log('ไม่มีข้อมูลออเดอร์'); return; }

  var header = data[0];
  var mapCol = 13;

  var result = ss.getSheetByName(RESULT_SHEET);
  if (result) result.clear();
  else result = ss.insertSheet(RESULT_SHEET);
  result.appendRow(['Row', 'Original Link', 'Status', 'Lat', 'Lng', 'Resolved URL', 'Note']);

  var okCount = 0, failCount = 0, skipCount = 0;

  for (var i = 1; i < data.length; i++) {
    var link = String(data[i][mapCol] || '').trim();
    var rowNum = i + 1;

    if (!link || link === '-') {
      result.appendRow([rowNum, link, 'skip', '', '', '', 'ไม่มีลิงก์ (นัดรับ)']);
      skipCount++;
      continue;
    }
    if (!/^https?:\/\//i.test(link)) {
      result.appendRow([rowNum, link, 'skip', '', '', '', 'ไม่ใช่ลิงก์ (ข้อความ)']);
      skipCount++;
      continue;
    }

    var res = resolveOne(link);
    if (res.status === 'ok') {
      result.appendRow([rowNum, link, 'ok', res.lat, res.lng, res.resolvedUrl, res.note || '']);
      okCount++;
    } else {
      result.appendRow([rowNum, link, res.status, '', '', res.resolvedUrl || '', res.message || '']);
      failCount++;
    }
    Utilities.sleep(200);
  }

  result.appendRow(['', '', '', '', '', '', '']);
  result.appendRow(['สรุป', 'สำเร็จ: ' + okCount, 'ล้มเหลว: ' + failCount, 'ข้าม: ' + skipCount, '', '', '']);
  Logger.log('เสร็จ | ok=' + okCount + ' fail=' + failCount + ' skip=' + skipCount);
}

function resolveOne(link) {
  try {
    var coords = extractCoords(link);
    if (coords && isValidThaiCoord(coords)) return ok(coords, link, 'จากลิงก์ตรง');

    var finalUrl = followRedirects(link, 0);
    coords = extractCoords(finalUrl);
    if (coords && isValidThaiCoord(coords)) return ok(coords, finalUrl, 'จาก redirect URL');

    var body = fetchBody(finalUrl, UA_MOBILE);
    coords = extractFromBody(body);
    if (coords) return ok(coords, finalUrl, 'จาก body (mobile)');

    body = fetchBody(finalUrl, UA_DESKTOP);
    coords = extractFromBody(body);
    if (coords) return ok(coords, finalUrl, 'จาก body (desktop)');

    return { status: 'notfound', resolvedUrl: finalUrl, message: 'ลิงก์นี้เป็นที่อยู่/สถานที่ ไม่มีพิกัด ต้องคำนวณค่าส่งเอง' };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

function ok(coords, url, note) {
  return { status: 'ok', lat: coords.lat, lng: coords.lng, resolvedUrl: url, note: note };
}

function fetchBody(url, ua) {
  try {
    var resp = UrlFetchApp.fetch(url, {
      followRedirects: true,
      muteHttpExceptions: true,
      headers: { 'User-Agent': ua, 'Accept-Language': 'en-US,en;q=0.9' }
    });
    return resp.getContentText();
  } catch (e) {
    return '';
  }
}

function followRedirects(url, depth) {
  if (depth > 8) return url;
  try {
    var resp = UrlFetchApp.fetch(url, {
      followRedirects: false,
      muteHttpExceptions: true,
      headers: { 'User-Agent': UA_MOBILE, 'Accept-Language': 'en-US,en;q=0.9' }
    });
    var code = resp.getResponseCode();
    if (code >= 300 && code < 400) {
      var headers = resp.getHeaders();
      var loc = headers['Location'] || headers['location'];
      if (loc) {
        if (extractCoords(loc)) return loc;
        return followRedirects(loc, depth + 1);
      }
    }
    return url;
  } catch (e) {
    return url;
  }
}

function extractCoords(str) {
  if (!str) return null;
  var m = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/\/(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

function extractFromBody(body) {
  if (!body) return null;
  var c = extractCoords(body);
  if (c && isValidThaiCoord(c)) return c;
  var patterns = [
    /\[null,null,(-?\d+\.\d{4,}),(-?\d+\.\d{4,})\]/,
    /"latitude":(-?\d+\.\d+),"longitude":(-?\d+\.\d+)/,
    /center=(-?\d+\.\d{4,})(?:%2C|,)(-?\d+\.\d{4,})/,
    /APP_INITIALIZATION_STATE=\[\[\[[\d.]+,(-?\d+\.\d+),(-?\d+\.\d+)\]/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = body.match(patterns[i]);
    if (m) {
      var a = parseFloat(m[1]), b = parseFloat(m[2]);
      var cand = (i === 3) ? { lat: a, lng: b } : { lat: a, lng: b };
      if (isValidThaiCoord(cand)) return cand;
    }
  }
  return null;
}

function isValidThaiCoord(c) {
  if (!c) return false;
  if (isDefaultCoord(c)) return false;
  return c.lat >= 5.5 && c.lat <= 21 && c.lng >= 97 && c.lng <= 106;
}

function isDefaultCoord(c) {
  if (!c) return true;
  if (Math.abs(c.lat - 37.0625) < 0.0001 && Math.abs(c.lng - (-95.677068)) < 0.0001) return true;
  if (Math.abs(c.lat) < 0.01 && Math.abs(c.lng) < 0.01) return true;
  return false;
}

function testSingleLink() {
  var links = [
    'https://maps.app.goo.gl/tqMB76SheHrz6R9h6',
    'https://maps.app.goo.gl/ePc6KphTh1NNQSGw7?g_st=ic',
    'https://maps.app.goo.gl/59bvrz25JN1JUEhG8?g_st=ic'
  ];
  for (var i = 0; i < links.length; i++) {
    Logger.log(links[i] + '\n=> ' + JSON.stringify(resolveOne(links[i])));
  }
}

function debugBody() {
  var link = 'https://maps.app.goo.gl/tqMB76SheHrz6R9h6';
  var finalUrl = followRedirects(link, 0);
  Logger.log('finalUrl: ' + finalUrl);
  var body = fetchBody(finalUrl, UA_DESKTOP);
  Logger.log('body length: ' + body.length);
  var idx = body.search(/-?1[36]\.\d{4,}/);
  Logger.log('first coord-like at ' + idx + ': ' + (idx >= 0 ? body.substr(idx - 40, 120) : 'none'));
}
