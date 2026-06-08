# Line Order App (Vercel + LIFF)

## ขั้นตอนการ Setup

### 1. สร้าง Google Service Account

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่ (หรือใช้อันเดิม)
3. เปิด **Google Sheets API**: APIs & Services → Library → ค้นหา "Google Sheets API" → Enable
4. ไปที่ **IAM & Admin → Service Accounts**
5. กด **Create Service Account**
   - Name: `line-order-app`
   - กด Create
6. คลิกที่ Service Account ที่สร้าง → Tab **Keys** → **Add Key** → **Create new key** → **JSON**
7. จะได้ไฟล์ JSON ดาวน์โหลดมา เก็บไว้
8. เปิดไฟล์ JSON ดู:
   - `client_email` → จดไว้
   - `private_key` → จดไว้

### 2. Share Google Sheet กับ Service Account

1. เปิด Google Sheet (`1ZfVCaK9ut-0rNo4kbSn3zJ3JPa4TkI0iW8BzlV80FuM`)
2. กด **Share**
3. วาง `client_email` ของ Service Account
4. ให้สิทธิ์ **Editor**
5. กด Send (ไม่ต้องส่งอีเมล)

### 3. Push โค้ดขึ้น GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/line-order-app.git
git push -u origin main
```

### 4. Deploy บน Vercel

1. ไปที่ [vercel.com](https://vercel.com) → Login ด้วย GitHub
2. กด **Add New → Project**
3. เลือก Repo ที่เพิ่ง push
4. ก่อน Deploy ตั้ง **Environment Variables**:

| Name | Value |
|------|-------|
| `LINE_ACCESS_TOKEN` | Channel Access Token จาก Line |
| `GOOGLE_CLIENT_EMAIL` | `client_email` จาก JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` จาก JSON (ทั้งหมดรวม `\n`) |

5. กด **Deploy**

### 5. Update LIFF Endpoint URL

1. ไปที่ [Line Developers](https://developers.line.biz)
2. เลือก LIFF Channel → Tab LIFF
3. แก้ **Endpoint URL** เป็น URL ของ Vercel (เช่น `https://line-order-app.vercel.app`)

### 6. แก้ Rich Menu

ใน OA Manager → Rich Menu → Action: Link → `https://liff.line.me/2010335350-xAkOcQC8`

---

## File Structure

```
line-order-app/
├── api/
│   └── submit.js
├── public/
│   └── index.html
├── package.json
├── vercel.json
└── .gitignore
```
