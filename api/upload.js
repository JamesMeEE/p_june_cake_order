import { google } from 'googleapis';
import { Readable } from 'stream';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

function getOAuthClient() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!id || !secret || !refresh) return null;
  const client = new google.auth.OAuth2(id, secret);
  client.setCredentials({ refresh_token: refresh });
  return client;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
  try {
    const auth = getOAuthClient();
    if (!auth) {
      return res.status(500).json({ status: 'error', message: 'ยังไม่ได้ตั้งค่า OAuth (CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN)' });
    }
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const { name, mime, data } = req.body || {};
    if (!data) return res.status(400).json({ status: 'error', message: 'ไม่พบข้อมูลรูป' });

    const buffer = Buffer.from(data, 'base64');
    const drive = google.drive({ version: 'v3', auth });

    const fileMeta = { name: name || ('menu_' + Date.now() + '.jpg') };
    if (folderId) fileMeta.parents = [folderId];

    const created = await drive.files.create({
      requestBody: fileMeta,
      media: { mimeType: mime || 'image/jpeg', body: Readable.from(buffer) },
      fields: 'id'
    });

    const fileId = created.data.id;

    await drive.permissions.create({
      fileId: fileId,
      requestBody: { role: 'reader', type: 'anyone' }
    });

    return res.status(200).json({
      status: 'ok',
      id: fileId,
      url: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
