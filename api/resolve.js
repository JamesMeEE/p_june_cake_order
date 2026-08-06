export default async function handler(req, res) {
  const link = req.query.url || (req.body && req.body.url);
  if (!link) {
    return res.status(400).json({ status: 'error', message: 'missing url' });
  }

  try {
    let finalUrl = link;
    let coords = extractCoords(link);

    if (!coords) {
      const resp = await fetch(link, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      finalUrl = resp.url;
      coords = extractCoords(finalUrl);

      if (!coords) {
        const text = await resp.text();
        coords = extractCoords(text);
      }
    }

    if (coords) {
      return res.status(200).json({ status: 'ok', lat: coords.lat, lng: coords.lng, resolvedUrl: finalUrl });
    }
    return res.status(200).json({ status: 'notfound', resolvedUrl: finalUrl });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

function extractCoords(str) {
  if (!str) return null;
  let m = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = str.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}
