// Ports Code.gs's uploadPhoto() to plain Node.js (fetch/FormData/Blob are
// globals since Node 18, so no extra dependency is needed).

const IMAGE_SERVER_BASE = process.env.IMAGE_SERVER_BASE || 'https://task-report.sdplao.com/api/image';

async function uploadPhoto(base64Data, mimeType, fileName) {
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: mimeType });

  const form = new FormData();
  form.append('image', blob, fileName || ('photo-' + Date.now()));

  const response = await fetch(IMAGE_SERVER_BASE + '/upload', {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error('ອັບໂຫລດຮູບບໍ່ສຳເລັດ (HTTP ' + response.status + '): ' + text);
  }

  const result = await response.json();
  if (!result.url) {
    throw new Error('ອັບໂຫລດຮູບບໍ່ສຳເລັດ: ເຊີບເວີບໍ່ໄດ້ສົ່ງ URL ຄືນມາ');
  }
  return IMAGE_SERVER_BASE + '/uploads/' + result.url;
}

module.exports = { uploadPhoto };
