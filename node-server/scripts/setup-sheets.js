// เรียกครั้งเดียวก่อนใช้งานจริงครั้งแรก เพื่อสร้างชีต Students/Categories/
// Settings/ລາຍງານພິມ พร้อมข้อมูลตั้งต้น (ปกติ server.js ก็เรียกให้อัตโนมัติ
// อยู่แล้วตอนมีคนเปิดเว็บครั้งแรก แต่สคริปต์นี้มีไว้ให้รันแยกเพื่อเช็คว่า
// ตั้งค่า Service Account / SPREADSHEET_ID ถูกต้องก่อน โดยไม่ต้องเปิดเบราว์เซอร์)

require('dotenv').config();
const { ensureSheets } = require('../lib/data');

ensureSheets()
  .then(() => {
    console.log('ຕັ້ງຄ່າຊີດສຳເລັດແລ້ວ! ເປີດ Google ຊີດຂອງທ່ານເພື່ອກວດເບິ່ງໄດ້ເລີຍ.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('ຕັ້ງຄ່າຊີດບໍ່ສຳເລັດ:', err.message || err);
    process.exit(1);
  });
