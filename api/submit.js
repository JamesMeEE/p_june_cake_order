import { google } from 'googleapis';

const SHEET_ID = '1ZfVCaK9ut-0rNo4kbSn3zJ3JPa4TkI0iW8BzlV80FuM';
const SHEET_NAME = 'Orders';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const data = req.body;
    await appendToSheet(data);
    await sendOrderSummary(data);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function appendToSheet(data) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  await ensureSheetExists(sheets);

  const flavorsText = data.flavors.map(f => `${f.name} x ${f.qty} ชิ้น`).join('\n');
  const saucesText = data.sauces.length > 0
    ? data.sauces.map(s => `${s.name} x ${s.qty} ชิ้น`).join('\n')
    : '-';

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:K`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
        data.userId,
        flavorsText,
        saucesText,
        data.deliveryDate,
        data.name,
        data.phone,
        data.address,
        data.mapLink,
        data.note || '-',
        data.total
      ]]
    }
  });
}

async function ensureSheetExists(sheets) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === SHEET_NAME);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }]
      }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:K`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'Timestamp', 'UserID', 'Flavors', 'Sauces', 'DeliveryDate',
          'Name', 'Phone', 'Address', 'MapLink', 'Note', 'Total'
        ]]
      }
    });
  }
}

async function sendOrderSummary(data) {
  const flexMsg = buildFlexMessage(data);
  const paymentText =
`💳 ชำระเงินได้ที่ (Payment Channel)

〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️

🏦 ธนาคารกสิกรไทย (Kasikorn)
เลขที่บัญชี : 020-2-88388-5
ชื่อบัญชี : เฌนิศา เจริญวสุธร
(Chenisa Jaruenvasutorn)

♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡ ♡

เมื่อชำระเงินเรียบร้อยแล้วกรุณาส่งสลิปการโอนเงินผ่านทางแชทของร้านเพื่อยืนยันรายการสั่งซื้อค่ะ 🙏🏻💖
(After payment, please send your payment slip via chat to confirm your order)

**ค่าบริการอาจมีเพิ่มเติมกรณีที่ระยะทางจัดส่งเกิน 5 กิโลเมตรนะคะ หากไม่เกินส่งฟรีทุกรายการค่าา หรือ หากยอดเกิน 400 บาทส่งฟรีทุกออเดอร์เล้ยย แต่เฉพาะในพื้นที่ Grab นะคะ ☺️**
(Free delivery within 5 km, or on orders over 400 THB 🚖 Available within Grab service areas only.)`;

  await sendLineMessage(data.userId, flexMsg);
  await new Promise(r => setTimeout(r, 500));
  await sendLineMessage(data.userId, { type: 'text', text: paymentText });
}

function buildFlexMessage(data) {
  const blank = { type: 'text', text: ' ', size: 'sm' };
  const brown = '#6b4a26';

  const orderLines = [];

  data.flavors.forEach(f => {
    orderLines.push({
      type: 'text',
      text: `รสชาติ (Flavor): ${f.name} x ${f.qty} ชิ้น`,
      size: 'sm',
      wrap: true
    });
  });

  if (data.sauces.length === 0) {
    orderLines.push({
      type: 'text',
      text: 'ซอส (Extra Sauce): -',
      size: 'sm',
      wrap: true
    });
  } else {
    data.sauces.forEach(s => {
      orderLines.push({
        type: 'text',
        text: `ซอส (Extra Sauce): ${s.name} x ${s.qty} ชิ้น`,
        size: 'sm',
        wrap: true
      });
    });
  }

  return {
    type: 'flex',
    altText: 'สรุปคำสั่งซื้อ',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '📮 สรุปคำสั่งซื้อ',
            weight: 'bold',
            size: 'lg'
          },
          { type: 'separator', margin: 'md' },
          blank,
          {
            type: 'text',
            text: '📝 รายการสั่งซื้อ (Order):',
            weight: 'bold',
            size: 'sm',
            color: brown
          },
          blank,
          ...orderLines,
          blank,
          {
            type: 'text',
            text: '⏰ วัน-เวลาจัดส่ง (Date & Time):',
            weight: 'bold',
            size: 'sm',
            color: brown
          },
          blank,
          {
            type: 'text',
            text: data.deliveryDate,
            size: 'sm',
            wrap: true
          },
          blank,
          {
            type: 'text',
            text: `👤 ชื่อลูกค้า (Name): ${data.name}`,
            size: 'sm',
            wrap: true
          },
          {
            type: 'text',
            text: `📞 เบอร์ติดต่อ (Tel.): ${data.phone}`,
            size: 'sm',
            wrap: true
          },
          {
            type: 'text',
            text: `📍 ที่อยู่ (Address): ${data.address}`,
            size: 'sm',
            wrap: true
          },
          {
            type: 'text',
            size: 'sm',
            wrap: true,
            action: { type: 'uri', uri: data.mapLink },
            contents: [
              { type: 'span', text: '🗺 แผนที่ (Map): ' },
              { type: 'span', text: data.mapLink, color: '#1E88E5' }
            ]
          },
          {
            type: 'text',
            text: `💬 อื่นๆ (Other): ${data.note || '-'}`,
            size: 'sm',
            wrap: true
          },
          { type: 'separator', margin: 'md' },
          blank,
          {
            type: 'text',
            text: `✏️ ยอดที่ต้องชำระ: ${Math.floor(data.total * 0.95)} ฿ (ราคาหลังหักส่วนลด 5%)`,
            weight: 'bold',
            size: 'md',
            wrap: true,
            color: brown
          }
        ]
      }
    }
  };
}

async function sendLineMessage(userId, message) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: userId,
      messages: [message]
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Line API error: ${errBody}`);
  }
}
