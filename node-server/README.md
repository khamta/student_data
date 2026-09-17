# ดีพลอยด้วย Node.js (ทางเลือกที่ 2)

ทางเลือกนี้รันแอปเป็นเซิร์ฟเวอร์ Node.js/Express บน VPS ของคุณเอง แทนที่จะ
ใช้ Google Apps Script — ใช้ **Index.html ตัวเดียวกัน** กับทางเลือก Apps
Script ทุกประการ (ไม่ต้องแก้โค้ดฝั่งหน้าเว็บเลย) แต่ฝั่งเซิร์ฟเวอร์เขียนด้วย
Node.js แล้วคุยกับ Google ชีตผ่าน **Sheets API** ด้วย Service Account แทน

เลือกใช้ทางนี้ถ้าคุณมี VPS ของตัวเองอยู่แล้ว (เช่นที่รัน
`task-report.sdplao.com`) และอยากรันทุกอย่างไว้ในที่เดียวกัน หรือไม่ต้องการ
พึ่งพา Apps Script (มี quota การรันจำกัดต่อวัน) — ถ้าไม่แน่ใจว่าจะเลือกทางไหน
ให้ใช้ทางเลือก Apps Script ที่ README.md หลักแทน เพราะติดตั้งง่ายกว่า

## 1. สร้าง Service Account ใน Google Cloud

1. เปิด [Google Cloud Console](https://console.cloud.google.com/) แล้วสร้าง
   โปรเจกต์ใหม่ (หรือใช้โปรเจกต์เดิมก็ได้)
2. เปิดใช้งาน **Google Sheets API**: ไปที่ **APIs & Services → Library**
   ค้นหา "Google Sheets API" แล้วกด **Enable**
3. ไปที่ **APIs & Services → Credentials → Create Credentials →
   Service Account** ตั้งชื่ออะไรก็ได้ เช่น `student-registry-bot`
4. เข้าไปที่ Service Account ที่สร้างไว้ → แท็บ **Keys** → **Add Key →
   Create new key → JSON** จะได้ไฟล์ `.json` ดาวน์โหลดมา
5. เปลี่ยนชื่อไฟล์นั้นเป็น `service-account.json` แล้ววางไว้ในโฟลเดอร์
   `node-server/` (ไฟล์นี้ถูกใส่ไว้ใน `.gitignore` แล้ว **ห้ามคอมมิตขึ้น
   git เด็ดขาด** เพราะเป็นกุญแจเข้าถึงบัญชี)
6. เปิดไฟล์ JSON นั้นดู หา field `client_email` (หน้าตาประมาณ
   `student-registry-bot@your-project.iam.gserviceaccount.com`)

## 2. แชร์ Google ชีตให้ Service Account

1. เปิด Google ชีตจริงของคุณ (ชีตเดียวกับที่ใช้ในทางเลือก Apps Script)
2. กด **Share** แล้วนำอีเมล `client_email` จากข้อ 1.6 มาแชร์สิทธิ์
   **Editor** ให้ (สำคัญมาก ถ้าลืมขั้นตอนนี้ Node.js server จะอ่าน/เขียน
   ชีตไม่ได้เลย)
3. คัดลอก **Spreadsheet ID** จาก URL ของชีต:
   `https://docs.google.com/spreadsheets/d/`**`ID_ตรงนี้`**`/edit`

## 3. ติดตั้งและตั้งค่า

```bash
cd node-server
npm install
cp .env.example .env
```

เปิด `.env` แล้วกรอก:
- `GOOGLE_SPREADSHEET_ID` — ID ที่คัดลอกมาจากข้อ 2.3
- `GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json` (ค่าเริ่มต้นถูก
  ต้องอยู่แล้วถ้าวางไฟล์ตามข้อ 1.5)
- `IMAGE_SERVER_BASE` — ปล่อยเป็นค่าเริ่มต้นได้เลยถ้าใช้เซิร์ฟเวอร์รูปเดิม

(ทางเลือก) รันคำสั่งนี้ครั้งเดียวก่อน เพื่อตรวจว่าตั้งค่าถูกต้อง และสร้างชีต
`Students`/`Categories`/`Settings`/`ລາຍງານພິມ` พร้อมข้อมูลตั้งต้นทันที:

```bash
npm run setup
```

## 4. รันเซิร์ฟเวอร์

```bash
npm start
```

เปิดเบราว์เซอร์ไปที่ `http://<IP-หรือ-โดเมนของ-VPS>:8080` (พอร์ตตั้งได้จาก
`.env`) จะเจอหน้าตาแอปเหมือนกับทางเลือก Apps Script ทุกอย่าง

### รันแบบถาวรด้วย PM2 (แนะนำสำหรับ VPS)

```bash
npm install -g pm2
pm2 start server.js --name student-registry
pm2 save
pm2 startup   # ทำตามคำสั่งที่ pm2 พิมพ์ออกมา เพื่อให้รันตอนเปิดเครื่องอัตโนมัติ
```

ดู log: `pm2 logs student-registry` / รีสตาร์ทหลังแก้โค้ด: `pm2 restart student-registry`

### เปิดให้เข้าผ่านโดเมน/HTTPS จริง

แนะนำตั้ง reverse proxy (เช่น Nginx หรือ Caddy) ชี้มาที่พอร์ตของแอป
(ค่าเริ่มต้น 8080) แล้วออก certificate HTTPS ให้ (Let's Encrypt ผ่าน Certbot
หรือ Caddy ที่จัดการให้อัตโนมัติ) — ไม่ควรเปิดพอร์ต Node.js ตรงๆ ให้อินเทอร์เน็ต
เข้าถึงในโปรดักชัน

## หมายเหตุสำคัญ

- ทุกฟังก์ชันพอร์ตมาจาก `Code.gs` แบบ 1:1 (โครงสร้างข้อมูล, การไล่เลขลำดับ/
  เลขทะเบียนใหม่อัตโนมัติ, การสร้างชีต `ລາຍງານພິມ` ให้ตรงกับหน้ารายงานที่พิมพ์
  แบบเรียลไทม์) ยกเว้น `onEdit` trigger (ตรวจจับการแก้ไขตรงในชีตเอง) ที่พอร์ต
  มาไม่ได้เพราะเป็นกลไกเฉพาะของ Apps Script — ถ้าต้องการให้ชีตรายงานอัปเดต
  หลังแก้ไขตรงในชีต ต้องกดปุ่ม **"📄 ອັບເດດລົງ Google Sheet"** ในเว็บแอปเอง
- ใช้ **Google ชีตเดียวกัน** กับทางเลือก Apps Script ได้ แต่ **ไม่ควรรันทั้ง
  สองทางพร้อมกันเข้าชีตเดียวกันในเวลาใกล้ๆ กัน** เพื่อลดโอกาสข้อมูลชนกัน —
  เลือกใช้ทางใดทางหนึ่งเป็นหลัก
- ค่า `.env` และ `service-account.json` เป็นความลับ ห้ามคอมมิตขึ้น git หรือ
  แชร์ให้ใครโดยไม่จำเป็น เพราะใครมีไฟล์นี้จะแก้ไขชีตของคุณได้เหมือนเป็นเจ้าของ
