// Ported 1:1 from the Apps Script version's Code.gs (same headers, same seed
// data transcribed from the original PDF) so both deployment paths start
// from identical data when a fresh Google Sheet is used.

const SHEET_STUDENTS = 'Students';
const SHEET_CATEGORIES = 'Categories';
const SHEET_SETTINGS = 'Settings';
const SHEET_PRINT_REPORT = 'ລາຍງານພິມ';

const STUDENT_HEADERS = [
  'ID', 'Order', 'BatchNo', 'CategoryId',
  'GivenName', 'Surname', 'EnglishName',
  'DOB', 'Village', 'District', 'Province',
  'Major',
  'CertNoLao', 'CertNoEnglish', 'DeptRegNo',
  'DiplomaM6', 'DiplomaM7',
  'Gender', 'PhotoUrl', 'DiplomaPhotoUrl',
  'CreatedAt', 'UpdatedAt'
];

const CATEGORY_HEADERS = ['ID', 'Name', 'SortOrder', 'SummaryLabel', 'Major'];
const SETTINGS_HEADERS = ['Key', 'Value'];

const DEFAULT_SETTINGS = [
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

const DEFAULT_CATEGORIES = [
  ['cat-1', 'I. ຊັ້ນສູງ ບໍລິຫານທຸລະກິດ', 1, 'ສາຍບໍລິຫານທຸລະກິດ', 'Bussiness Administration'],
  ['cat-2', 'II. ຊັ້ນສູງ ວິທະຍາສາດຄອມພິວເຕີ ແລະ ຂໍ້ມູນຂ່າວສານ(ໄອທີ)', 2, 'ສາຍໄອທີ', 'Computer Science and Information Technology'],
  ['cat-3', 'III. ຊັ້ນສູງ ພາສາອັງກິດທຸລະກິດ', 3, 'ສາຍພາສາອັງກິດ ທຸລະກິດ', 'Business English'],
  ['cat-4', 'IV. ຊັ້ນສູງ ການເງິນ-ການບັນຊີ', 4, 'ສາຍການເງິນ-ການບັນຊີ', 'Finanec-Accounting']
];

// [Order, BatchNo, CategoryId, GivenName, Surname, EnglishName, DOB, Village,
//  District, Province, Major, CertNoLao, CertNoEnglish, DeptRegNo,
//  DiplomaM6, DiplomaM7, Gender]
const DEFAULT_STUDENTS = [
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

module.exports = {
  SHEET_STUDENTS, SHEET_CATEGORIES, SHEET_SETTINGS, SHEET_PRINT_REPORT,
  STUDENT_HEADERS, CATEGORY_HEADERS, SETTINGS_HEADERS,
  DEFAULT_SETTINGS, DEFAULT_CATEGORIES, DEFAULT_STUDENTS
};
