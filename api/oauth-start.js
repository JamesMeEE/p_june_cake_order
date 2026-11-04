import { google } from 'googleapis';

export default async function handler(req, res) {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!id || !secret) {
    return res.status(500).send('ยังไม่ได้ตั้งค่า GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET');
  }
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers.host;
  const redirectUri = proto + '://' + host + '/api/oauth-callback';

  const client = new google.auth.OAuth2(id, secret, redirectUri);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file']
  });
  res.writeHead(302, { Location: url });
  res.end();
}
