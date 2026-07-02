import { google } from 'googleapis';

const SHEET_ID = '1ZfVCaK9ut-0rNo4kbSn3zJ3JPa4TkI0iW8BzlV80FuM';
const CONFIG_SHEET = 'Config';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

const DEFAULT_CONFIG = {
  flavors: { original: true, valrhona: true },
  sauces: { darkchoco: true, matcha: true, strawberry: true, nutella: true, biscoff: true },
  croissants: { croissant: true, mixed_berry: true, pain_au_chocolat: true, croissant_box_set: true },
  closedDates: { pickup: [], delivery: [] },
  sameDayOrder: false
};

async function ensureConfigSheet(sheets) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === CONFIG_SHEET);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: CONFIG_SHEET } } }]
      }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${CONFIG_SHEET}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[JSON.stringify(DEFAULT_CONFIG)]] }
    });
  }
}

export default async function handler(req, res) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await ensureConfigSheet(sheets);

    if (req.method === 'GET') {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${CONFIG_SHEET}!A1`
      });
      const raw = result.data.values?.[0]?.[0];
      const config = raw ? JSON.parse(raw) : DEFAULT_CONFIG;
      return res.status(200).json(config);
    }

    if (req.method === 'POST') {
      const config = req.body;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${CONFIG_SHEET}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [[JSON.stringify(config)]] }
      });
      return res.status(200).json({ status: 'ok' });
    }

    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
