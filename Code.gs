/**
 * ລະບົບຈັດການທຳນຽບຜູ້ສຳເລັດການສຶກສາ (Graduate Registry Manager)
 * Google Apps Script web app bound to a Google Sheet.
 *
 * Sheets used (auto-created on first run):
 *   - Students   : one row per student
 *   - Categories : the "I. ..." / "II. ..." group headings (majors)
 *   - Settings   : header text shown on the printed report
 */

var SHEET_STUDENTS = 'Students';
var SHEET_CATEGORIES = 'Categories';
var SHEET_SETTINGS = 'Settings';
var PHOTO_FOLDER_NAME = 'StudentPhotos_DoNotDelete';

var STUDENT_HEADERS = [
  'ID', 'Order', 'BatchNo', 'CategoryId',
  'GivenName', 'Surname', 'EnglishName',
  'DOB', 'Village', 'District', 'Province',
  'Major',
  'CertNoLao', 'CertNoEnglish', 'DeptRegNo',
  'DiplomaM6', 'DiplomaM7',
  'Gender', 'PhotoUrl', 'DiplomaPhotoUrl',
  'CreatedAt', 'UpdatedAt'
];

var CATEGORY_HEADERS = ['ID', 'Name', 'SortOrder', 'SummaryLabel', 'Major'];
var SETTINGS_HEADERS = ['Key', 'Value'];

var DEFAULT_SETTINGS = [
  ['OrgLine1', 'ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ'],
  ['OrgLine2', 'ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ'],
  ['OrgLine3', 'ກະຊວງສຶກສາທິການ ແລະ ກິລາ'],
  ['OrgLine4', 'ກົມອາຊີວະສຶກສາ'],
  ['OrgLine5', 'ພະແນກສຶກສາທິການ ແລະ ກິລາແຂວງ'],
  ['OrgLine6', 'ຄໍາມ່ວນ'],
  ['OrgLine7', 'ວິທະຍາໄລ ຄໍາສີສຸກ ບໍລິຫານທຸລະກິດ ຄໍາມ່ວນ'],
  ['OrgLine8', 'ໂທລະສັບ: 020 55994488'],
  ['ReportTitle', 'ລາຍຊື່ນັກສຶກສາທີ່ຈະຮັບ ໃບປະກາດສະນີຍະບັດ ສົກຮຽນ 2024-2025'],
  ['ReportSubtitle', 'ສາຂາບໍລິຫານທຸລະກິດ,ພາສາອັງກິດທຸລະກິດ ແລະ ໄອທີ'],
  ['GrandTotalLabel', 'ລວມນັກສຶກສາຊັ້ນສູງທັງໝົດ:'],
  ['ApprovalDateLine', 'ຄໍາມ່ວນ,ວັນທີ ......................................'],
  ['ApprovalLeftTitle', 'ຫົວໜ້າພະແນກສຶກສາທິການ ແລະ ກິລາແຂວງ'],
  ['ApprovalRightTitle', 'ຜູ້ອໍານວຍການວິທະຍາໄລ ຄໍາສີສຸກ ບໍລິຫານທຸລະກິດ']
];

// ໝວດໝູ່ / ສາຂາວິຊາ ມີໄດ້ແຄ່ 4 ອັນນີ້ຄົງທີ່ (ບໍ່ມີໜ້າຈັດການແຍກຕ່າງຫາກອີກຕໍ່ໄປ)
var DEFAULT_CATEGORIES = [
  ['cat-1', 'I. ຊັ້ນສູງ ບໍລິຫານທຸລະກິດ', 1, 'ສາຍບໍລິຫານທຸລະກິດ', 'Bussiness Administration'],
  ['cat-2', 'II. ຊັ້ນສູງ ວິທະຍາສາດຄອມພິວເຕີ ແລະ ຂໍ້ມູນຂ່າວສານ(ໄອທີ)', 2, 'ສາຍໄອທີ', 'Computer Science and Information Technology'],
  ['cat-3', 'III. ຊັ້ນສູງ ພາສາອັງກິດທຸລະກິດ', 3, 'ສາຍພາສາອັງກິດ ທຸລະກິດ', 'Business English'],
  ['cat-4', 'IV. ຊັ້ນສູງ ການເງິນ-ການບັນຊີ', 4, 'ສາຍການເງິນ-ການບັນຊີ', 'Finanec-Accounting']
];

// ຂໍ້ມູນນັກສຶກສາຕົວຈິງ, ຖອດຈາກ PDF ຕົ້ນສະບັບ (2024-2025) ເພື່ອໃຫ້ຊີດເລີ່ມຕົ້ນ
// ມີຂໍ້ມູນຄົບຖ້ວນທັນທີ. ລຳດັບຄໍລໍາ:
// [Order, BatchNo, CategoryId, GivenName, Surname, EnglishName, DOB, Village,
//  District, Province, Major, CertNoLao, CertNoEnglish, DeptRegNo,
//  DiplomaM6, DiplomaM7, Gender]
var DEFAULT_STUDENTS = [
  [1, '25', 'cat-1', 'ທ້າວ ສີສະມຸດ', 'ເພັງທະລັງສີ', 'Mr. Sisamoud PHENGTHALANGSY', '24.02.2003', 'ດອນເຄື່ອນຊາງ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Bussiness Administration', '001/ວຄທ/ຄມ.25', '001/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [2, '25', 'cat-1', 'ທ້າວ ເທບອຸໄທ', 'ພະໄຊຈະເລີນ', 'Mr. Thepouthai PHASAICHALERN', '13.01.2001', 'ດອນໂດນ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Bussiness Administration', '002/ວຄທ/ຄມ.25', '002/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [3, '25', 'cat-1', 'ທ້າວ ພິລະພົນ', 'ໄຊສິດທິເດດ', 'Mr. Philaphon XAISIDTHIDATE', '13.02.2002', 'ປາກດົງ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Bussiness Administration', '003/ວຄທ/ຄມ.25', '003/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [4, '25', 'cat-1', 'ນາງ ໂມນາ', 'ພົນສະຫວັດ', 'Miss. Mona PHONSAVATH', '03.12.1999', 'ໂນນແກ້ວ', 'ສີໂຄດຕະບອງ', 'ນະຄອນຫຼວງວຽງຈັນ', 'Bussiness Administration', '004/ວຄທ/ຄມ.25', '004/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [5, '25', 'cat-1', 'ທ້າວ ເມກພະຈັນ', 'ທໍາມະວົງສາ', 'Mr. Mekphachanh THAMMAVONGSA', '01.08.2005', 'ວັດນາກ', 'ສີສັດຕະນະ', 'ນະຄອນຫຼວງວຽງຈັນ', 'Bussiness Administration', '005/ວຄທ/ຄມ.25', '005/KBAC/KM.25', '', '', 'ມ7', 'M'],

  [6, '25', 'cat-2', 'ນາງ ຕຸກຕາ', 'ແກ້ວປັນຍາ', 'Miss. Toukta KEOPUNYA', '08.05.2002', 'ສີວິໄລ', 'ໄຊບົວທອງ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '006/ວຄທ/ຄມ.25', '006/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [7, '25', 'cat-2', 'ນາງ ເພັດອຸໄທ', 'ແກ້ວມະນີ', 'Miss. Phetouthai KEOMANY', '09.04.2003', 'ໂພນສະໜາມ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '007/ວຄທ/ຄມ.25', '007/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [8, '25', 'cat-2', 'ນາງ ສຸພານັນ', 'ພົນອາສາ', 'Miss. Souphanun PHONASA', '04.06.2001', 'ດອນໂດນ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '008/ວຄທ/ຄມ.25', '008/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [9, '25', 'cat-2', 'ນາງ ທິບປາພອນ', 'ຈັນດາເຮືອງ', 'Miss. Thippaphone CHANDAHEUANG', '19.12.2003', 'ວຽງວິໄລ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '009/ວຄທ/ຄມ.25', '009/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [10, '25', 'cat-2', 'ນາງ ນິລາກອນ', 'ສີຫາວົງ', 'Miss. Nilarkone SIHAVONG', '14.12.2003', 'ສຸກສະຫວັນ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '010/ວຄທ/ຄມ.25', '010/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [11, '25', 'cat-2', 'ທ້າວ ວິໄລສັກ', 'ໄຊສົມບັດ', 'Mr. Vilaisack XAISOMBATH', '25.05.2000', 'ຈອມແຈ້ງ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '011/ວຄທ/ຄມ.25', '011/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [12, '25', 'cat-2', 'ພຣະ ຈັນຫອມ', 'ສີບຸນເຮືອງ', 'Monk. Chanhome SEEBOUNHEUANG', '24.05.2005', 'ໄຊສົມບູນ', 'ຫີນບູນ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '012/ວຄທ/ຄມ.25', '012/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [13, '25', 'cat-2', 'ທ້າວ ຊົມມາ', 'ພິວທໍາມະວົງ', 'Mr. Zomma PHIWTHAMMAVONG', '02.09.2003', 'ສອງຫ້ອງ', 'ອາດສະພອນ', 'ສະຫວັນນະເຂດ', 'Computer Science and Information Technology', '013/ວຄທ/ຄມ.25', '013/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [14, '25', 'cat-2', 'ພຣະ ຕຸກ', 'ຫອມສົມບັດ', 'Monk. Touk HOMSOMBUT', '11.02.1999', 'ຖໍ້າ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '014/ວຄທ/ຄມ.25', '014/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [15, '25', 'cat-2', 'ທ້າວ ເມົາ', 'ບຸຝັບ', 'Mr. Mao BUPHUB', '03.05.2002', 'ບຶງຫົວນາ', 'ເຊບັ້ງໄຟ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '015/ວຄທ/ຄມ.25', '015/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [16, '25', 'cat-2', 'ທ້າວ ເກສອນ', 'ພົມມະຈັນ', 'Mr. Kesone PHOMMACHAN', '24.02.2003', 'ນາມັນປາ', 'ໜອງບົກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '016/ວຄທ/ຄມ.25', '016/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [17, '25', 'cat-2', 'ທ້າວ ອານຸພາບ', 'ແອນທອງແດງ', 'Mr. Anouphap AENTHONGDENG', '22.05.2003', 'ໂພນສະອາດ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '017/ວຄທ/ຄມ.25', '017/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [18, '25', 'cat-2', 'ນາງ ພອນທະວີ', 'ໂຄດພູທອນ', 'Miss. Phonethavy KHODPHOUTHONE', '13.04.1994', 'ນາໂດນ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '018/ວຄທ/ຄມ.25', '018/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [19, '25', 'cat-2', 'ນາງ ກັນຍາລັດ', 'ຈັນທະວີໄຊ', 'Miss. Kanyalat CHANTHAVYXAI', '17.02.2004', 'ໂພນຄໍາ', 'ຍົມມະລາດ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '019/ວຄທ/ຄມ.25', '019/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [20, '25', 'cat-2', 'ທ້າວ ກະແຕ', 'ພູດາວົງ', 'Mr. Katae PHOUDAVONG', '03.03.2000', 'ບຶງນາ', 'ຍົມມະລາດ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '020/ວຄທ/ຄມ.25', '020/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [21, '25', 'cat-2', 'ທ້າວ ໂຈນັດ', 'ໜໍ່ວັງ', 'Mr. Jonut NORVANG', '21.03.2003', 'ຈອມແກ້ວ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '021/ວຄທ/ຄມ.25', '021/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [22, '25', 'cat-2', 'ທ້າວ ໄຊສົມພອນ', 'ພຣະຄິ່ນ', 'Mr. Saysomphone PHRAKHINE', '04.01.2002', 'ໜອງບອນ', 'ໄຊເສດຖາ', 'ນະຄອນຫຼວງວຽງຈັນ', 'Computer Science and Information Technology', '022/ວຄທ/ຄມ.25', '022/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [23, '25', 'cat-2', 'ທ້າວ ທຸງໄຊ', 'ສິດທິເດດ', 'Mr. Thoungxay SIDTHIDATE', '18.12.2001', 'ໂພນສະໜາມ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Computer Science and Information Technology', '023/ວຄທ/ຄມ.25', '023/KBAC/KM.25', '', '', 'ມ7', 'M'],

  [24, '25', 'cat-3', 'ພຣະ ຈໍາປາ', 'ແກ້ວບົວລາ', 'Monk. Champa KEOBUALA', '11.03.2000', 'ນາພະນັງ', 'ບົວລະພາ', 'ຄໍາມ່ວນ', 'Business English', '024/ວຄທ/ຄມ.25', '024/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [25, '25', 'cat-3', 'ນາງ ລວຍຄໍາ', 'ໄຊສິງເຂັ້ມ', 'Miss. Luaykham XAYSINGKHEM', '18.04.2000', 'ນາພະນັງ', 'ບົວລະພາ', 'ຄໍາມ່ວນ', 'Business English', '025/ວຄທ/ຄມ.25', '025/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [26, '25', 'cat-3', 'ນາງ ລີວັນ', 'ຈັນທະປັນຍາ', 'Miss. Lyvanh CHANTAPHANYA', '29.12.2002', 'ໂພນສະອາດ', 'ມະຫາໄຊ', 'ຄໍາມ່ວນ', 'Business English', '026/ວຄທ/ຄມ.25', '026/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [27, '25', 'cat-3', 'ນາງ ນຸນຕາ', 'ຈັນມະນີ', 'Miss. Nounta CHANMANY', '03.02.2006', 'ນາຂ່າງຄໍາ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Business English', '027/ວຄທ/ຄມ.25', '027/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [28, '25', 'cat-3', 'ທ້າວ ວີວັນ', 'ຄໍາສວນຊູ', 'Mr. Vyvanh KHOMESOUANEZOO', '12.12.2000', 'ລະຍາວເໜືອ', 'ສາມັກຄີໄຊ', 'ອັດຕະປື', 'Business English', '028/ວຄທ/ຄມ.25', '028/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [29, '25', 'cat-3', 'ທ້າວ ຊິນນະວຸດ', 'ສິນທະວົງ', 'Mr. Zinnavout SINTHAVONG', '14.10.2002', 'ສົມສະໜຸກ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Business English', '029/ວຄທ/ຄມ.25', '029/KBAC/KM.25', '', '', 'ມ7', 'M'],

  [30, '25', 'cat-4', 'ນາງ ເກດສະໝອນ', 'ລວນມະໄລສີ', 'Miss. Kedsamone LOUANEMALAISY', '11.05.2002', 'ນາກາງ', 'ຄູນຄໍາ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '030/ວຄທ/ຄມ.25', '030/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [31, '25', 'cat-4', 'ນາງ ພອນປະເສີດ', 'ພູມີຈັນ', 'Miss. Phonepasurth PHOUMECHAN', '18.02.2002', 'ຫົວນາ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '031/ວຄທ/ຄມ.25', '031/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [32, '25', 'cat-4', 'ນາງ ກັ້ງນະພາ', 'ໃບຫຼວງລາດ', 'Miss. Kangnapha BAILOUNGLATH', '03.03.2003', 'ດົງກະແສນ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '032/ວຄທ/ຄມ.25', '032/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [33, '25', 'cat-4', 'ນາງ ມອດຊີ', 'ກອງມະນີ', 'Miss. Mothzee KONGMANEE', '07.08.2001', 'ໂພນສະໜາມ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '033/ວຄທ/ຄມ.25', '033/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [34, '25', 'cat-4', 'ນາງ ສຸດດາລາ', 'ພົມມະແສນ', 'Miss. Souddala PHOMMASAEN', '08.05.2002', 'ໜອງບົວຄໍາ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '034/ວຄທ/ຄມ.25', '034/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [35, '25', 'cat-4', 'ນາງ ນໍ້າຝົນ', 'ເດດສັກດາ', 'Miss. Namfon DATSUCKDA', '24.07.2003', 'ຄໍາແກ້ວ', 'ຫີນບູນ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '035/ວຄທ/ຄມ.25', '035/KBAC/KM.25', '', '', 'ມ7', 'F'],
  [36, '25', 'cat-4', 'ທ້າວ ໄມສີ', 'ສີຫາລາດ', 'Mr. Maisee SEEHALARD', '01.07.2004', 'ນໍ້າເດື່ອ', 'ປາກກະດິງ', 'ບໍລິຄໍາໄຊ', 'Finanec-Accounting', '036/ວຄທ/ຄມ.25', '036/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [37, '25', 'cat-4', 'ທ້າວ ບຸນໂຮມ', 'ອິນທິລາດ', 'Mr. Bounhome INTHILATH', '11.05.1991', 'ຫາດຊຽງດີ', 'ໜອງບົກ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '037/ວຄທ/ຄມ.25', '037/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [38, '25', 'cat-4', 'ທ້າວ ໄຊຈະເລີນ', 'ອິນແກ້ວມະນີວົງ', 'Mr. Saychaleun INKEOMANIVONG', '23.10.1995', 'ໜອງບົວເງິນ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '038/ວຄທ/ຄມ.25', '038/KBAC/KM.25', '', '', 'ມ7', 'M'],
  [39, '25', 'cat-4', 'ທ້າວ ທະວີຊັບ', 'ສຸແສງໄທ', 'Mr. Thaveexub SOUSENGTHAY', '15.03.2003', 'ດອນເຄື່ອນຊາງ', 'ທ່າແຂກ', 'ຄໍາມ່ວນ', 'Finanec-Accounting', '039/ວຄທ/ຄມ.25', '039/KBAC/KM.25', '', '', 'ມ7', 'M']
];

/* ---------------- Web app entry point ---------------- */

function doGet(e) {
  ensureSheets_();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ລະບົບຈັດການທຳນຽບນັກສຶກສາ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Optional: adds a menu inside the spreadsheet itself so the owner
 * can jump straight to the deployed web app without hunting for the URL.
 */
function onOpen() {
  ensureSheets_();
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('ລະບົບຈັດການນັກສຶກສາ')
    .addItem('ເປີດຄູ່ມືການນຳໃຊ້', 'showHelp_')
    .addToUi();
}

function showHelp_() {
  var html = HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">ໃຫ້ໄປທີ່ <b>Deploy &gt; Manage deployments</b> ' +
    'ໃນ Apps Script Editor ເພື່ອເອົາລິ້ງເວັບແອັບ (Web app URL) ຂອງທ່ານ.</p>'
  ).setWidth(400).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, 'ວິທີເປີດໃຊ້ງານ');
}

/* ---------------- Sheet bootstrap ---------------- */

function ensureSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var categoriesSheet = ss.getSheetByName(SHEET_CATEGORIES);
  if (!categoriesSheet) {
    categoriesSheet = ss.insertSheet(SHEET_CATEGORIES);
    categoriesSheet.appendRow(CATEGORY_HEADERS);
    categoriesSheet.setFrozenRows(1);
    DEFAULT_CATEGORIES.forEach(function (row) { categoriesSheet.appendRow(row); });
  }

  var studentsSheet = ss.getSheetByName(SHEET_STUDENTS);
  if (!studentsSheet) {
    studentsSheet = ss.insertSheet(SHEET_STUDENTS);
    studentsSheet.appendRow(STUDENT_HEADERS);
    studentsSheet.setFrozenRows(1);
    var now = new Date();
    DEFAULT_STUDENTS.forEach(function (row) {
      var order = row[0];
      var student = {
        Order: row[0], BatchNo: row[1], CategoryId: row[2],
        GivenName: row[3], Surname: row[4], EnglishName: row[5],
        DOB: row[6], Village: row[7], District: row[8], Province: row[9],
        Major: row[10], CertNoLao: row[11], CertNoEnglish: row[12], DeptRegNo: row[13],
        DiplomaM6: row[14], DiplomaM7: row[15], Gender: row[16]
      };
      student.ID = 'stu-' + Utilities.getUuid();
      student.CreatedAt = now;
      student.UpdatedAt = now;
      var newRow = STUDENT_HEADERS.map(function (h) { return student[h] !== undefined ? student[h] : ''; });
      studentsSheet.appendRow(newRow);
    });
  }

  var settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
    settingsSheet.appendRow(SETTINGS_HEADERS);
    settingsSheet.setFrozenRows(1);
    DEFAULT_SETTINGS.forEach(function (row) {
      settingsSheet.appendRow(row);
    });
  }

  // Remove the default empty "Sheet1" if it is still blank and unused.
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 3 && sheet1.getLastRow() === 0) {
    ss.deleteSheet(sheet1);
  }

  return { studentsSheet: studentsSheet, categoriesSheet: categoriesSheet, settingsSheet: settingsSheet };
}

/* ---------------- Generic sheet <-> object helpers ---------------- */

function sheetToObjects_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (row.join('') === '') continue; // skip fully blank rows
    var obj = { _row: i + 2 };
    headers.forEach(function (h, idx) {
      var v = row[idx];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      obj[h] = v;
    });
    out.push(obj);
  }
  return out;
}

function findRowById_(sheet, headers, id) {
  var idCol = headers.indexOf('ID') + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

/* ---------------- Public API used by the client (google.script.run) ---------------- */

function getAllData() {
  var s = ensureSheets_();
  return {
    students: sheetToObjects_(s.studentsSheet, STUDENT_HEADERS),
    categories: sheetToObjects_(s.categoriesSheet, CATEGORY_HEADERS)
      .sort(function (a, b) { return (a.SortOrder || 0) - (b.SortOrder || 0); }),
    settings: settingsToMap_(s.settingsSheet)
  };
}

function settingsToMap_(settingsSheet) {
  var rows = sheetToObjects_(settingsSheet, SETTINGS_HEADERS);
  var map = {};
  rows.forEach(function (r) { map[r.Key] = r.Value; });
  return map;
}

function saveSettings(settingsObj) {
  var s = ensureSheets_();
  var sheet = s.settingsSheet;
  var existing = sheetToObjects_(sheet, SETTINGS_HEADERS);
  var keyToRow = {};
  existing.forEach(function (r) { keyToRow[r.Key] = r._row; });

  Object.keys(settingsObj).forEach(function (key) {
    if (keyToRow[key]) {
      sheet.getRange(keyToRow[key], 2).setValue(settingsObj[key]);
    } else {
      sheet.appendRow([key, settingsObj[key]]);
    }
  });
  return settingsToMap_(sheet);
}

/* ---- Students ---- */

function upsertStudent(student) {
  var s = ensureSheets_();
  var sheet = s.studentsSheet;
  var now = new Date();

  if (student.ID) {
    var row = findRowById_(sheet, STUDENT_HEADERS, student.ID);
    if (row === -1) throw new Error('ไม่พบข้อมูลนักศึกษาที่ต้องการแก้ไข');
    student.UpdatedAt = now;
    var values = STUDENT_HEADERS.map(function (h) {
      return h === 'CreatedAt' ? undefined : (student[h] !== undefined ? student[h] : '');
    });
    // Preserve CreatedAt
    var createdAtCol = STUDENT_HEADERS.indexOf('CreatedAt') + 1;
    var currentCreatedAt = sheet.getRange(row, createdAtCol).getValue();
    values[createdAtCol - 1] = currentCreatedAt;
    sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).setValues([values]);
  } else {
    student.ID = 'stu-' + Utilities.getUuid();
    student.CreatedAt = now;
    student.UpdatedAt = now;
    if (!student.Order) student.Order = getNextOrder_(sheet);
    if (!student.BatchNo) student.BatchNo = currentYearSuffix_();
    var newRow = STUDENT_HEADERS.map(function (h) {
      return student[h] !== undefined ? student[h] : '';
    });
    sheet.appendRow(newRow);
  }
  renumberStudents_();
  return getAllData();
}

function currentYearSuffix_() {
  var yy = new Date().getFullYear() % 100;
  return (yy < 10 ? '0' : '') + yy;
}

function getNextOrder_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  var orderCol = STUDENT_HEADERS.indexOf('Order') + 1;
  var values = sheet.getRange(2, orderCol, lastRow - 1, 1).getValues();
  var max = 0;
  values.forEach(function (v) {
    var n = Number(v[0]);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function deleteStudent(id) {
  var s = ensureSheets_();
  var row = findRowById_(s.studentsSheet, STUDENT_HEADERS, id);
  if (row === -1) throw new Error('ไม่พบข้อมูลนักศึกษา');
  s.studentsSheet.deleteRow(row);
  renumberStudents_();
  return getAllData();
}

function pad3_(n) {
  n = Number(n) || 0;
  var str = String(n);
  while (str.length < 3) str = '0' + str;
  return str;
}

function computeCertNoLao_(order, batchNo) {
  return pad3_(order) + '/ວຄທ/ຄມ.' + (batchNo || '');
}

function computeCertNoEnglish_(order, batchNo) {
  return pad3_(order) + '/KBAC/KM.' + (batchNo || '');
}

/**
 * ຮຽງເລກລຳດັບ (ລ/ດ) ໃໝ່ໃຫ້ຕໍ່ເນື່ອງ 1..N ສະເໝີ ຫຼັງຈາກເພີ່ມ/ລຶບ/ແກ້ໄຂ
 * ໝວດໝູ່ - ຈັດຮຽງຕາມໝວດໝູ່ (I, II, III, IV) ກ່ອນ ແລ້ວຄ່ອຍຕາມລຳດັບເດີມ
 * ພາຍໃນໝວດດຽວກັນ ເພື່ອຄົງໝ້າຕາຂອງຕົ້ນສະບັບໄວ້. ທະບຽນທາງວິທະຍາໄລ (ພາສາລາວ/
 * ພາສາອັງກິດ) ຈະຖືກຄິດໄລ່ໃໝ່ໃຫ້ຕົງກັບເລກລຳດັບຫຼ້າສຸດຂອງແຕ່ລະຄົນນຳກັນ.
 */
function renumberStudents_() {
  var s = ensureSheets_();
  var sheet = s.studentsSheet;
  var students = sheetToObjects_(sheet, STUDENT_HEADERS);
  if (students.length === 0) return;

  var categorySortOrder = {};
  sheetToObjects_(s.categoriesSheet, CATEGORY_HEADERS).forEach(function (c) {
    categorySortOrder[c.ID] = c.SortOrder || 0;
  });

  students.sort(function (a, b) {
    var ca = categorySortOrder[a.CategoryId] !== undefined ? categorySortOrder[a.CategoryId] : 999;
    var cb = categorySortOrder[b.CategoryId] !== undefined ? categorySortOrder[b.CategoryId] : 999;
    if (ca !== cb) return ca - cb;
    var oa = Number(a.Order) || 0;
    var ob = Number(b.Order) || 0;
    if (oa !== ob) return oa - ob;
    return a._row - b._row;
  });

  var orderCol = STUDENT_HEADERS.indexOf('Order') + 1;
  var certLaoCol = STUDENT_HEADERS.indexOf('CertNoLao') + 1;
  var certEngCol = STUDENT_HEADERS.indexOf('CertNoEnglish') + 1;

  students.forEach(function (st, idx) {
    var newOrder = idx + 1;
    if (Number(st.Order) !== newOrder) {
      sheet.getRange(st._row, orderCol).setValue(newOrder);
    }
    var expectedCertLao = computeCertNoLao_(newOrder, st.BatchNo);
    var expectedCertEng = computeCertNoEnglish_(newOrder, st.BatchNo);
    if (st.CertNoLao !== expectedCertLao) {
      sheet.getRange(st._row, certLaoCol).setValue(expectedCertLao);
    }
    if (st.CertNoEnglish !== expectedCertEng) {
      sheet.getRange(st._row, certEngCol).setValue(expectedCertEng);
    }
  });
}

/* ---- Photo upload to Google Drive ---- */

function uploadPhoto(base64Data, mimeType, fileName) {
  var folder = getOrCreatePhotoFolder_();
  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, mimeType, fileName || ('photo-' + Date.now()));
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function getOrCreatePhotoFolder_() {
  var iter = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  if (iter.hasNext()) return iter.next();
  return DriveApp.createFolder(PHOTO_FOLDER_NAME);
}

/* ---- Report data (grouped + summary counts) ---- */

function getReportData() {
  var data = getAllData();
  var byCategory = {};
  data.categories.forEach(function (c) { byCategory[c.ID] = { category: c, students: [] }; });

  data.students
    .sort(function (a, b) { return (Number(a.Order) || 0) - (Number(b.Order) || 0); })
    .forEach(function (st) {
      if (!byCategory[st.CategoryId]) {
        byCategory[st.CategoryId] = { category: { ID: st.CategoryId, Name: '(ບໍ່ລະບຸ)', SortOrder: 999, SummaryLabel: '(ບໍ່ລະບຸ)' }, students: [] };
      }
      byCategory[st.CategoryId].students.push(st);
    });

  var groups = Object.keys(byCategory)
    .map(function (k) { return byCategory[k]; })
    .sort(function (a, b) { return (a.category.SortOrder || 0) - (b.category.SortOrder || 0); });

  var summary = groups.map(function (g) {
    var female = g.students.filter(function (s) { return s.Gender === 'F'; }).length;
    return { label: g.category.SummaryLabel || g.category.Name, total: g.students.length, female: female };
  });

  var grandTotal = {
    total: summary.reduce(function (a, s) { return a + s.total; }, 0),
    female: summary.reduce(function (a, s) { return a + s.female; }, 0)
  };

  return { groups: groups, summary: summary, grandTotal: grandTotal, settings: data.settings };
}
