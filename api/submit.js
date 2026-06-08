import { google } from 'googleapis';

const SHEET_ID = '1ZfVCaK9ut-0rNo4kbSn3zJ3JPa4TkI0iW8BzlV80FuM';
const SHEET_NAME = 'Orders';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const data = req.body;
    const total = parseInt(data.flavorPrice) + parseInt(data.saucePrice);

    await appendToSheet(data, total);
    await sendOrderSummary(data, total);

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function appendToSheet(data, total) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  await ensureSheetExists(sheets);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:K`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
        data.userId,
        data.flavor,
        data.sauce,
        data.deliveryDate,
        data.name,
        data.phone,
        data.address,
        data.mapLink,
        data.note || '-',
        total
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
          'Timestamp', 'UserID', 'Flavor', 'Sauce', 'DeliveryDate',
          'Name', 'Phone', 'Address', 'MapLink', 'Note', 'Total'
        ]]
      }
    });
  }
}

async function sendOrderSummary(data, total) {
  const msg1 =
`🧀 สรุปคำสั่งซื้อ 🧀
───────────────────
รายละเอียด :
${data.flavor}
${data.sauce}

📅 วัน-เวลาจัดส่ง :
${data.deliveryDate}

👤 ชื่อลูกค้า : ${data.name}
📞 เบอร์โทร : ${data.phone}
📍 ที่อยู่ : ${data.address}
🗺 แผนที่ : ${data.mapLink}
💬 อื่นๆ : ${data.note || '-'}
───────────────────
💰 รวมยอดที่ต้องชำระ : ${total} ฿`;

  const msg2 =
`💳 ชำระเงินได้ที่
───────────────────
🏦 ธนาคารกสิกรไทย
เลขที่บัญชี : 020-2-88388-5
ชื่อบัญชี : เฌนิศา เจริญวสุธร

**เมื่อชำระเรียบร้อยแล้วกรุณาส่งสลิปการโอนเงินผ่านทางแชทของร้านเพื่อยืนยันรายการสั่งซื้อค่ะ**

(ค่าบริการอาจมีเพิ่มเติมกรณีที่ระยะทางจัดส่งเกิน 3 กิโลเมตร หากไม่เกินส่งฟรีทุกรายการ)`;

  await sendLine(data.userId, msg1);
  await new Promise(r => setTimeout(r, 500));
  await sendLine(data.userId, msg2);
}

async function sendLine(userId, text) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text }]
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Line API error: ${errBody}`);
  }
}
