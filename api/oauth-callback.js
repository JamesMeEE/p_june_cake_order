import { google } from 'googleapis';

export default async function handler(req, res) {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const code = req.query.code;
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers.host;
  const redirectUri = proto + '://' + host + '/api/oauth-callback';

  if (!code) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send('<p>ไม่พบ code จาก Google</p>');
  }
  try {
    const client = new google.auth.OAuth2(id, secret, redirectUri);
    const { tokens } = await client.getToken(code);
    const refresh = tokens.refresh_token || '(ไม่มี refresh_token — ลองใหม่โดยถอนสิทธิ์แอปก่อน)';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(
      '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
      '<body style="font-family:sans-serif;padding:24px;line-height:1.7;">' +
      '<h2>✅ เชื่อมต่อ Google Drive สำเร็จ</h2>' +
      '<p>คัดลอกค่าด้านล่างไปใส่ใน Vercel → Settings → Environment Variables ชื่อ <b>GOOGLE_OAUTH_REFRESH_TOKEN</b></p>' +
      '<textarea readonly style="width:100%;height:120px;font-size:14px;padding:10px;" onclick="this.select()">' +
      String(refresh).replace(/</g, '&lt;') +
      '</textarea>' +
      '<p style="color:#888;">ใส่เสร็จแล้วกด Redeploy ที่ Vercel 1 ครั้ง เป็นอันเสร็จ</p>' +
      '</body></html>'
    );
  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send('<p>เกิดข้อผิดพลาด: ' + String(err.message).replace(/</g, '&lt;') + '</p>');
  }
}
