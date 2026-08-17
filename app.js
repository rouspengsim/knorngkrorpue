const STORAGE_KEY = "little-sprouts-kms-v2-empty-students";
const SYNC_CONFIG = {
  endpoint: window.KMS_SYNC_CONFIG?.endpoint || "/api/state",
  pollMs: Number(window.KMS_SYNC_CONFIG?.pollMs) || 15000,
  enabled: window.KMS_SYNC_CONFIG?.enabled !== false
};

const icons = {
  dashboard: "layout-dashboard",
  students: "graduation-cap",
  teachers: "users",
  classes: "school",
  promotion: "move-up-right",
  certificates: "award",
  reports: "bar-chart-3",
  users: "shield-check",
  academic: "calendar-days",
  settings: "settings"
};

const navItems = [
  ["dashboard", "ផ្ទាំងគ្រប់គ្រង", ["Administrator", "Staff", "Teacher"]],
  ["students", "សិស្ស", ["Administrator", "Staff", "Teacher"]],
  ["teachers", "គ្រូបង្រៀន", ["Administrator", "Staff"]],
  ["classes", "ថ្នាក់រៀន", ["Administrator", "Staff", "Teacher"]],
  ["promotion", "ឡើងថ្នាក់", ["Administrator"]],
  ["certificates", "វិញ្ញាបនបត្រ", ["Administrator", "Staff"]],
  ["reports", "របាយការណ៍", ["Administrator", "Staff"]],
  ["users", "អ្នកប្រើ", ["Administrator"]],
  ["academic", "ឆ្នាំសិក្សា", ["Administrator", "Staff"]],
  ["settings", "ការកំណត់", ["Administrator"]]
];

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
const gradeOrder = ["ទាប", "មធ្យម", "ខ្ពស់"];
const legacyClassNames = {
  Nursery: "ទាប",
  "Kindergarten 1": "មធ្យម",
  "Kindergarten 2": "ខ្ពស់",
  "Kindergarten 3": "ខ្ពស់",
  "មត្តេយ្យតូច": "ទាប",
  "មត្តេយ្យ ១": "មធ្យម",
  "មត្តេយ្យ ២": "ខ្ពស់",
  "មត្តេយ្យ ៣": "ខ្ពស់"
};
const km = {
  roles: { Administrator: "អ្នកគ្រប់គ្រង", Staff: "បុគ្គលិក", Teacher: "គ្រូបង្រៀន" },
  statuses: { Active: "សកម្ម", Inactive: "អសកម្ម", Graduated: "បានបញ្ចប់", Paid: "បានបង់", Partial: "បង់ខ្លះ", Pending: "រង់ចាំ", Present: "មានវត្តមាន", Absent: "អវត្តមាន", Excused: "មានច្បាប់" },
  gender: { Female: "ស្រី", Male: "ប្រុស" },
  relations: { Father: "ឪពុក", Mother: "ម្តាយ", Guardian: "អាណាព្យាបាល" },
  classes: { ទាប: "ទាប", មធ្យម: "មធ្យម", ខ្ពស់: "ខ្ពស់", "ខ្ពស់(ក)": "ខ្ពស់(ក)", "ខ្ពស់(ខ)": "ខ្ពស់(ខ)", ...legacyClassNames },
  eventTypes: { Event: "ព្រឹត្តិការណ៍", Holiday: "ថ្ងៃឈប់សម្រាក", Announcement: "សេចក្តីជូនដំណឹង" }
};

const SCHOOL_NAME = "សាលាមត្តេសិក្សាខ្នងក្រពើ";

const highClassAcademicYear = {
  id: "AY-2025",
  name: "2025-2026",
  startsAt: "2025-01-08",
  endsAt: "2026-12-18",
  status: "Active"
};

let state = loadState();
let currentUser = null;
let activeView = "dashboard";
let chartRefs = {};
let tableState = {};
let syncTimer = null;
let syncHydrated = false;
let syncLastSavedJson = "";
let syncLastError = "";

function importedStudentRows(academicYear) {
  const yearCode = academicYear.id.replace(/\D/g, "") || "2025";
  const rows = [
    ["0156", "ខេន", "រតនៈ", "ប", "2020-10-24", "រោងចក្រស្ករ ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "វ៉េ ខេន", "884555383", "ជៀម សុផារ័ត្ន", "884555383", "រោងចក្រស្ករ  ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0168", "ឃឿន", "សុវណ្ណារាជ", "ប", "2020-05-14", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ឃឿន សុវណ្ណវិចិត្រ", "715886070", "ថាច មួយទៀង", "715886070", "ខ្នង.លិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0218", "ឆុន", "កណិការ", "ស", "2020-10-19", "ពើក មេមង មេមត់ ខេត្តត្បូងឃ្មុំ", "ព្រាប វុទ្ធិ", "888850150", "ឡេង ណៃជី", "", "ពើក មេមង មេមត់ ត្បូងឃ្មុំ"],
    ["0083", "ជីន", "សៀវហ័ង", "ស", "2020-09-11", "ខ្លុងត្បូង ចាន់មូល មេមត់ ខេត្តត្បូងឃ្មុំ", "យិន សុភា", "716665676", "ទាប ស្រីនីន", "716665676", "ខ្លុងត្បូង ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0055", "ឈុន", "លីហ៊ាង", "ប", "2020-06-01", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ឈុន តួ", "", "ថេង វ់ាន់ដា", "979571125", "ម៉ាស៊ីនទឹក  មេមត់ មេមត់ ត្បូងឃ្មុំ"],
    ["0215", "ឌី", "សុលាប", "ប", "2020-12-16", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ថាវ ឌី", "885178215", "រៀម រដ្ឋា", "885178215", "ខ្នង.លិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0284", "ណាវី", "ពេជ្ររក្សា", "ស", "2020-06-20", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "សុខ ស៊ីម៉េង", "", "និត សុខជា", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0216", "ថន", "វាន់ធី", "ប", "2020-11-23", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ទុំ ចាន់ថន", "885077450", "វ៉ន ណាវីន", "885077450", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0145", "ទ្រា", "វណ្ណនីតា", "ស", "2020-08-12", "ជាំទ្រៀក ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ស៊ិន ភា", "977165769", "ទ្រី ដាលីស", "977165769", "ជាំទ្រៀក ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0174", "នី", "ស្រីនាថ", "ស", "2020-12-18", "បឹងទីង ទងត្រឡាច ស្រីសន្ធ ខេត្តកំពង់ចាម", "សុវណ្ណ នី", "886595507", "ប៊ុន សុធារី", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0277", "បញ្ញា", "សុភ័ក្រ្តា", "ប", "2020-04-16", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ", "នី បញ្ញា", "", "ម៉ន ស្រពៅ", "", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0276", "ពិសិដ្ឌ", "វិសាល", "ប", "2020-10-25", "ជីហែ ពាមប្រឆ្នោះ កោះសុទិន កំពង់ចាម", "អ៊ុក ពិសិដ្ឋ", "", "ភ័ណ្ឌ ស្រីម៉ី", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0243", "ពៅ", "ចាន់ធីតា", "ស", "2020-08-02", "ព្រៃព្រីងខាងជើង១ ចោមចៅទី៣ ពោធិ៍សែនជ័យ រ.ធ.នភ្នំពេញ", "ពៅ ចិត្រា", "966928494", "ចាន់ ធាវី", "966928494", "ជាំទ្រៀក ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0351", "ម៉ាន", "បញ្ញាពិសិដ្ឋ", "ប", "", "", "", "963271716", "", "975891191", "មេមត់ ត្បូងឃ្មុំ"],
    ["0173", "មុជសិរី", "ឧត្តម", "ប", "2020-06-22", "ម៉ាស៊ីនទឹក មេមត់ មេមត់់ ខេត្តត្បូងឃ្មុំ", "ភោគ សេរី", "", "ស៊ឹម សុវណ្ណមាលា", "", "ខ្នងក្រពើលិច  ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0098", "យឿង", "មករា", "ប", "2020-01-09", "ខែលជ័យ អូរស្វាយ កំពង់សៀម ខេត្តកំពង់ចាម", "មាន យឿង", "", "ព្រំ សុខហេង", "", "ខ្នង.លិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0057", "រ៉ាត", "សុវណ្ណយុត្ត", "ប", "2020-05-11", "ដូងទី១ ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ហេង ពិសិដ្ឋ", "977293201", "ថន ដាឡែន", "977293201", "ដូងទី១ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0177", "រឹម", "សុខុមទិវា", "ប", "2020-11-13", "ជាំទ្រៀក ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "លី ឆៃលាន", "98277577", "ឪ ឆៃណាន", "98277577", "ខ្នង.លិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0293", "លន់", "សារ៉ាឌី", "ស", "2020-03-04", "បាវិត បាវិត បាវិត ស្វាយរៀង", "ឈិន រដ្ថា", "313651616", "សិត ស្រីនា", "10933525", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0248", "វណ្ណា", "វុត្ថាន់", "ប", "2020-11-11", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ញឹម វុត្ថា", "718784426", "គង់ ស្រីណែត", "718784426", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0330", "វ៉ាត", "ពុទ្ធិរិទ្ធ", "ប", "2020-09-30", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ", "វ៉ាត សំណាង", "883737167", "ហេង ស្រីមុំ", "883737167", "បូរីតេជោរ ដារ មេមត់ ត្បូងឃ្មុំ"],
    ["0298", "វុទ្ធី", "វ៉ាទី", "ប", "2020-12-28", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ខា វុទ្ធី", "", "ជួន ស្រីធាន", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0130", "ស៊ិន", "សុទិវា", "ស", "2020-01-25", "12 ទន្លេបាសាក់ ចំការមន រាជធានីភ្នំពេញ", "ជឹម សំអយ", "", "ចិន សុជាតា", "", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0214", "ស៊ឹង", "ស្រីនាថ", "ស", "2020-01-02", "រោងចក្រស្ករ ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ស៊ឹង ខ្លូ", "", "ឈុំ ចាន់ធី", "", "រោងចក្រស្ករ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0182", "ស៊្រុន", "បូរីដារ៉ុង", "ប", "2020-04-30", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "នុត បូរី", "967799690", "ហ៊ីង ជុំនិត", "967799690", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0111", "សុខណាក់", "រដ្ឋា", "ប", "2020-07-11", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "យាន សុខណាក់", "883153234", "ណៃ ស៊ីណា", "883153234", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0205", "ឡី", "វឌ្ឍនា", "ប", "2020-03-28", "ជាំទ្រៀក មេមត់ មេមត់ ខេត្តត្បូងឃ្មុំ", "អែល ឡី", "717553447", "គីម កី", "717553447", "ជាំត្រាវ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0247", "អន", "ភូមិន្ទវីរៈយុទ្ធ", "ប", "2020-12-17", "រោងចក្រស្ករ មេមត់ មេមត់ ខេត្តត្បូងឃ្មុំ", "វ័ន វត្ថា", "712946046", "សាន់ ធារី", "712946046", "រោងចក្រស្ករ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0119", "អ៊ាន", "ស្រីនុត", "ស", "2020-01-25", "ត្រពាំងគូរ ស្រឡប់ ត្បូងឃ្មុំ ខេត្តត្បូងឃ្មុំ", "អ៊ាន ក្រូច", "", "អេន ងន់", "972220200", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"]
  ];

  return rows.map((row, index) => {
    const khmerName = `${row[1].trim()} ${row[2].trim()}`;
    return {
      id: `STD-${yearCode}-${row[0]}`,
      registrationNo: row[0],
      khmerName,
      englishName: khmerName,
      gender: row[3] === "ស" ? "Female" : "Male",
      dob: row[4],
      birthPlace: row[5],
      birthProvince: row[5],
      parentName: row[6] || row[8] || "",
      guardianRelation: row[6] ? "Father" : row[8] ? "Mother" : "Guardian",
      fatherName: row[6],
      fatherPhone: row[7],
      motherName: row[8],
      motherPhone: row[9],
      phone: row[7] || row[9] || "",
      address: row[10],
      currentProvince: row[10],
      enrollmentDate: academicYear.startsAt,
      academicYearName: academicYear.name,
      classId: "CLS-003",
      classLevel: "ខ្ពស់(ក)",
      section: "ក",
      teacherId: "TCH-003",
      status: "Active",
      note: "បញ្ជីរាយនាមសិស្សដើមឆ្នាំ មត្តេយ្យខ្ពស់(ក)",
      photo: avatar(khmerName, index + 8)
    };
	  });
	}

function importedHighBStudentRows(academicYear) {
  const yearCode = academicYear.id.replace(/\D/g, "") || "2025";
  const rows = [
    ["0286", "ចណ្ណា", "ម៉េងលិ", "ប", "2020-03-16", "ដូងទី១ ត្រមូង មេមត់ ត្បូងឃ្មុំ", "សួង ចណ្ណា", "977801587", "សំ ស្រីពេជ", "885664838", "ដូងទី១ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0305", "ចិត្ត", "វិជ្ជា", "ប", "2020-05-29", "អូរខ្លូត ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ញើម ចិត្ត", "8886454110", "ឡាង យ៉ា", "888952725", "អូរខ្លូត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["234", "តុន", "ដាវីន", "ប", "2020-04-22", "លាជលើ ឃុំជាំ មេមត់ ខេត្តត្បូងឃ្មុំ", "អ៊ឹម ជីវន្ត័", "", "ប៉ុម ចិន្តា", "", "មេមត់ ត្បូងឃ្មុំ"],
    ["0350", "ថាន", "ចន្ធី", "ស", "2020-09-13", "ដូងទី១ ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ថា ថាន", "", "សុក ខ្លុក", "", "ដូងទី១ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0306", "ទ្រី", "ដេលីត", "ប", "2020-12-10", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ណំ សុផន", "", "ឃួន សរស្រីជាតិ", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0310", "នី", "ដាវីត", "ប", "2020-10-27", "ត្រមូង ត្រមូង មេមត់ ត្បូងឃ្មុំ", "អាត វណ្ណឌី", "888650528", "ខេង រតនា", "716908628", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["175", "ផា", "ស្រីខួច", "ស", "2020-11-25", "ជាំទ្រៀក ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ឈាង តុលា", "", "សែម សាវិន", "", "ជាំទ្រៀក ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0098", "យឿង", "មករា", "ប", "2020-01-09", "ជីហែ ពាមប្រឆ្នោះ កោះសុទិន កំពង់ចាម", "មាន យឿង", "", "ព្រំ សុខហេង", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["195", "ភឿន", "សុភក្រ័", "ប", "2020-02-28", "ទួលរកា ពាមកោះស្នា ស្រឹងត្រង់ ខេត្តកំពង់ចាម", "ភឿន វ៉ិត", "69631255", "កុល ម៉ាច", "69631255", "ខ្នង.កើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["207", "រតនា", "ចន្ទដាណាវីត", "ប", "2020-08-24", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "សំអឿន រតនា", "972284212", "ឈឹម លីដា", "972284212", "ខ្នង.លិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0289", "រតនា", "វណ្ណនីតា", "ស", "2020-04-04", "ល្អក់ កណ្ដែក ប្រាសាទបាគង សៀមរាប", "កង សុវណ្ណរតនា", "976130992", "សុខ ស៊ីណា", "976131992", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0174", "នី", "ស្រីនាថ", "ស", "2020-12-18", "ខែលជ័យ អូរស្វាយ កំពង់សៀម ខេត្តកំពង់ចាម", "សុវណ្ណ នី", "886595507", "ប៊ុន សុធារី", "", "ខ្នង.លិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["200", "លី", "ម៉ូរ៉ា", "ស", "2020-05-10", "រោងចក្រស្ករ ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "កែវ រ៉ារី", "", "លី ផលឡែន", "", "រោងចក្រស្ករ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["197", "លី", "យ៉ុងគ័ង", "ប", "2020-10-24", "អណ្តូងថ្មក្រោម ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "លី សម្បត្តិ", "", "ទក សែន", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["349", "នី", "ចំរ៉ុង", "ប", "", "", "", "", "", "", ""],
    ["231", "វឿន", "ហេងលាប", "ប", "2020-09-03", "រោងចក្រស្ករ ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "វេ វឿន", "976168000", "គិន សុភ័ក្រ្ត", "976168000", "រោងចក្រស្ករ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["71", "ស៊ីម", "សុគន្ធា", "ស", "2020-03-03", "ត្បូងវត្ត មេមត់ មេមត់ ខេត្តត្បូងឃ្មុំ", "ស៊ីម សុវណ្ណារិទ្ធ", "976633332", "លឹង សុធម្មា", "976633332", "រោងចក្រស្ករ ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0282", "សុវ័ណ្ណ", "ដាវីន", "ប", "2020-03-19", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "សាវឿន សុវ័ណ្ណ", "977250526", "នេត សុខណា", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["155", "ស្រ៊ន់", "យុទ្ធសុគុណ", "ប", "2020-02-16", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ឈាន ម៉េងស្រ៊ន់", "", "ញាន ឌី", "", "ខ្នង.លិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0130", "ស៊ិន", "សុទិវា", "ស", "2020-01-25", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ជឹម សំអយ", "", "ចិន សុជាតា", "", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0274", "ហ៊ួ", "វីរៈគីមហាន", "ប", "2020-12-27", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ", "គីម វីរៈ", "977718996", "ហ៊ឹម លីនណា", "", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0313", "ហួរ", "សុភារុណ", "ប", "2020-09-17", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ", "អួន សុភា", "975572344", "ហ៊ាង ចន្ធី", "975572344", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["189", "ហេង", "ឆៃយុទ្ធ", "ប", "2020-01-02", "ក្បាលកោះធំ កោះធំ(ក) កោះធំ ខេត្តកណ្តាល", "ហេង វណ្ណថា", "965081488", "ហុង សៃងីម", "965081488", "ខ្នង.លិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0329", "អ៊ុល", "ចន្ទណាណា", "ស", "2020-02-03", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ", "អ៊ុល ពៅ", "977677677", "វន ស្រីអូន", "978595007", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["104", "អាត", "ពិសាល", "ប", "2020-09-30", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "រ៉ា ស៊ីគីន", "", "ណំ ចិន្តា", "", "ខ្នងកក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["91", "អាន", "មករា", "ប", "2020-01-26", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ងួន ណារី", "", "សែម ចរិយា", "", "ខ្នង.កើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["178", "អេង", "ខាស័រ", "ប", "2020-01-20", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "អ៊ិច ស៊ីណា", "", "វ៉ាន់ ស្រីរ៉េត", "", "ខ្នង.កើត ត្រមូង មេមត់ ត្បូងឃ្មុំ"],
    ["0253", "ហ៊ឹន", "ធីតា", "ស", "2020-06-23", "", "", "", "", "", ""]
  ];

  return rows.map((row, index) => {
    const khmerName = `${row[1].trim()} ${row[2].trim()}`;
    return {
      id: `STD-${yearCode}-B-${row[0]}`,
      registrationNo: row[0],
      khmerName,
      englishName: khmerName,
      gender: row[3] === "ស" ? "Female" : "Male",
      dob: row[4],
      birthPlace: row[5],
      birthProvince: row[5],
      parentName: row[6] || row[8] || "",
      guardianRelation: row[6] ? "Father" : row[8] ? "Mother" : "Guardian",
      fatherName: row[6],
      fatherPhone: row[7],
      motherName: row[8],
      motherPhone: row[9],
      phone: row[7] || row[9] || "",
      address: row[10],
      currentProvince: row[10],
      enrollmentDate: academicYear.startsAt,
      academicYearName: academicYear.name,
      classId: "CLS-004",
      classLevel: "ខ្ពស់(ខ)",
      section: "ខ",
      teacherId: "TCH-004",
      status: "Active",
      note: "បញ្ជីរាយនាមសិស្សដើមឆ្នាំ មត្តេយ្យខ្ពស់(ខ)",
      photo: avatar(khmerName, index + 80)
    };
  });
}

function importedMiddleStudentRows(academicYear) {
  const rows = [
    ["0307", "គង់", "ហង្សសាន្តនិត្យនរៈបុត្ត", "ប", "2021-01-05", "ព្រៃកី២ ពងទឹក ដង្កោ ភ្នំពេញ", "គង់ ផានិត", "0713522111", "យឹម សុគន្ធារី", "070380366", "រោងចក្រស្ករ ត្រមូង ត្បូងឃ្មុំ"],
    ["0319", "ឃុន", "គីមឈ័ង", "ប", "2021-04-12", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ឃុន សុធា", "0974444864", "អ៊ិន សុខឃីម", "0974444864", "ត្បូងវត្ត មេមត់ ត្បូងឃ្មុំ"],
    ["144", "ឆាយ", "ម៉េងលាភ", "ប", "2021-01-20", "រោងចក្រស្ករ ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "", "", "រិទ្ធ សេងហ័រ", "", "រោងចក្រស្ករ  ត្រមូង ត្បូងឃ្មុំ"],
    ["204", "ឆេង", "សុវណ្ណានេត", "ប", "2021-04-02", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ឆេង វណ្ណនី", "", "ឈីន គន្ធា", "", "ខ្នងក្រពើកើត  ត្រមូង ត្បូងឃ្មុំ"],
    ["236", "ជា", "ឈុនលាភ", "ប", "2021-08-17", "ខ្សាច់ ខ្សាច់ រលាប្អៀ ខេត្តកំពង់ឆ្នាំង", "ជា សុភារម្ស", "975541368", "ថោង ចិន", "975541368", "ខ្នងក្រពើលិច  ត្រមូង ត្បូងឃ្មុំ"],
    ["0333", "ថុន", "ណាអ៊ី", "ស", "2021-09-23", "រោងចក្រស្ករ ត្រមូង មេមត់ ត្បូងឃ្មុំ", "អឿន វ៉ាន់ថេន", "883355518", "សែន វ៉ាន់នី", "0883255515", "រោងចក្រស្ករ ត្រមូង ត្បូងឃ្មុំ"],
    ["0320", "ផែន", "ស៊ាងហ័រ", "ស", "2021-02-24", "ស្ទឹងពេញ ជីករ ត្បូងឃ្មុំ ត្បូងឃ្មុំ", "ផល ផេន", "0888684385", "គីម សេងហ៊ន់", "0886925209", "ខ្នងក្រពើកើត ត្រមូង ត្បូងឃ្មុំ"],
    ["263", "ពេជ្យ", "ធានប៉ាវ", "ប", "2021-11-29", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ស៊ាន ពេជ្យ", "977707846", "កាក់ ស្រីនិច", "977707846", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["203", "ព្រុំ", "ច័ន្ទមុន្នីរ័ត្ន", "ប", "2021-01-18", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ព្រុំ ដានី", "", "វ៉ែន ច័ន្ទបូរី", "", "ខ្នងក្រពើលិច  ត្រមូង ត្បូងឃ្មុំ"],
    ["67", "ម៉ុល", "សិរីឫទ្ធិពិសាល", "ប", "2021-09-23", "ជាំទ្រៀក ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "ជ័យ ស្រស់", "70241140", "ដូង ស្រីម៉ៅ", "70241140", "ជាំទ្រៀក ត្រមូង ត្បូងឃ្មុំ"],
    ["0278", "មាន", "ធនិន", "ប", "2021-06-19", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "សំ ចម្រើន", "0965540989", "ប៉ន សុឃា", "", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0266", "មាស", "យូហ្វី", "ប", "2021-11-17", "ត្បូងវត្ត មេមត់ មេមត់ ត្បូងឃ្មុំ", "តុម សោភា", "", "វ៉ាន់ ប៊ុនល័ក្ខ", "0714044124", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0300", "យាន", "រាជសម្បត្តិមាស", "ប", "2021-07-10", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "យាន ពិសិដ្ឋ", "0979744432", "ផាត ស្រីនា", "0979744432", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0304", "យូ", "ថេហ៊ុន", "ប", "2021-11-11", "អន្លង់ ព្រែកតាមាក់ ខ្សាច់កណ្ដាល កណ្ដាល", "យូ បូរិន", "0974003437", "ចយ សារ៉ាវិន", "0978351478", "រោងចក្រស្ករ ត្រមូង ត្បូងឃ្មុំ"],
    ["213", "វី", "ឥស្សរមុនី", "ប", "2021-04-20", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ខេត្តត្បូងឃ្មុំ", "គឹម ជីវ័ន", "889244894", "ធឿន សុដាលីន", "95367049", "ខ្នងក្រពើលិច  ត្រមូង ត្បូងឃ្មុំ"],
    ["0302", "លី", "ម៉េងឡុង", "ប", "2022-04-08", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "យ៉េន ចាន់លី", "0976767222", "សាត ស្រីលក្ខ័", "0976767222", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0309", "វណ្ណា", "ចន្ទវណ្ណយុត្តិ", "ប", "2021-06-21", "មុខក្រាស់ មេមត់ មេមត់ ត្បូងឃ្មុំ", "ញឹម វណ្ណី", "0889799111", "ជឹម ស្រីឆូក", "090636326", "មុខក្រាស មេមត់ ត្បូងឃ្មុំ"],
    ["0318", "សម្បត្តិដា", "សុផាវ៉ាត់", "ប", "2021-12-07", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ", "សម្បត្តិ រស្មី", "0886618661", "សែម ស្រីដា", "0979919787", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0259", "ស៊ុន", "ចាន់ ថាវីត", "ប", "2021-04-02", "ទួលសង្កែក ទួលសង្កែក ឫស្សីកែវ ភ្នំពេញ", "ស៊ុន ចាន់អូន", "077396143", "ចាយ ស្រីមុំ", "092525244", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0282", "សុង", "សីហា", "ប", "2021-08-06", "ដូងទី១ ត្រមូង មេមត់ ត្បូងឃ្មុំ", "កាច សុង", "0886136937", "សំ ស្រីមុំ", "0886136937", "ដូងទី១ ត្រមូង ត្បូងឃ្មុំ"],
    ["0290", "សុង", "សីមា", "ប", "2021-08-06", "ដូងទី១ ត្រមូង មេមត់ ត្បូងឃ្មុំ", "កាច សុង", "0886136937", "សំ ស្រីមុំ", "0886136937", "ដូងទី១ ត្រមូង ត្បូងឃ្មុំ"],
    ["0269", "សុភណ្ឌ", "ម៉ីអ៊ី", "ស", "2021-06-24", "មេមត់ផ្សារ មេមត់ មេមត់ ត្បូងឃ្មុំ", "លឹម សុភ័ណ្ឌ", "0886030333", "ឡាយ គីមហ័ង", "0886030333", "មេមត់ផ្សារ មេមត់ ត្បូងឃ្មុំ"],
    ["0265", "សោម", "ដាវីត", "ប", "2021-06-10", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "សោម សុវណ្ណ", "0979213096", "ធូ ស្រីម៉ុម", "0979213096", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0181", "ហា", "សុខហេង", "ប", "2021-06-08", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ម៉ៅ សង្ហា", "081714069", "នៅ ស៊ីថាន", "081714069", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0262", "ហុង", "ម៉ីជីង", "ស", "2021-08-25", "ជាំទ្រៀក ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ហុង សុខន", "093393336", "ភៅ សុជាតា", "093393336", "ជាំទ្រៀក ត្រមូង ត្បូងឃ្មុំ"],
    ["0264", "ហុង", "គីមឡាង", "ស", "2021-11-14", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ថុង ស៊ានហុង", "0716885588", "កាក់ ថារី", "0716885588", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0260", "ហឿន", "ដាលីស", "ស", "2021-07-30", "ជាំទ្រៀក ត្រមូង មេមត់ ត្បូងឃ្មុំ", "វណ្ណា ហឿន", "0973939532", "ឈួន ដាវី", "0718953394", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0285", "ឡាយ", "បញ្ញាមល្លិកា", "ស", "2021-05-31", "ខ្នងក្រពើលិច ត្រមូង មេមត់ ត្បូងឃ្មុំ", "សយ សុវត្តិ", "0972206618", "សុខ លក្ខិណា", "0972206618", "ខ្នងក្រពើលិច ត្រមូង ត្បូងឃ្មុំ"],
    ["0327", "ឡែន", "ជីម៉ារីន", "ស", "2021-12-18", "រោងចក្រស្ករ ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ស៊ាង ភាឡែន", "0884321087", "ជន ស្រីនាង", "0884321087", "រោងចក្រស្ករ ត្រមូង ត្បូងឃ្មុំ"],
    ["0344", "ស្រ៊ុន", "ចាន់សុខហេង", "ប", "2021-11-02", "ជាំទ្រៀក ត្រមូង មេមត់ ត្បូងឃ្មុំ", "កែវ គឹមស្រ៊ុន", "071333337", "ម៉ោញ សុខចាន់", "089700007", "ជាំទ្រៀក ត្រមូង ត្បូងឃ្មុំ"],
    ["0342", "ស្រាង", "ស្រីពេជ្រ", "ស", "2021-05-25", "ខ្នងក្រពើកើត ត្រមូង មេមត់ ត្បូងឃ្មុំ", "ហៃ ប៊ុនយ៉ុង", "0884441529", "ហាក់ ស្រីកា", "0886004341", "ខ្នងក្រពើកើត ត្រមូង ត្បូងឃ្មុំ"],
    ["0337", "សីហា", "ឈីញឈីញ", "ស", "2021-12-26", "ជាំត្រាវ ត្រមូង មេមត់ ត្បូងឃ្មុំ", "មាន សីហា", "092203327", "គីម កែវ", "085254382", "ជាំត្រាវ ត្រមូង ត្បូងឃ្មុំ"]
  ];

  return rows.map((row, index) => {
    const khmerName = `${row[1].trim()} ${row[2].trim()}`;
    return {
      id: `STD-2026-${row[0]}`,
      registrationNo: row[0],
      khmerName,
      englishName: khmerName,
      gender: row[3] === "ស" ? "Female" : "Male",
      dob: row[4],
      birthPlace: row[5],
      parentName: row[6] || row[8] || "",
      guardianRelation: row[6] ? "Father" : row[8] ? "Mother" : "Guardian",
      fatherName: row[6],
      fatherPhone: row[7],
      motherName: row[8],
      motherPhone: row[9],
      phone: row[7] || row[9] || "",
      address: row[10],
      enrollmentDate: academicYear.startsAt,
      academicYearName: academicYear.name,
      classId: "CLS-002",
      classLevel: "មធ្យម",
      teacherId: "TCH-002",
      status: "Active",
      photo: avatar(khmerName, index + 48)
    };
  });
}

function ensureHighClassStudentImport(data) {
  data.academicYears ||= [];
  data.students ||= [];
  data.classes ||= [];

  if (!data.academicYears.some((year) => year.id === highClassAcademicYear.id || year.name === highClassAcademicYear.name)) {
    data.academicYears.unshift({ ...highClassAcademicYear });
  }

  const highA = data.classes.find((item) => item.id === "CLS-003");
  if (highA) {
    highA.name = "ខ្ពស់(ក)";
    highA.level = 2;
    highA.capacity = Number(highA.capacity || 30);
  } else {
    data.classes.push({ id: "CLS-003", name: "ខ្ពស់(ក)", level: 2, teacherId: "TCH-003", room: "បន្ទប់ C", capacity: 30 });
  }

  if (!data.classes.some((item) => item.id === "CLS-004")) {
    data.classes.push({ id: "CLS-004", name: "ខ្ពស់(ខ)", level: 2, teacherId: "TCH-004", room: "បន្ទប់ D", capacity: 30 });
  }

  data.teachers?.forEach((teacher) => {
    if (teacher.id === "TCH-003") teacher.assignedClassId = "CLS-003";
    if (teacher.id === "TCH-004") teacher.assignedClassId = "CLS-004";
  });

  const existingKeys = new Set(data.students.map((student) => `${student.academicYearName || ""}:${student.classId || ""}:${student.registrationNo || ""}`));
  [...importedStudentRows(highClassAcademicYear), ...importedHighBStudentRows(highClassAcademicYear)].forEach((student) => {
    const key = `${student.academicYearName}:${student.classId}:${student.registrationNo}`;
    if (!data.students.some((item) => item.id === student.id) && !existingKeys.has(key)) {
      data.students.push(student);
      existingKeys.add(key);
    }
  });

  data.students.forEach((student) => {
    if (student.classId === "CLS-003" && classLevelName(student.classLevel) === "ខ្ពស់") {
      student.classLevel = "ខ្ពស់(ក)";
      student.section ||= "ក";
    }
  });
}

function seedState() {
  const academicYear = highClassAcademicYear;
  const nextAcademicYear = {
    id: "AY-2026",
    name: "2026-2027",
    startsAt: "2026-01-08",
    endsAt: "2026-12-18",
    status: "Inactive"
  };

  const teachers = [
    { id: "TCH-001", name: "ចាន់ សុខា", email: "sokha@littlesprouts.edu", phone: "012 345 678", qualification: "អប់រំកុមារតូច", assignedClassId: "CLS-001", status: "Active" },
    { id: "TCH-002", name: "គឹម ដារ៉ា", email: "dara@littlesprouts.edu", phone: "016 234 567", qualification: "អភិវឌ្ឍន៍កុមារ", assignedClassId: "CLS-002", status: "Active" },
    { id: "TCH-003", name: "សន ម៉ាលី", email: "maly@littlesprouts.edu", phone: "017 222 555", qualification: "អប់រំបឋម", assignedClassId: "CLS-003", status: "Active" },
    { id: "TCH-004", name: "វង្ស រីណា", email: "rina@littlesprouts.edu", phone: "010 888 909", qualification: "ជំនួយការម៉ុងតេសូរី", assignedClassId: "CLS-004", status: "Active" }
  ];

  const classes = [
    { id: "CLS-001", name: "ទាប", level: 0, teacherId: "TCH-001", room: "បន្ទប់ A", capacity: 24 },
    { id: "CLS-002", name: "មធ្យម", level: 1, teacherId: "TCH-002", room: "បន្ទប់ B", capacity: 24 },
    { id: "CLS-003", name: "ខ្ពស់(ក)", level: 2, teacherId: "TCH-003", room: "បន្ទប់ C", capacity: 30 },
    { id: "CLS-004", name: "ខ្ពស់(ខ)", level: 2, teacherId: "TCH-004", room: "បន្ទប់ D", capacity: 30 }
  ];

	  const students = [
	    ["STD-2026-001", "ហែម សុភា", "Sophea Hem", "Female", "2021-03-10", "ហែម វណ្ណៈ", "Father", "012 771 221", "ទួលគោក ភ្នំពេញ", "2026-01-08", "CLS-001", "Active"],
	    ["STD-2026-002", "ណេត វិសាល", "Visal Neth", "Male", "2020-08-22", "ណេត នារី", "Mother", "011 224 551", "សែនសុខ ភ្នំពេញ", "2026-01-08", "CLS-002", "Active"],
	    ["STD-2026-003", "ម៉ៅ លក្ខិណា", "Leakena Mao", "Female", "2019-12-03", "ម៉ៅ សីហា", "Guardian", "093 111 245", "ដូនពេញ ភ្នំពេញ", "2026-01-10", "CLS-003", "Active"],
    ["STD-2026-004", "លី បញ្ញា", "Panha Ly", "Male", "2018-11-17", "លី សុវណ្ណ", "Father", "070 555 121", "ជ្រោយចង្វារ ភ្នំពេញ", "2026-01-12", "CLS-003", "Active"],
    ["STD-2026-005", "ឡុង កនិកា", "Kanika Long", "Female", "2018-06-29", "ឡុង ស្រីពៅ", "Mother", "081 343 555", "ចំការមន ភ្នំពេញ", "2026-01-13", "CLS-003", "Active"]
  ].map((row, index) => ({
    id: row[0],
    khmerName: row[1],
    englishName: row[2],
    gender: row[3],
    dob: row[4],
    parentName: row[5],
    guardianRelation: row[6],
    phone: row[7],
    address: row[8],
    enrollmentDate: row[9],
	    classId: row[10],
	    status: row[11],
	    photo: avatar(row[2], index)
	  }));
		  students.length = 0;
  students.push(...importedStudentRows(academicYear));
  students.push(...importedHighBStudentRows(academicYear));

  return {
    settings: {
      schoolName: SCHOOL_NAME,
      shortName: SCHOOL_NAME,
      address: "ភ្នំពេញ កម្ពុជា",
      contact: "012 345 678",
      email: "office@littlesprouts.edu",
      principal: "អ្នកគ្រូ រត្ន ចិន្តា",
      logoText: "KMS"
    },
    users: [
      { id: "USR-001", name: "អ្នកគ្រប់គ្រង", username: "admin", password: "password", role: "Administrator", status: "Active" },
      { id: "USR-002", name: "បុគ្គលិកការិយាល័យ", username: "staff", password: "password", role: "Staff", status: "Active" },
      { id: "USR-003", name: "គណនីគ្រូបង្រៀន", username: "teacher", password: "password", role: "Teacher", status: "Active" }
    ],
    academicYears: [academicYear, nextAcademicYear],
    students,
    teachers,
    classes,
    certificates: [],
    events: [
      { id: uid("EVT"), title: "ប្រជុំមាតាបិតា", date: "2026-08-12", type: "Event" },
      { id: uid("EVT"), title: "ថ្ងៃឈប់សម្រាកបុណ្យឯករាជ្យ", date: "2026-11-09", type: "Holiday" }
    ],
    activityLogs: [
      { id: uid("LOG"), at: new Date().toISOString(), user: "ប្រព័ន្ធ", action: "បានបង្កើតទិន្នន័យសាកល្បងសម្រាប់សាលា" }
    ],
    backups: []
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = migrateState(JSON.parse(saved));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    return seedState();
  } catch {
    return seedState();
  }
}

function canSyncState() {
  return Boolean(SYNC_CONFIG.enabled && SYNC_CONFIG.endpoint && window.fetch);
}

async function hydrateStateFromRemote() {
  if (!canSyncState()) return;
  try {
    const response = await fetch(SYNC_CONFIG.endpoint, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      if (payload?.data && Object.keys(payload.data).length) {
        state = migrateState(payload.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        syncLastSavedJson = JSON.stringify(state);
        syncHydrated = true;
      } else {
        await persistStateToRemote();
      }
      return;
    }
    if (response.status === 404) {
      await persistStateToRemote();
    }
  } catch (error) {
    syncLastError = error.message || String(error);
  }
}

async function persistStateToRemote() {
  if (!canSyncState()) return;
  const dataJson = JSON.stringify(state);
  if (syncHydrated && dataJson === syncLastSavedJson) return;
  try {
    const response = await fetch(SYNC_CONFIG.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: state })
    });
    if (!response.ok) throw new Error(`Sync save failed: ${response.status}`);
    syncLastSavedJson = dataJson;
    syncHydrated = true;
    syncLastError = "";
  } catch (error) {
    syncLastError = error.message || String(error);
  }
}

async function refreshStateFromRemote() {
  if (!canSyncState() || !currentUser) return;
  try {
    const response = await fetch(SYNC_CONFIG.endpoint, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    if (!payload?.data) return;
    const remoteState = migrateState(payload.data);
    const remoteJson = JSON.stringify(remoteState);
    if (remoteJson === JSON.stringify(state)) return;
    state = remoteState;
    localStorage.setItem(STORAGE_KEY, remoteJson);
    syncLastSavedJson = remoteJson;
    currentUser = state.users.find((user) => user.id === currentUser.id) || currentUser;
    renderShell();
    render();
  } catch (error) {
    syncLastError = error.message || String(error);
  }
}

function startStateSync() {
  if (!canSyncState() || syncTimer) return;
  syncTimer = window.setInterval(refreshStateFromRemote, SYNC_CONFIG.pollMs);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshStateFromRemote();
  });
}

function migrateState(data) {
  data.academicYears ||= [];
  data.students ||= [];
  data.classes ||= [];
  data.teachers ||= [];
  data.users ||= [];
  data.events ||= [];
  data.activityLogs ||= [];
  data.settings = {
    ...data.settings,
    schoolName: ["Little Sprouts Kindergarten", "សាលាមត្តេយ្យ Little Sprouts", "Little Sprouts"].includes(data.settings?.schoolName) ? SCHOOL_NAME : data.settings?.schoolName,
    shortName: ["Little Sprouts Kindergarten", "សាលាមត្តេយ្យ Little Sprouts", "Little Sprouts"].includes(data.settings?.shortName) ? SCHOOL_NAME : data.settings?.shortName,
    address: data.settings?.address === "Phnom Penh, Cambodia" ? "ភ្នំពេញ កម្ពុជា" : data.settings?.address,
    principal: data.settings?.principal === "Ms. Chenda Rath" ? "អ្នកគ្រូ រត្ន ចិន្តា" : data.settings?.principal,
    logoText: data.settings?.logoText === ["L", "S", "K"].join("") ? "KMS" : data.settings?.logoText
  };
  data.users?.forEach((user) => {
    if (user.username === "admin") user.name = "អ្នកគ្រប់គ្រង";
    if (user.username === "staff") user.name = "បុគ្គលិកការិយាល័យ";
    if (user.username === "teacher") user.name = "គណនីគ្រូបង្រៀន";
  });
  const teacherNames = {
    "Sokha Chan": "ចាន់ សុខា",
    "Dara Kim": "គឹម ដារ៉ា",
    "Maly Sorn": "សន ម៉ាលី",
    "Rina Vong": "វង្ស រីណា"
  };
  data.teachers?.forEach((teacher) => {
    teacher.name = teacherNames[teacher.name] || teacher.name;
  });
	  data.classes?.forEach((item) => {
	    if (item.room === "Room A") item.room = "បន្ទប់ A";
	    if (item.room === "Room B") item.room = "បន្ទប់ B";
	    if (item.room === "Room C") item.room = "បន្ទប់ C";
	    if (item.room === "Room D") item.room = "បន្ទប់ D";
	    item.name = normalizeClassName(item.name);
	    item.level = classLevelIndex(item.name);
	  });
  const studentKhmerNames = {
    Sophea: "ហែម សុភា",
    Visal: "ណេត វិសាល",
    Leakena: "ម៉ៅ លក្ខិណា",
    Panha: "លី បញ្ញា",
    Kanika: "ឡុង កនិកា"
  };
  const parentNames = {
    "Vannak Hem": "ហែម វណ្ណៈ",
    "Nary Neth": "ណេត នារី",
    "Seyha Mao": "ម៉ៅ សីហា",
    "Sovann Ly": "លី សុវណ្ណ",
    "Sreypov Long": "ឡុង ស្រីពៅ"
  };
  const addresses = {
    "Tuol Kork, Phnom Penh": "ទួលគោក ភ្នំពេញ",
    "Sen Sok, Phnom Penh": "សែនសុខ ភ្នំពេញ",
    "Daun Penh, Phnom Penh": "ដូនពេញ ភ្នំពេញ",
    "Chroy Changvar, Phnom Penh": "ជ្រោយចង្វារ ភ្នំពេញ",
    "Chamkarmon, Phnom Penh": "ចំការមន ភ្នំពេញ"
  };
	  data.students?.forEach((student) => {
	    student.khmerName = studentKhmerNames[student.khmerName] || student.khmerName;
	    student.parentName = parentNames[student.parentName] || student.parentName;
	    student.address = addresses[student.address] || student.address;
	    student.classLevel = normalizeClassName(student.classLevel);
	    if (student.address && !student.currentProvince) {
	      student.currentProvince = student.address;
	    }
	    if (student.birthPlace && !student.birthProvince) {
	      student.birthProvince = student.birthPlace;
	    }
	  });
  ensureHighClassStudentImport(data);
	  data.certificates = (data.certificates || []).filter((cert) => data.students.some((student) => student.id === cert.studentId));
  data.events?.forEach((event) => {
    if (event.title === "Parent meeting") event.title = "ប្រជុំមាតាបិតា";
    if (event.title === "Independence Day holiday") event.title = "ថ្ងៃឈប់សម្រាកបុណ្យឯករាជ្យ";
  });
  data.activityLogs?.forEach((log) => {
    if (log.user === "System") log.user = "ប្រព័ន្ធ";
    if (log.action === "Created demo school workspace") log.action = "បានបង្កើតទិន្នន័យសាកល្បងសម្រាប់សាលា";
  });
  return data;
}

function saveState(action) {
  if (action) {
    state.activityLogs.unshift({ id: uid("LOG"), at: new Date().toISOString(), user: currentUser?.name || "ប្រព័ន្ធ", action });
    state.activityLogs = state.activityLogs.slice(0, 50);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  persistStateToRemote();
  render();
}

function avatar(name, index = 0) {
  const colors = ["2c8fd6", "33b980", "f5bd45", "ef6b73", "7f87ff"];
  const initials = encodeURIComponent(name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase());
  return `https://ui-avatars.com/api/?name=${initials}&background=${colors[index % colors.length]}&color=fff&bold=true`;
}

function ageFromDob(dob) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function activeYear() {
  return state.academicYears.find((year) => year.status === "Active") || state.academicYears[0];
}

function getClass(id) {
  return state.classes.find((item) => item.id === id);
}

function getTeacher(id) {
  return state.teachers.find((item) => item.id === id);
}

function getStudent(id) {
  return state.students.find((item) => item.id === id);
}

function label(value) {
  return km.statuses[value] || km.roles[value] || km.gender[value] || km.relations[value] || km.classes[value] || km.eventTypes[value] || value || "";
}

function className(id) {
  const item = getClass(id);
  return item ? label(item.name) : "មិនទាន់កំណត់ថ្នាក់";
}

function normalizeClassName(value) {
  return legacyClassNames[value] || value || "ទាប";
}

function classLevelName(value) {
  const name = normalizeClassName(value);
  return name?.startsWith("ខ្ពស់") ? "ខ្ពស់" : name;
}

function classLevelIndex(value) {
  return Math.max(0, gradeOrder.indexOf(classLevelName(value)));
}

function formatLocation(record, prefix, fallbackKey) {
  const parts = [
    record[`${prefix}Village`] && `ភូមិ ${record[`${prefix}Village`]}`,
    record[`${prefix}Commune`] && `ឃុំ/សង្កាត់ ${record[`${prefix}Commune`]}`,
    record[`${prefix}District`] && `ស្រុក/ខណ្ឌ ${record[`${prefix}District`]}`,
    record[`${prefix}Province`] && `ខេត្ត/រាជធានី ${record[`${prefix}Province`]}`
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : record[fallbackKey] || "";
}

function allowedItems() {
  return navItems.filter(([, , roles]) => roles.includes(currentUser.role));
}

async function init() {
  await hydrateStateFromRemote();
  const savedUser = sessionStorage.getItem("kms-user");
  if (savedUser) {
    currentUser = state.users.find((user) => user.id === savedUser) || null;
  }

  $("#loginForm").addEventListener("submit", handleLogin);
  $("#logoutBtn").addEventListener("click", logout);
  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#sidebarCollapse").addEventListener("click", () => {
    $("#appShell").classList.toggle("sidebar-collapsed");
    refreshIcons();
  });
  $("#notificationBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    $("#profileMenu").classList.add("hidden");
    $("#fabMenu").classList.add("hidden");
    $("#notificationPanel").classList.toggle("hidden");
  });
  $("#profileBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    $("#notificationPanel").classList.add("hidden");
    $("#fabMenu").classList.add("hidden");
    $("#profileMenu").classList.toggle("hidden");
  });
  $("#fabBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    $("#notificationPanel").classList.add("hidden");
    $("#profileMenu").classList.add("hidden");
    $("#fabMenu").classList.toggle("hidden");
  });
  document.addEventListener("click", () => {
    $("#notificationPanel").classList.add("hidden");
    $("#profileMenu").classList.add("hidden");
    $("#fabMenu").classList.add("hidden");
  });
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (event) => {
    if (event.target.id === "modal") closeModal();
  });
  $("#globalSearch").addEventListener("input", handleGlobalSearch);

  document.body.dataset.theme = localStorage.getItem("kms-theme") || "light";
  startStateSync();
  currentUser ? enterApp() : showLogin();
}

function handleLogin(event) {
  event.preventDefault();
  const username = $("#loginUsername").value.trim();
  const password = $("#loginPassword").value;
  const user = state.users.find((item) => item.username === username && item.password === password && item.status === "Active");
  if (!user) {
    alert("ឈ្មោះអ្នកប្រើ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ ឬគណនីអសកម្ម។");
    return;
  }
  currentUser = user;
  sessionStorage.setItem("kms-user", user.id);
  enterApp();
}

function logout() {
  sessionStorage.removeItem("kms-user");
  currentUser = null;
  showLogin();
}

function showLogin() {
  $("#loginScreen").classList.remove("hidden");
  $("#appShell").classList.add("hidden");
}

function enterApp() {
  $("#loginScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  activeView = allowedItems().some(([key]) => key === activeView) ? activeView : allowedItems()[0][0];
  renderShell();
  render();
}

function renderShell() {
  $("#schoolNameSide").textContent = state.settings.shortName;
  $("#profileName").textContent = currentUser.name;
  $("#profileRole").textContent = label(currentUser.role);
  $("#profileInitials").textContent = currentUser.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  $("#activeYearBadge").textContent = activeYear()?.name || "មិនទាន់កំណត់";
  $("#sidebarCollapse").innerHTML = `<i data-lucide="${$("#appShell").classList.contains("sidebar-collapsed") ? "panel-left-open" : "panel-left-close"}"></i>`;
  const allowedKeys = allowedItems().map(([key]) => key);
  const academicButton = $(".sidebar-card [data-nav='academic']");
  if (academicButton) academicButton.style.display = allowedKeys.includes("academic") ? "inline-flex" : "none";
  $$("#profileMenu [data-nav], #fabMenu [data-nav]").forEach((button) => {
    button.style.display = allowedKeys.includes(button.dataset.nav) ? "flex" : "none";
  });
  const currentLabel = navItems.find(([key]) => key === activeView)?.[1] || "ផ្ទាំងគ្រប់គ្រង";
  $("#breadcrumb").innerHTML = `<span>កន្លែងធ្វើការ</span><i data-lucide="chevron-right"></i><strong>${currentLabel}</strong>`;
  $("#notificationPanel").innerHTML = `
    <div class="summary-list">
      ${state.events.slice(0, 4).map((event) => `
        <div class="summary-tile">
          <div><strong>${event.title}</strong><p class="muted">${label(event.type)}</p></div>
          <span class="badge">${event.date}</span>
        </div>
      `).join("") || `<p class="muted">មិនមានការជូនដំណឹង។</p>`}
    </div>
  `;
  $("#sideNav").innerHTML = allowedItems().map(([key, label]) => `
    <button class="nav-item ${activeView === key ? "active" : ""}" data-nav="${key}">
      <i data-lucide="${icons[key]}"></i><span>${label}</span>
    </button>
  `).join("");
  $$("[data-nav]").forEach((button) => {
    button.onclick = () => navigate(button.dataset.nav);
  });
  refreshIcons();
}

function navigate(key) {
  if (!allowedItems().some(([itemKey]) => itemKey === key)) return;
  activeView = key;
  $("#sidebar").classList.remove("open");
  $("#notificationPanel").classList.add("hidden");
  $("#profileMenu").classList.add("hidden");
  $("#fabMenu").classList.add("hidden");
  renderShell();
  render();
}

function render() {
  if (!currentUser) return;
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#view-${activeView}`).classList.add("active");

  const renderers = {
    dashboard: renderDashboard,
    students: renderStudents,
    teachers: renderTeachers,
    classes: renderClasses,
    promotion: renderPromotion,
    certificates: renderCertificates,
    reports: renderReports,
    users: renderUsers,
    academic: renderAcademic,
    settings: renderSettings
  };
  renderers[activeView]();
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function pageHead(title, subtitle, actions = "") {
  return `
    <div class="page-head">
      <div>
        <h2>${title}</h2>
        <p class="muted">${subtitle}</p>
      </div>
      <div class="page-actions">${actions}</div>
    </div>
  `;
}

function statCard(label, value, icon, color = "") {
  return `
    <article class="stat-card ${color}">
      <div class="stat-icon"><i data-lucide="${icon}"></i></div>
      <span class="muted">${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderDashboard() {
  const activeStudents = state.students.filter((student) => student.status === "Active");
  const graduated = state.students.filter((student) => student.status === "Graduated");
  const recent = [...state.students].sort((a, b) => b.enrollmentDate.localeCompare(a.enrollmentDate)).slice(0, 5);
  const classTotals = state.classes.map((item) => ({
    ...item,
    enrolled: activeStudents.filter((student) => student.classId === item.id).length
  }));
  const capacity = classTotals.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
  const utilization = capacity ? Math.round((activeStudents.length / capacity) * 100) : 0;

  $("#view-dashboard").innerHTML = `
    ${pageHead("ផ្ទាំងគ្រប់គ្រង", `ស្ថានភាពប្រចាំថ្ងៃសម្រាប់ ${state.settings.schoolName}។`, `
      <button class="primary-btn" data-nav="students"><i data-lucide="user-plus"></i>ចុះឈ្មោះសិស្ស</button>
      <button class="ghost-btn" data-nav="classes"><i data-lucide="school"></i>គ្រប់គ្រងថ្នាក់</button>
    `)}
    <div class="stats-grid">
      ${statCard("សិស្សសរុប", activeStudents.length, "graduation-cap", "blue")}
      ${statCard("គ្រូបង្រៀន", state.teachers.length, "users")}
      ${statCard("ថ្នាក់រៀន", state.classes.length, "school", "yellow")}
      ${statCard("សិស្សបញ្ចប់", graduated.length, "award", "red")}
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>ការចុះឈ្មោះតាមកម្រិត</h3>
            <p class="muted">សិស្សសកម្មតាមកម្រិតថ្នាក់។</p>
          </div>
          <span class="badge green">${activeStudents.length} សកម្ម</span>
        </div>
        <div class="chart-wrap"><canvas id="enrollmentChart"></canvas></div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>សមត្ថភាពថ្នាក់</h3>
            <p class="muted">ចំនួនសិស្សធៀបនឹងសមត្ថភាពបន្ទប់។</p>
          </div>
          <span class="badge">ប្រើប្រាស់ ${utilization}%</span>
        </div>
        <div class="summary-list">
          ${classTotals.map((item) => `<div class="summary-tile"><span>${label(item.name)}</span><strong>${item.enrolled}/${item.capacity}</strong></div>`).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>សិស្សតាមថ្នាក់</h3><span class="badge">បច្ចុប្បន្ន</span></div>
        <div class="chart-wrap"><canvas id="classChart"></canvas></div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>ការចុះឈ្មោះថ្មីៗ</h3><button class="ghost-btn compact" data-nav="students">មើលទាំងអស់</button></div>
        <div class="summary-list">
          ${recent.map((student) => `
            <div class="summary-tile">
              <div class="student-cell">
                <img class="avatar" src="${student.photo}" alt="">
                <div><strong>${student.englishName}</strong><p class="muted">${className(student.classId)}</p></div>
              </div>
              <span class="badge">${student.enrollmentDate}</span>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;

  $$("[data-nav]").forEach((button) => button.onclick = () => navigate(button.dataset.nav));
  drawChart("enrollmentChart", "doughnut", classTotals.map((item) => label(item.name)), classTotals.map((item) => item.enrolled), ["#4F46E5", "#22C55E", "#F59E0B", "#10B981"]);
  drawChart("classChart", "bar", classTotals.map((item) => label(item.name)), classTotals.map((item) => item.enrolled), ["#4F46E5"]);
}

function drawChart(id, type, labels, data, colors) {
  if (!window.Chart) {
    $(`#${id}`).replaceWith(document.createTextNode("មិនអាចបង្ហាញក្រាហ្វបាន។"));
    return;
  }
  if (chartRefs[id]) chartRefs[id].destroy();
  chartRefs[id] = new Chart($(`#${id}`), {
    type,
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderRadius: type === "bar" ? 8 : 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: type === "bar" ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : {}
    }
  });
}

function renderStudents() {
  const view = $("#view-students");
  view.innerHTML = `
	    ${pageHead("គ្រប់គ្រងសិស្ស", "ចុះឈ្មោះ កែប្រែ ស្វែងរក តម្រៀប និងគ្រប់គ្រងប្រវត្តិសិស្ស។", `
		      <button class="primary-btn" id="newStudentBtn"><i data-lucide="user-plus"></i>សិស្សថ្មី</button>
		      <button class="ghost-btn" id="detailStudentsBtn"><i data-lucide="table-2"></i>តារាងលម្អិត</button>
		      <button class="ghost-btn" id="studentCardsBtn"><i data-lucide="id-card"></i>កាតសិស្ស</button>
		      <button class="ghost-btn" id="exportStudentsBtn"><i data-lucide="download"></i>Excel</button>
		    `)}
    <section class="table-panel">
      ${tableToolbar("studentSearch", "ស្វែងរកសិស្ស", "studentClassFilter", classOptions("ថ្នាក់ទាំងអស់"), "studentStatusFilter", ["ស្ថានភាពទាំងអស់", "Active", "Inactive", "Graduated"])}
      <div class="table-wrap"><table id="studentsTable"></table></div>
    </section>
	  `;
		  $("#newStudentBtn").addEventListener("click", () => openStudentModal());
		  $("#detailStudentsBtn").addEventListener("click", () => showStudentDetailTable(filteredStudentRows()));
		  $("#studentCardsBtn").addEventListener("click", () => showStudentCards(studentRows(), "កាតសិស្សទាំងអស់"));
		  $("#exportStudentsBtn").addEventListener("click", () => exportRows("students.csv", studentRows(), ["id", "khmerName", "englishName", "gender", "dob", "age", "birthCertificateNo", "birthPlace", "parentName", "phone", "address", "enrollmentDate", "className", "classLevel", "status"]));
	  bindStudentTable();
	}

function studentForm(student = {}) {
  return `
    <form id="studentForm" class="form-grid">
      <input type="hidden" name="id" value="${student.id || ""}">
      <div class="photo-upload">
        <img id="studentPhotoPreview" src="${student.photo || avatar("New Student", 1)}" alt="រូបថតសិស្ស">
        <input id="studentPhotoInput" name="photo" type="file" accept="image/*">
        <button class="ghost-btn compact" type="button" id="studentPhotoBtn"><i data-lucide="image-plus"></i>បង្ហោះរូបថត</button>
      </div>
      <div class="form-grid two">
        <label>លេខចុះឈ្មោះ<input name="registrationNo" value="${student.registrationNo || nextRegistrationNo()}" required></label>
        <label>ឆ្នាំសិក្សា<input name="academicYearName" value="${student.academicYearName || activeYear()?.name || ""}" required></label>
        <label>ឈ្មោះខ្មែរ<input name="khmerName" value="${student.khmerName || ""}" required></label>
        <label>ភេទ<select name="gender">${options(["Female", "Male"], student.gender)}</select></label>
        <label>ថ្ងៃខែឆ្នាំកំណើត<input name="dob" type="date" value="${student.dob || ""}" required></label>
        <label>លេខសំបុត្រកំណើត<input name="birthCertificateNo" value="${student.birthCertificateNo || ""}"></label>
        <label>ទីកន្លែងកំណើត - ភូមិ<input name="birthVillage" value="${student.birthVillage || ""}"></label>
        <label>ទីកន្លែងកំណើត - ឃុំ/សង្កាត់<input name="birthCommune" value="${student.birthCommune || ""}"></label>
        <label>ទីកន្លែងកំណើត - ស្រុក/ខណ្ឌ<input name="birthDistrict" value="${student.birthDistrict || ""}"></label>
        <label>ទីកន្លែងកំណើត - ខេត្ត/រាជធានី<input name="birthProvince" value="${student.birthProvince || ""}"></label>
        <label>មាតាបិតា/អាណាព្យាបាល<input name="parentName" value="${student.parentName || ""}" required></label>
        <label>ទំនាក់ទំនង<input name="guardianRelation" value="${label(student.guardianRelation) || ""}" required></label>
        <label>ឈ្មោះឪពុក<input name="fatherName" value="${student.fatherName || ""}"></label>
        <label>មុខរបរឪពុក<input name="fatherOccupation" value="${student.fatherOccupation || ""}"></label>
        <label>ឈ្មោះម្តាយ<input name="motherName" value="${student.motherName || ""}"></label>
        <label>មុខរបរម្តាយ<input name="motherOccupation" value="${student.motherOccupation || ""}"></label>
        <label>លេខទូរស័ព្ទ<input name="phone" value="${student.phone || ""}" required></label>
        <label>ថ្ងៃចុះឈ្មោះ<input name="enrollmentDate" type="date" value="${student.enrollmentDate || today()}" required></label>
        <label>ថ្នាក់<select name="classId">${classOptions("ជ្រើសថ្នាក់", student.classId || state.classes[0]?.id || "")}</select></label>
        <input type="hidden" name="classLevel" value="${student.classLevel || getClass(student.classId)?.name || ""}">
        <label>ស្ថានភាព<select name="status">${options(["Active", "Inactive", "Graduated"], student.status || "Active")}</select></label>
        <label>គ្រូទទួលបន្ទុក<select name="teacherId">${teacherOptions("ជ្រើសគ្រូ", student.teacherId || getClass(student.classId)?.teacherId || "")}</select></label>
        <label>អ្នកទទួលចុះឈ្មោះ<input name="receivedBy" value="${student.receivedBy || currentUser?.name || ""}"></label>
        <label>អាសយដ្ឋានបច្ចុប្បន្ន - ភូមិ<input name="currentVillage" value="${student.currentVillage || ""}"></label>
        <label>អាសយដ្ឋានបច្ចុប្បន្ន - ឃុំ/សង្កាត់<input name="currentCommune" value="${student.currentCommune || ""}"></label>
        <label>អាសយដ្ឋានបច្ចុប្បន្ន - ស្រុក/ខណ្ឌ<input name="currentDistrict" value="${student.currentDistrict || ""}"></label>
        <label>អាសយដ្ឋានបច្ចុប្បន្ន - ខេត្ត/រាជធានី<input name="currentProvince" value="${student.currentProvince || ""}"></label>
      </div>
      <label>ចំណាំ<textarea name="note" rows="2">${student.note || ""}</textarea></label>
      <div class="page-actions">
        <button class="primary-btn" type="submit"><i data-lucide="save"></i>រក្សាទុកសិស្ស</button>
        <button class="ghost-btn" type="button" id="previewStudentReceiptBtn"><i data-lucide="printer"></i>មើលបង្កាន់ដៃ</button>
      </div>
    </form>
  `;
}

function bindStudentForm() {
  $("#studentPhotoBtn").addEventListener("click", () => $("#studentPhotoInput").click());
  $("#studentPhotoInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => $("#studentPhotoPreview").src = reader.result;
    reader.readAsDataURL(file);
  });
  $("#studentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.englishName = data.khmerName;
    data.photo = $("#studentPhotoPreview").src;
    data.birthPlace = formatLocation(data, "birth", "birthPlace");
    data.address = formatLocation(data, "current", "address");
    data.classLevel = getClass(data.classId)?.name || data.classLevel || "";
    const existing = state.students.find((student) => student.id === data.id);
    let savedId = data.id;
    if (existing) {
      Object.assign(existing, data);
      savedId = existing.id;
      saveState(`បានកែប្រែសិស្ស ${data.khmerName}`);
    } else {
      data.id = nextStudentId();
      savedId = data.id;
      state.students.unshift(data);
      saveState(`បានចុះឈ្មោះសិស្ស ${data.khmerName}`);
    }
    closeModal();
    renderStudents();
    showStudentReceipt(savedId);
  });
  $("#previewStudentReceiptBtn").addEventListener("click", () => {
    const data = Object.fromEntries(new FormData($("#studentForm")).entries());
    data.id = data.id || nextStudentId();
    data.englishName = data.khmerName;
    data.photo = $("#studentPhotoPreview").src;
    data.birthPlace = formatLocation(data, "birth", "birthPlace");
    data.address = formatLocation(data, "current", "address");
    data.classLevel = getClass(data.classId)?.name || data.classLevel || "";
    showStudentReceipt(null, data);
  });
}

function openStudentModal(student = {}) {
  openModal(`
    <div class="panel-head">
      <div>
        <h2>${student.id ? "កែប្រែសិស្ស" : "ចុះឈ្មោះសិស្សថ្មី"}</h2>
        <p class="muted">${student.id ? "កែប្រែព័ត៌មានសិស្សដែលបានជ្រើស។" : "បញ្ចូលព័ត៌មានសិស្សថ្មីសម្រាប់សាលាមត្តេយ្យ។"}</p>
      </div>
    </div>
    ${studentForm(student)}
  `);
  bindStudentForm();
}

function bindStudentTable() {
  ["studentSearch", "studentClassFilter", "studentStatusFilter"].forEach((id) => $(`#${id}`).addEventListener("input", () => renderStudentRows()));
  renderStudentRows();
}

function renderStudentRows() {
  const rows = filteredStudentRows();
  renderTable("studentsTable", rows, [
    ["សិស្ស", (row) => `<div class="student-cell"><img class="avatar" src="${row.photo}" alt=""><div><strong>${row.khmerName}</strong><p class="muted">${row.id}</p></div></div>`],
    ["ភេទ", (row) => label(row.gender)],
    ["អាយុ", "age"],
    ["ថ្នាក់", "className"],
    ["អាណាព្យាបាល", (row) => `${row.parentName}<p class="muted">${row.phone}</p>`],
    ["ស្ថានភាព", (row) => badge(row.status)],
    ["សកម្មភាព", (row) => `
      <div class="row-actions">
        <button class="ghost-btn compact" data-view-student="${row.id}"><i data-lucide="eye"></i>លម្អិត</button>
        <button class="ghost-btn compact" data-card-student="${row.id}"><i data-lucide="id-card"></i>កាត</button>
        <button class="ghost-btn compact" data-print-student="${row.id}"><i data-lucide="printer"></i>បង្កាន់ដៃ</button>
        <button class="ghost-btn compact" data-edit-student="${row.id}"><i data-lucide="pencil"></i>កែប្រែ</button>
        <button class="danger-btn compact" data-delete-student="${row.id}"><i data-lucide="trash-2"></i>លុប</button>
      </div>
    `]
  ]);
  bindRowActions("student", editStudent, deleteStudent);
  $$("[data-view-student]").forEach((button) => {
    button.addEventListener("click", () => showStudentProfile(button.dataset.viewStudent));
  });
  $$("[data-card-student]").forEach((button) => {
    button.addEventListener("click", () => showStudentCard(button.dataset.cardStudent));
  });
  $$("[data-print-student]").forEach((button) => {
    button.addEventListener("click", () => showStudentReceipt(button.dataset.printStudent));
  });
}

function filteredStudentRows() {
  const search = ($("#studentSearch")?.value || "").toLowerCase();
  const classId = $("#studentClassFilter")?.value || "";
  const status = $("#studentStatusFilter")?.value || "";
  return studentRows().filter((student) => {
    const text = `${student.id} ${student.khmerName} ${student.englishName} ${student.phone} ${student.parentName} ${student.fatherName} ${student.motherName}`.toLowerCase();
    return text.includes(search) && (!classId || student.classId === classId) && (!status || student.status === status);
  });
}

function studentRows() {
  return state.students.map((student) => ({
    ...student,
    age: ageFromDob(student.dob),
    birthPlace: formatLocation(student, "birth", "birthPlace"),
    address: formatLocation(student, "current", "address"),
    className: className(student.classId)
  }));
}

function splitStudentName(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    familyName: parts[0] || "",
    givenName: parts.slice(1).join(" ") || parts[0] || ""
  };
}

function formatDotDate(value) {
  const { day, month, year } = splitDate(value);
  return day && month && year ? `${day}.${month}.${year}` : "";
}

function renderStudentDetailRows(rows) {
  return rows.map((student, index) => {
    const name = splitStudentName(student.khmerName || student.englishName || "");
    const fatherPhone = student.fatherPhone || student.phone || "";
    const motherPhone = student.motherPhone || student.phone || "";
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${student.registrationNo || student.id}</td>
        <td>${name.familyName}</td>
        <td>${name.givenName}</td>
        <td>${label(student.gender)}</td>
        <td>${formatDotDate(student.dob)}</td>
        <td>${student.birthPlace || formatLocation(student, "birth", "birthPlace")}</td>
        <td>${student.fatherName || student.parentName || ""}</td>
        <td>${fatherPhone}</td>
        <td>${student.motherName || ""}</td>
        <td>${motherPhone}</td>
        <td>${student.address || formatLocation(student, "current", "address")}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="12">រកមិនឃើញទិន្នន័យ។</td></tr>`;
}

function classMatchesStudent(student, classNameValue) {
  if (!classNameValue) return true;
  const cls = getClass(student.classId);
  return classLevelName(student.classLevel) === classNameValue || classLevelName(cls?.name) === classNameValue;
}

function showStudentDetailTable(rows = studentRows()) {
  const detailRows = rows;
  const activeClass = "";
  const filteredRows = detailRows.filter((student) => classMatchesStudent(student, activeClass));
  openModal(`
    <section class="student-detail-sheet">
      <div class="panel-head">
        <div>
          <h2>តារាងលម្អិតសិស្ស</h2>
          <p class="muted" id="studentDetailCount">បង្ហាញ ${toKhmerDigits(filteredRows.length)} នាក់</p>
        </div>
        <div class="student-detail-class-tabs" id="studentDetailClassTabs">
          <button class="active" data-detail-class="">ទាំងអស់</button>
          ${gradeOrder.map((item) => `<button data-detail-class="${item}">${item}</button>`).join("")}
        </div>
      </div>
      <div class="student-detail-wrap">
        <table class="student-detail-table">
          <thead>
            <tr>
              <th>ល.រ</th>
              <th>អត្តលេខ</th>
              <th>នាមត្រកូល</th>
              <th>នាមខ្លួន</th>
              <th>ភេទ</th>
              <th>ថ្ងៃខែឆ្នាំកំណើត</th>
              <th>ទីកន្លែងកំណើត</th>
              <th>ឈ្មោះឪពុក</th>
              <th>លេខទូរស័ព្ទ</th>
              <th>ឈ្មោះម្តាយ</th>
              <th>លេខទូរស័ព្ទ</th>
              <th>ទីកន្លែងបច្ចុប្បន្ន</th>
            </tr>
	          </thead>
	          <tbody id="studentDetailBody">
	            ${renderStudentDetailRows(filteredRows)}
	          </tbody>
	        </table>
	      </div>
	    </section>
	  `);
  $$("[data-detail-class]").forEach((button) => {
    button.addEventListener("click", () => {
      const classNameValue = button.dataset.detailClass;
      const nextRows = detailRows.filter((student) => classMatchesStudent(student, classNameValue));
      $$("[data-detail-class]").forEach((item) => item.classList.toggle("active", item === button));
      $("#studentDetailCount").textContent = `បង្ហាញ ${toKhmerDigits(nextRows.length)} នាក់`;
      $("#studentDetailBody").innerHTML = renderStudentDetailRows(nextRows);
    });
  });
}

function detailField(title, value, className = "") {
  return `
    <div class="student-profile-field ${className}">
      <span>${title}</span>
      <strong>${value || "មិនទាន់មានទិន្នន័យ"}</strong>
    </div>
  `;
}

function compactRegistrationNo(value) {
  const trimmed = String(value || "").trim();
  return trimmed.replace(/^0+/, "") || trimmed;
}

function studentCardMarkup(student) {
  const cls = getClass(student.classId);
  const teacher = getTeacher(student.teacherId || cls?.teacherId);
  const name = splitStudentName(student.khmerName || student.englishName || "");
  const issueLines = formatCertificateIssueLines(today());
  const ministryLogo = "assets/certificate-logo.svg?v=20260807-24";
  const cardPhoto = student.photo?.startsWith("data:image") ? `<img src="${student.photo}" alt="រូបថតសិស្ស">` : "";
  const fatherPhone = student.fatherPhone || student.phone || "";
  const motherPhone = student.motherPhone || student.phone || "";
  const teacherPhone = teacher?.phone || state.settings.contact || "";
  return `
    <article class="student-card-page" data-card-name="${(student.registrationNo || student.id).replace(/[\\/:*?"<>|]/g, "-")}">
      <section class="student-card">
        <img class="student-card-watermark" src="${ministryLogo}" alt="">
	        <header class="student-card-head">
	          <img class="student-card-logo" src="${ministryLogo}" alt="និមិត្តសញ្ញាក្រសួងអប់រំ">
	          <div>
	            <p class="student-card-kingdom">ព្រះរាជាណាចក្រកម្ពុជា</p>
	            <p class="student-card-motto">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
	            <h2>ក្រសួងអប់រំយុវជន និងកីឡា</h2>
	            <h2>មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តត្បូងឃ្មុំ</h2>
	          </div>
	        </header>

        <div class="student-card-title">
          <h1>ប័ណ្ណសម្គាល់ខ្លួនសិស្ស</h1>
          <p>ឆ្នាំសិក្សា ${toKhmerDigits(student.academicYearName || activeYear()?.name || "")}</p>
        </div>

        <main class="student-card-body">
          <div class="student-card-line">
            <span>គោត្តនាម នាម៖ ${name.familyName} ${name.givenName}</span>
            <span>ភេទ៖ ${label(student.gender)}</span>
          </div>
          <div class="student-card-line">
            <span>ថ្ងៃខែឆ្នាំកំណើត៖ ${formatDotDate(student.dob) || "........"}</span>
            <span>ថ្នាក់ទី៖ ${label(student.classLevel) || student.className}</span>
          </div>
          <p>អាសយដ្ឋានបច្ចុប្បន្ន៖ ${student.address || "................................"}</p>
          <p>លេខទូរស័ព្ទអាណាព្យាបាល៖ ${student.phone || fatherPhone || motherPhone || "................................"}</p>

          <div class="student-card-lower">
            <div class="student-card-photo">
              <span>ID: ${compactRegistrationNo(student.registrationNo || student.id)}</span>
              ${cardPhoto}
            </div>
            <div class="student-card-family">
              <p>ឪពុក៖ ${student.fatherName || "...................."}</p>
              <p>លេខទូរស័ព្ទ៖ ${fatherPhone || "...................."}</p>
              <p>ម្តាយ៖ ${student.motherName || "...................."}</p>
              <p>លេខទូរស័ព្ទ៖ ${motherPhone || "...................."}</p>
              <div class="student-card-signature">
                <p>${issueLines.rowOne}</p>
                <p>${issueLines.rowTwo}</p>
                <strong>នាយិកា</strong>
              </div>
            </div>
          </div>

          <p class="student-card-teacher-phone">លេខទូរស័ព្ទគ្រូបន្ទុកថ្នាក់៖ ${teacherPhone || "...................."}</p>
        </main>
      </section>
    </article>
  `;
}

function renderStudentCardPages(rows) {
  return rows.map(studentCardMarkup).join("") || `<div class="empty-state">រកមិនឃើញសិស្សសម្រាប់បោះពុម្ពកាត។</div>`;
}

function showStudentCard(studentId) {
  const student = studentRows().find((item) => item.id === studentId);
  if (!student) return;
  showStudentCards([student], `កាតសិស្ស ${student.khmerName || student.id}`, false);
}

function showStudentCards(rows = studentRows(), title = "កាតសិស្ស", showClassTabs = true) {
  const cardRows = rows;
  const visibleRows = cardRows;
  openModal(`
    <div class="student-card-tools no-print">
      <div>
        <h2>${title}</h2>
        <p class="muted" id="studentCardCount">បង្ហាញ ${toKhmerDigits(visibleRows.length)} កាត</p>
      </div>
      ${showClassTabs ? `
        <div class="student-detail-class-tabs" id="studentCardClassTabs">
          <button class="active" data-card-class="">ទាំងអស់</button>
          ${gradeOrder.map((item) => `<button data-card-class="${item}">${item}</button>`).join("")}
        </div>
      ` : ""}
      <div class="page-actions">
        <button class="primary-btn" type="button" id="printStudentCardsBtn"><i data-lucide="printer"></i>បោះពុម្ព / PDF</button>
        <button class="ghost-btn" type="button" id="downloadStudentCardsImageBtn"><i data-lucide="image-down"></i>រក្សាទុក PNG</button>
      </div>
    </div>
    <div class="student-card-print-stack print-area" id="studentCardPrintStack" data-card-filename="${title.replace(/[\\/:*?"<>|]/g, "-")}">
      ${renderStudentCardPages(visibleRows)}
    </div>
  `);
  $("#printStudentCardsBtn").addEventListener("click", printStudentCardsAsImages);
  $("#downloadStudentCardsImageBtn").addEventListener("click", downloadStudentCardsImage);
  if (showClassTabs) {
    $$("[data-card-class]").forEach((button) => {
      button.addEventListener("click", () => {
        const classNameValue = button.dataset.cardClass;
        const nextRows = cardRows.filter((student) => classMatchesStudent(student, classNameValue));
        $$("[data-card-class]").forEach((item) => item.classList.toggle("active", item === button));
        $("#studentCardCount").textContent = `បង្ហាញ ${toKhmerDigits(nextRows.length)} កាត`;
        $("#studentCardPrintStack").innerHTML = renderStudentCardPages(nextRows);
      });
    });
  }
}

async function captureStudentCardPages() {
  const pages = $$(".student-card-page", $("#studentCardPrintStack"));
  if (!pages.length) return [];
  const originalScrollY = window.scrollY;
  window.scrollTo(0, 0);
  try {
    return await Promise.all(pages.map(async (page) => {
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      return canvas.toDataURL("image/png");
    }));
  } finally {
    window.scrollTo(0, originalScrollY);
  }
}

async function printStudentCardsAsImages() {
  const stack = $("#studentCardPrintStack");
  if (!stack) return;
  if (!window.html2canvas) {
    alert("មិនអាចបោះពុម្ពជារូបភាពបានទេ ព្រោះបណ្ណាល័យ html2canvas មិនទាន់បានផ្ទុក។");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("សូមអនុញ្ញាត pop-up ដើម្បីបោះពុម្ពកាតសិស្ស។");
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="km">
    <head>
      <meta charset="UTF-8">
      <title>${stack.dataset.cardFilename || "student-cards"}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body { display: grid; place-items: start center; }
        .loading { padding: 24px; font: 16px sans-serif; }
        .card-print-page {
          width: 210mm;
          height: 297mm;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          break-after: page;
          page-break-after: always;
        }
        .card-print-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
        .card-print-page img {
          width: 194mm;
          height: auto;
          max-height: 281mm;
          object-fit: contain;
          display: block;
        }
        @media print {
          html, body { width: 210mm; min-height: 297mm; }
          .loading { display: none; }
        }
      </style>
    </head>
    <body><div class="loading">កំពុងរៀបចំ PDF...</div></body>
    </html>
  `);
  printWindow.document.close();

  const button = $("#printStudentCardsBtn");
  const originalText = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader-2"></i>កំពុងរៀបចំ...`;
    refreshIcons();
  }

  try {
    const imageUrls = await captureStudentCardPages();
    const pagesMarkup = imageUrls.map((src) => `
      <section class="card-print-page">
        <img src="${src}" alt="student card">
      </section>
    `).join("");
    printWindow.document.body.innerHTML = pagesMarkup || `<div class="loading">មិនមានកាតសិស្សសម្រាប់បោះពុម្ពទេ។</div>`;
    const images = Array.from(printWindow.document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    })));
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    console.error(error);
    printWindow.close();
    alert("បោះពុម្ពជារូបភាពមិនបានទេ។ សូមព្យាយាមម្តងទៀត។");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
      refreshIcons();
    }
  }
}

async function downloadStudentCardsImage() {
  const stack = $("#studentCardPrintStack");
  if (!stack) return;
  if (!window.html2canvas) {
    alert("មិនអាចរក្សាទុករូបភាពបានទេ ព្រោះបណ្ណាល័យ html2canvas មិនទាន់បានផ្ទុក។");
    return;
  }
  const button = $("#downloadStudentCardsImageBtn");
  const originalText = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader-2"></i>កំពុងរក្សាទុក...`;
    refreshIcons();
  }
  try {
    const canvas = await html2canvas(stack, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: true
    });
    const link = document.createElement("a");
    link.download = `${stack.dataset.cardFilename || "student-cards"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error(error);
    alert("រក្សាទុករូបភាពមិនបានទេ។ សូមព្យាយាមម្តងទៀត។");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
      refreshIcons();
    }
  }
}

function showStudentProfile(studentId) {
  const student = studentRows().find((item) => item.id === studentId);
  if (!student) return;
  const cls = getClass(student.classId);
  const teacher = getTeacher(student.teacherId || cls?.teacherId);
  const name = splitStudentName(student.khmerName || student.englishName || "");
  openModal(`
    <section class="student-profile-sheet">
      <header class="student-profile-hero">
        <div class="student-profile-main">
          <img src="${student.photo || avatar(student.khmerName || student.id, 0)}" alt="រូបថតសិស្ស">
          <div>
            <span class="small-label">ប្រវត្តិសិស្ស</span>
            <h2>${student.khmerName || "មិនស្គាល់សិស្ស"}</h2>
            <div class="student-profile-tags">
              <span>${student.registrationNo || student.id}</span>
              <span>${label(student.gender)}</span>
              <span>${student.className}</span>
              <span>${badge(student.status)}</span>
            </div>
          </div>
        </div>
        <div class="page-actions">
          <button class="ghost-btn compact" id="profileReceiptBtn"><i data-lucide="printer"></i>បង្កាន់ដៃ</button>
          <button class="primary-btn compact" id="profileEditBtn"><i data-lucide="pencil"></i>កែប្រែ</button>
        </div>
      </header>

      <div class="student-profile-grid">
        <section class="student-profile-section">
          <h3>ព័ត៌មានផ្ទាល់ខ្លួន</h3>
          <div class="student-profile-fields">
            ${detailField("អត្តលេខ", student.registrationNo || student.id)}
            ${detailField("នាមត្រកូល", name.familyName)}
            ${detailField("នាមខ្លួន", name.givenName)}
            ${detailField("ភេទ", label(student.gender))}
            ${detailField("ថ្ងៃខែឆ្នាំកំណើត", formatDotDate(student.dob))}
            ${detailField("អាយុ", student.age ? `${toKhmerDigits(student.age)} ឆ្នាំ` : "")}
            ${detailField("លេខសំបុត្រកំណើត", student.birthCertificateNo)}
            ${detailField("ទីកន្លែងកំណើត", student.birthPlace, "wide")}
          </div>
        </section>

        <section class="student-profile-section">
          <h3>ការសិក្សា</h3>
          <div class="student-profile-fields">
            ${detailField("ឆ្នាំសិក្សា", toKhmerDigits(student.academicYearName || activeYear()?.name || ""))}
            ${detailField("ថ្នាក់", label(student.classLevel) || student.className)}
            ${detailField("បន្ទប់", cls?.room || "")}
            ${detailField("គ្រូទទួលបន្ទុក", teacher?.name || "")}
            ${detailField("ថ្ងៃចុះឈ្មោះ", formatDotDate(student.enrollmentDate))}
            ${detailField("អ្នកទទួលចុះឈ្មោះ", student.receivedBy)}
          </div>
        </section>

        <section class="student-profile-section">
          <h3>មាតាបិតា/អាណាព្យាបាល</h3>
          <div class="student-profile-fields">
            ${detailField("អាណាព្យាបាល", student.parentName)}
            ${detailField("ទំនាក់ទំនង", student.guardianRelation)}
            ${detailField("លេខទូរស័ព្ទ", student.phone)}
            ${detailField("ឈ្មោះឪពុក", student.fatherName)}
            ${detailField("លេខទូរស័ព្ទឪពុក", student.fatherPhone || student.phone)}
            ${detailField("មុខរបរឪពុក", student.fatherOccupation)}
            ${detailField("ឈ្មោះម្តាយ", student.motherName)}
            ${detailField("លេខទូរស័ព្ទម្តាយ", student.motherPhone || student.phone)}
            ${detailField("មុខរបរម្តាយ", student.motherOccupation)}
          </div>
        </section>

        <section class="student-profile-section">
          <h3>អាសយដ្ឋាន និងចំណាំ</h3>
          <div class="student-profile-fields">
            ${detailField("អាសយដ្ឋានបច្ចុប្បន្ន", student.address, "wide")}
            ${detailField("ចំណាំ", student.note, "wide")}
          </div>
        </section>
      </div>
    </section>
  `);
  $("#profileReceiptBtn").addEventListener("click", () => showStudentReceipt(student.id));
  $("#profileEditBtn").addEventListener("click", () => editStudent(student.id));
}

function editStudent(id) {
  const student = getStudent(id);
  openStudentModal(student);
}

function deleteStudent(id) {
  if (!confirm("តើអ្នកចង់លុបប្រវត្តិសិស្សនេះមែនទេ?")) return;
  state.students = state.students.filter((student) => student.id !== id);
  saveState(`បានលុបសិស្ស ${id}`);
}

function nextStudentId() {
  const year = activeYear()?.name.slice(0, 4) || new Date().getFullYear();
  const sequence = String(state.students.length + 1).padStart(3, "0");
  return `STD-${year}-${sequence}`;
}

function nextRegistrationNo() {
  const year = activeYear()?.name.slice(0, 4) || new Date().getFullYear();
  return `REG-${year}-${String(state.students.length + 1).padStart(3, "0")}`;
}

function showStudentReceipt(studentId, draftStudent = null) {
  const student = draftStudent || getStudent(studentId);
  if (!student) return;
  const cls = getClass(student.classId);
  const teacher = getTeacher(student.teacherId || cls?.teacherId);
  const receiptNo = student.registrationNo || nextRegistrationNo();
  openModal(`
    <div class="registration-receipts receipt-a4 print-area">
      ${registrationReceiptCopy(student, receiptNo, cls, teacher, "សម្រាប់សិស្ស")}
      ${registrationReceiptCopy(student, receiptNo, cls, teacher, "សម្រាប់គ្រូ")}
    </div>
    <div class="page-actions no-print" style="justify-content:center;margin-top:16px">
      <button class="primary-btn" onclick="window.print()"><i data-lucide="printer"></i>បោះពុម្ពបង្កាន់ដៃ</button>
    </div>
  `);
}

function registrationReceiptCopy(student, receiptNo, cls, teacher, copyLabel) {
  const dob = splitDate(student.dob);
  const enrolled = splitDate(student.enrollmentDate);
  const birthPlace = formatLocation(student, "birth", "birthPlace");
  const currentAddress = formatLocation(student, "current", "address");
  const field = (title, value, className = "") => `
    <span class="paper-field ${className}">
      <b>${title}</b>
      <em>${value || ""}</em>
    </span>
  `;
  const row = (...items) => `<div class="paper-form-row">${items.join("")}</div>`;
  return `
    <section class="registration-copy paper-receipt">
      <header class="paper-header">
        <div class="paper-copy-label">${copyLabel}</div>
        <p>ព្រះរាជាណាចក្រកម្ពុជា</p>
        <p>ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
        <div class="paper-stars">១ ២ ៣</div>
        <p class="paper-school">${state.settings.schoolName}</p>
        <h3>បង្កាន់ដៃចុះឈ្មោះចូលរៀន</h3>
      </header>
      <main class="paper-body">
        ${row(field("លេខចុះឈ្មោះ", receiptNo), field("អត្តលេខ", student.id), field("ឆ្នាំសិក្សា", student.academicYearName || activeYear()?.name))}
        <p class="paper-center-title">សូមបញ្ជាក់ថា</p>
        ${row(field("នាមនិងគោត្តនាមសិស្ស", student.khmerName, "wide"), field("ភេទ", label(student.gender)))}
        ${row(field("អក្សរឡាតាំង", student.englishName, "wide"), field("ថ្នាក់", cls ? label(cls.name) : className(student.classId)), field("កម្រិត", student.classLevel || "ទាប"))}
        ${row(field("កើតថ្ងៃទី", dob.day), field("ខែ", dob.month), field("ឆ្នាំ", dob.year), field("លេខសំបុត្រកំណើត", student.birthCertificateNo, "wide"))}
        ${row(field("ទីកន្លែងកំណើត", birthPlace, "full"))}
        ${row(field("ឈ្មោះឪពុក", student.fatherName, "wide"), field("មុខរបរ", student.fatherOccupation))}
        ${row(field("ឈ្មោះម្តាយ", student.motherName, "wide"), field("មុខរបរ", student.motherOccupation))}
        ${row(field("មាតាបិតា/អាណាព្យាបាល", student.parentName, "wide"), field("ត្រូវជា", label(student.guardianRelation)))}
        ${row(field("លេខទូរស័ព្ទ", student.phone), field("គ្រូទទួលបន្ទុក", teacher?.name, "wide"))}
        ${row(field("អាសយដ្ឋានបច្ចុប្បន្ន", currentAddress, "full"))}
        ${row(field("បានមកចុះឈ្មោះថ្ងៃទី", enrolled.day), field("ខែ", enrolled.month), field("ឆ្នាំ", enrolled.year))}
        <p class="paper-note-title">ចំណាំ</p>
        <p class="paper-note">បង្កាន់ដៃនេះប្រើសម្រាប់បញ្ជាក់ការចុះឈ្មោះសិស្សថ្មី។ សូមរក្សាទុកឯកសារនេះសម្រាប់យោងពេលចូលរៀន។ ${student.note || ""}</p>
      </main>
      <footer class="paper-footer">
        <div class="paper-sig">
          <span>ហត្ថលេខាមាតាបិតា/អាណាព្យាបាល</span>
          <strong></strong>
        </div>
        <div class="paper-issued">
          <p>ធ្វើនៅ ${state.settings.address || "................"} ថ្ងៃទី ${enrolled.day || "...."} ខែ ${enrolled.month || "...."} ឆ្នាំ ${enrolled.year || "...."}</p>
          <span>អ្នកទទួលចុះឈ្មោះ</span>
          <strong>${student.receivedBy || currentUser?.name || ""}</strong>
        </div>
      </footer>
    </section>
  `;
}

function splitDate(value) {
  if (!value || !value.includes("-")) return { day: "", month: "", year: "" };
  const [year, month, day] = value.split("-");
  return { day, month, year };
}

function khmerMonthName(month) {
  const monthNames = {
    "01": "មករា",
    "02": "កុម្ភៈ",
    "03": "មីនា",
    "04": "មេសា",
    "05": "ឧសភា",
    "06": "មិថុនា",
    "07": "កក្កដា",
    "08": "សីហា",
    "09": "កញ្ញា",
    "10": "តុលា",
    "11": "វិច្ឆិកា",
    "12": "ធ្នូ"
  };
  return monthNames[month] || month || "";
}

function formatCertificateDate(value) {
  const { day, month, year } = splitDate(value);
  if (!day || !month || !year) return "....-........-....";
  return `${day}-${khmerMonthName(month)}-${year}`;
}

function toKhmerDigits(value) {
  const digits = { 0: "០", 1: "១", 2: "២", 3: "៣", 4: "៤", 5: "៥", 6: "៦", 7: "៧", 8: "៨", 9: "៩" };
  return String(value).replace(/\d/g, (digit) => digits[digit]);
}

function khmerWeekdayName(value) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"][date.getDay()];
}

function formatCertificateIssueLines(value = today()) {
  const dateValue = value || today();
  const { day, month, year } = splitDate(dateValue);
  const displayDay = day ? toKhmerDigits(Number(day)) : "....";
  const displayMonth = khmerMonthName(month) || "........";
  const displayYear = year ? toKhmerDigits(year) : "....";
  const buddhistYear = year ? toKhmerDigits(Number(year) + 544) : "....";
  const weekday = khmerWeekdayName(dateValue) || "....";
  return {
    rowOne: `ធ្វើនៅ ខ្នងក្រពើ ថ្ងៃ${weekday} ១៥កើត ខែទុតិយាសាឍ`,
    rowTwo: `ឆ្នាំ មមី អដ្ឋស័ក ពុទ្ធសករាជ ${buddhistYear} ត្រូវនឹង ថ្ងៃទី${displayDay} ខែ${displayMonth} ឆ្នាំ ${displayYear}`
  };
}

function renderTeachers() {
  $("#view-teachers").innerHTML = `
    ${pageHead("គ្រប់គ្រងគ្រូបង្រៀន", "គ្រប់គ្រងប្រវត្តិគ្រូ និងការចាត់តាំងថ្នាក់។", `<button class="primary-btn" id="newTeacherBtn"><i data-lucide="user-plus"></i>បន្ថែមគ្រូ</button>`)}
    <div class="content-grid">
      <section class="panel form-card">${teacherForm()}</section>
      <section class="table-panel">
        ${simpleToolbar("teacherSearch", "ស្វែងរកគ្រូ")}
        <div class="table-wrap"><table id="teachersTable"></table></div>
      </section>
    </div>
  `;
  bindTeacherForm();
  renderTeacherRows();
}

function teacherForm(teacher = {}) {
  return `
    <div class="panel-head"><h3>${teacher.id ? "កែប្រែគ្រូ" : "បន្ថែមគ្រូ"}</h3><button class="ghost-btn compact" id="resetTeacherForm">សម្អាត</button></div>
    <form id="teacherForm" class="form-grid">
      <input type="hidden" name="id" value="${teacher.id || ""}">
      <label>ឈ្មោះ<input name="name" value="${teacher.name || ""}" required></label>
      <label>អ៊ីមែល<input name="email" type="email" value="${teacher.email || ""}" required></label>
      <label>លេខទូរស័ព្ទ<input name="phone" value="${teacher.phone || ""}" required></label>
      <label>គុណវុឌ្ឍិ<input name="qualification" value="${teacher.qualification || ""}"></label>
      <label>ថ្នាក់ដែលទទួលខុសត្រូវ<select name="assignedClassId">${classOptions("មិនទាន់ចាត់តាំង", teacher.assignedClassId)}</select></label>
      <label>ស្ថានភាព<select name="status">${options(["Active", "Inactive"], teacher.status || "Active")}</select></label>
      <button class="primary-btn full" type="submit"><i data-lucide="save"></i>រក្សាទុកគ្រូ</button>
    </form>
  `;
}

function bindTeacherForm() {
  $("#newTeacherBtn").addEventListener("click", renderTeachers);
  $("#resetTeacherForm").addEventListener("click", renderTeachers);
  $("#teacherSearch").addEventListener("input", renderTeacherRows);
  $("#teacherForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (data.id) {
      Object.assign(getTeacher(data.id), data);
      saveState(`បានកែប្រែគ្រូ ${data.name}`);
    } else {
      data.id = uid("TCH");
      state.teachers.unshift(data);
      saveState(`បានបន្ថែមគ្រូ ${data.name}`);
    }
  });
}

function renderTeacherRows() {
  const search = $("#teacherSearch").value.toLowerCase();
  const rows = state.teachers.filter((teacher) => `${teacher.name} ${teacher.phone} ${teacher.email}`.toLowerCase().includes(search))
    .map((teacher) => ({ ...teacher, className: className(teacher.assignedClassId) }));
  renderTable("teachersTable", rows, [
    ["ឈ្មោះ", "name"],
    ["ទំនាក់ទំនង", (row) => `${row.email}<p class="muted">${row.phone}</p>`],
    ["គុណវុឌ្ឍិ", "qualification"],
    ["ថ្នាក់", "className"],
    ["ស្ថានភាព", (row) => badge(row.status)],
    ["សកម្មភាព", (row) => actionButtons("teacher", row.id)]
  ]);
  bindRowActions("teacher", (id) => {
    $(".form-card").innerHTML = teacherForm(getTeacher(id));
    bindTeacherForm();
    refreshIcons();
  }, (id) => {
    if (!confirm("តើអ្នកចង់លុបគ្រូនេះមែនទេ?")) return;
    state.teachers = state.teachers.filter((teacher) => teacher.id !== id);
    saveState(`បានលុបគ្រូ ${id}`);
  });
}

function renderClasses() {
  $("#view-classes").innerHTML = `
    ${pageHead("គ្រប់គ្រងថ្នាក់រៀន", "បង្កើតថ្នាក់ ចាត់តាំងគ្រូ និងមើលបញ្ជីសិស្ស។")}
    <div class="content-grid">
      <section class="panel form-card">${classForm()}</section>
      <section class="table-panel">
        <div class="table-wrap"><table id="classesTable"></table></div>
      </section>
    </div>
  `;
  bindClassForm();
  renderClassRows();
}

function classForm(item = {}) {
  return `
    <div class="panel-head"><h3>${item.id ? "កែប្រែថ្នាក់" : "បង្កើតថ្នាក់"}</h3><button class="ghost-btn compact" id="resetClassForm">សម្អាត</button></div>
    <form id="classForm" class="form-grid">
      <input type="hidden" name="id" value="${item.id || ""}">
      <label>ឈ្មោះថ្នាក់<select name="name">${options(["ទាប", "មធ្យម", "ខ្ពស់(ក)", "ខ្ពស់(ខ)"], normalizeClassName(item.name) || "ទាប")}</select></label>
      <label>គ្រូ<select name="teacherId">${teacherOptions("មិនទាន់ចាត់តាំង", item.teacherId)}</select></label>
      <label>បន្ទប់<input name="room" value="${item.room || ""}" required></label>
      <label>សមត្ថភាព<input name="capacity" type="number" min="1" value="${item.capacity || 24}" required></label>
      <button class="primary-btn full" type="submit"><i data-lucide="save"></i>រក្សាទុកថ្នាក់</button>
    </form>
  `;
}

function bindClassForm() {
  $("#resetClassForm").addEventListener("click", renderClasses);
  $("#classForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.capacity = Number(data.capacity);
    data.level = classLevelIndex(data.name);
    if (data.id) {
      Object.assign(getClass(data.id), data);
      saveState(`បានកែប្រែថ្នាក់ ${label(data.name)}`);
    } else {
      data.id = uid("CLS");
      state.classes.push(data);
      saveState(`បានបង្កើតថ្នាក់ ${label(data.name)}`);
    }
  });
}

function renderClassRows() {
  const rows = state.classes.map((item) => ({
    ...item,
    displayName: label(item.name),
    teacherName: getTeacher(item.teacherId)?.name || "មិនទាន់ចាត់តាំង",
    enrolled: state.students.filter((student) => student.classId === item.id && student.status === "Active").length
  }));
  renderTable("classesTable", rows, [
    ["ថ្នាក់", "displayName"],
    ["គ្រូ", "teacherName"],
    ["បន្ទប់", "room"],
    ["សមត្ថភាព", (row) => `${row.enrolled}/${row.capacity}`],
    ["សិស្ស", (row) => `<button class="ghost-btn compact" data-class-list="${row.id}"><i data-lucide="list"></i>មើល</button>`],
    ["សកម្មភាព", (row) => actionButtons("class", row.id)]
  ]);
  bindRowActions("class", (id) => {
    $(".form-card").innerHTML = classForm(getClass(id));
    bindClassForm();
    refreshIcons();
  }, (id) => {
    if (!confirm("តើអ្នកចង់លុបថ្នាក់នេះមែនទេ? សិស្សនឹងត្រូវបានដាក់ជា មិនទាន់កំណត់ថ្នាក់។")) return;
    state.students.forEach((student) => {
      if (student.classId === id) student.classId = "";
    });
    state.classes = state.classes.filter((item) => item.id !== id);
    saveState(`បានលុបថ្នាក់ ${id}`);
  });
  $$("[data-class-list]").forEach((button) => {
    button.addEventListener("click", () => showClassList(button.dataset.classList));
  });
}

function showClassList(classId) {
  const item = getClass(classId);
  const students = state.students.filter((student) => student.classId === classId);
  openModal(`
    <h2>បញ្ជីសិស្សថ្នាក់ ${label(item.name)}</h2>
    <p class="muted">មានសិស្សចុះឈ្មោះ ${students.length} នាក់។</p>
    <div class="table-wrap"><table>
      <thead><tr><th>លេខសម្គាល់</th><th>ឈ្មោះ</th><th>ភេទ</th><th>អាយុ</th><th>ស្ថានភាព</th></tr></thead>
      <tbody>${students.map((student) => `<tr><td>${student.id}</td><td>${student.englishName}</td><td>${label(student.gender)}</td><td>${ageFromDob(student.dob)}</td><td>${badge(student.status)}</td></tr>`).join("")}</tbody>
    </table></div>
  `);
}

function renderPromotion() {
  const rows = state.students.filter((student) => student.status === "Active").map((student) => ({
    ...student,
    className: className(student.classId),
    nextLevel: nextLevel(student)
  }));
  $("#view-promotion").innerHTML = `
    ${pageHead("ការឡើងថ្នាក់សិស្ស", "ឡើងថ្នាក់ពី ទាប ទៅ មធ្យម និង ខ្ពស់ ហើយបញ្ចប់សិក្សាពីថ្នាក់ខ្ពស់។", `
      <button class="primary-btn" id="runPromotionBtn"><i data-lucide="move-up-right"></i>ដំណើរការឡើងថ្នាក់ប្រចាំឆ្នាំ</button>
    `)}
    <section class="table-panel">
      <div class="table-wrap"><table id="promotionTable"></table></div>
    </section>
  `;
  renderTable("promotionTable", rows, [
    ["សិស្ស", "englishName"],
    ["ថ្នាក់បច្ចុប្បន្ន", "className"],
    ["ស្ថានភាពបន្ទាប់", "nextLevel"],
    ["សកម្មភាព", (row) => `<button class="ghost-btn compact" data-promote="${row.id}"><i data-lucide="arrow-up"></i>ឡើងថ្នាក់</button>`]
  ]);
  $("#runPromotionBtn").addEventListener("click", runPromotion);
  $$("[data-promote]").forEach((button) => button.addEventListener("click", () => promoteStudent(button.dataset.promote)));
}

function nextLevel(student) {
  const cls = getClass(student.classId);
  if (!cls) return "ត្រូវចាត់តាំងថ្នាក់";
  return cls.level >= gradeOrder.length - 1 ? "បានបញ្ចប់ និងអាចចូលថ្នាក់ទី ១" : label(gradeOrder[cls.level + 1]);
}

function promoteStudent(id) {
  const student = getStudent(id);
  const cls = getClass(student.classId);
  if (!cls) return;
  if (cls.level >= gradeOrder.length - 1) {
    student.status = "Graduated";
    ensureCertificate(student);
  } else {
    const nextClass = state.classes.find((item) => item.level === cls.level + 1);
    if (nextClass) student.classId = nextClass.id;
  }
  saveState(`បានឡើងថ្នាក់សិស្ស ${student.englishName}`);
}

function runPromotion() {
  if (!confirm("តើអ្នកចង់ដំណើរការឡើងថ្នាក់ប្រចាំឆ្នាំសម្រាប់សិស្សសកម្មទាំងអស់មែនទេ?")) return;
  state.students.filter((student) => student.status === "Active").forEach((student) => promoteStudent(student.id));
  saveState("បានបញ្ចប់ការឡើងថ្នាក់ប្រចាំឆ្នាំ");
}

function ensureCertificate(student) {
  if (state.certificates.some((cert) => cert.studentId === student.id)) return;
  state.certificates.push({
    id: nextCertificateId(),
    studentId: student.id,
    academicYearId: activeYear()?.id || "",
    issueDate: today(),
    verificationCode: uid("VERIFY")
  });
}

function renderCertificates() {
  const graduates = state.students.filter((student) => student.status === "Graduated");
  $("#view-certificates").innerHTML = `
    ${pageHead("គ្រប់គ្រងវិញ្ញាបនបត្រ", "បង្កើត មើលជាមុន ទាញយក និងបោះពុម្ពវិញ្ញាបនបត្របញ្ចប់ការសិក្សា។", `
      <button class="primary-btn" id="generateCertificatesBtn"><i data-lucide="award"></i>បង្កើតសម្រាប់សិស្សបញ្ចប់</button>
      <button class="ghost-btn" id="printCertificatesBtn"><i data-lucide="printer"></i>បោះពុម្ពទាំងអស់ / តាមថ្នាក់</button>
    `)}
    <section class="table-panel">
      <div class="table-wrap"><table id="certificatesTable"></table></div>
    </section>
  `;
  $("#generateCertificatesBtn").addEventListener("click", () => {
    graduates.forEach(ensureCertificate);
    saveState("បានបង្កើតវិញ្ញាបនបត្របញ្ចប់ការសិក្សា");
  });
  $("#printCertificatesBtn").addEventListener("click", () => showCertificateBatch(studentRows(), "វិញ្ញាបនបត្រសិស្សទាំងអស់"));
  renderCertificateRows();
}

function certificateRows() {
  return state.certificates.map((cert) => ({
    ...cert,
    studentName: getStudent(cert.studentId)?.englishName || "មិនស្គាល់",
    academicYear: state.academicYears.find((year) => year.id === cert.academicYearId)?.name || activeYear()?.name
  }));
}

function renderCertificateRows() {
  renderTable("certificatesTable", certificateRows(), [
    ["លេខវិញ្ញាបនបត្រ", "id"],
    ["សិស្ស", "studentName"],
    ["ឆ្នាំសិក្សា", "academicYear"],
    ["ថ្ងៃចេញ", "issueDate"],
    ["ផ្ទៀងផ្ទាត់", "verificationCode"],
    ["សកម្មភាព", (row) => `<button class="ghost-btn compact" data-cert="${row.id}"><i data-lucide="eye"></i>មើលជាមុន</button>`]
  ]);
  $$("[data-cert]").forEach((button) => button.addEventListener("click", () => showCertificate(button.dataset.cert)));
}

function nextCertificateId() {
  const year = new Date().getFullYear();
  return `CERT-${year}-${String(state.certificates.length + 1).padStart(3, "0")}`;
}

function certificateForStudent(student) {
  const existing = state.certificates.find((cert) => cert.studentId === student.id);
  return existing || {
    id: `CERT-${student.registrationNo || student.id}`,
    studentId: student.id,
    academicYearId: activeYear()?.id || "",
    issueDate: today(),
    verificationCode: uid("VERIFY")
  };
}

function certificateMarkup(cert, student, printArea = false) {
  const dob = splitDate(student?.dob);
  const issueLines = formatCertificateIssueLines(today());
  const academicYear = state.academicYears.find((year) => year.id === cert.academicYearId)?.name || activeYear()?.name || "";
  const localizedAcademicYear = toKhmerDigits(academicYear);
  const studentName = student?.khmerName || student?.englishName || "មិនស្គាល់សិស្ស";
  const studentPhoto = student?.photo?.startsWith("data:image") ? student.photo : "";
  const certificateFilename = `${cert.id}-${studentName}`.replace(/[\\/:*?"<>|]/g, "-");
  const ministryLogo = "assets/certificate-logo.svg?v=20260807-24";
  return `
    <div class="certificate certificate-landscape${printArea ? " print-area" : ""}" data-certificate-filename="${certificateFilename}">
      <div class="cert-border">
        <div class="cert-watermark">
          <img src="${ministryLogo}" alt="និមិត្តសញ្ញាក្រសួងអប់រំ">
        </div>
        <header class="cert-top">
          <div class="cert-school-block">
            <div class="cert-emblem"><img src="${ministryLogo}" alt="និមិត្តសញ្ញាក្រសួងអប់រំ"></div>
            <p>ក្រសួងអប់រំ យុវជន និងកីឡាស្រុកមេមត់</p>
            <p>សាលាមត្តេយ្យសិក្សាខ្នងក្រពើ</p>
            <p class="cert-ref">លេខៈ ........ /មត.ខ.ព</p>
          </div>
          <div class="cert-kingdom">
            <p>ព្រះរាជាណាចក្រកម្ពុជា</p>
            <p>ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
            <img class="cert-scroll-symbol" src="assets/symbol.png" alt="">
          </div>
        </header>
        <main class="cert-content">
          <h2>វិញ្ញាបនបត្រមត្តេយ្យសិក្សា</h2>
          <h3>បានបញ្ចប់ការសិក្សាមត្តេយ្យថ្នាក់ខ្ពស់</h3>
          <p class="cert-intro">បានបញ្ជាក់ថា</p>
          <div class="cert-student-line cert-name-row">
            <span>បញ្ជាក់ថា</span>
            <strong class="cert-student-name">${studentName}</strong>
            <span>ភេទ</span>
            <strong>${label(student?.gender)}</strong>
          </div>
          <div class="cert-student-line cert-date-row">
            <span>កើតថ្ងៃទី</span>
            <strong>${dob.day ? toKhmerDigits(dob.day) : "...."}</strong>
            <span>ខែ</span>
            <strong>${khmerMonthName(dob.month) || "...."}</strong>
            <span>ឆ្នាំ</span>
            <strong>${dob.year ? toKhmerDigits(dob.year) : "...."}</strong>
            <span>ឆ្នាំសិក្សា</span>
            <strong>${localizedAcademicYear}</strong>
          </div>
          <p class="cert-body-text">បានអនុញ្ញាតឱ្យបន្តការសិក្សាចូលរៀនថ្នាក់បឋមសិក្សា<br>សម្រាប់ប្រើប្រាស់ទីការបន្តរៀននេះ ដើម្បីប្រកបដោយភាពជោគជ័យ។</p>
        </main>
        <footer class="cert-footer">
          <div></div>
          <div class="cert-signature-row">
            <div class="cert-photo-box">${studentPhoto ? `<img src="${studentPhoto}" alt="រូបថតសិស្ស">` : "4x6"}</div>
            <div class="cert-issue">
              <div class="cert-issue-date">
                <p>${issueLines.rowOne}</p>
                <p>${issueLines.rowTwo}</p>
              </div>
              <span>នាយិកាសាលា</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  `;
}

function showCertificate(id) {
  const cert = state.certificates.find((item) => item.id === id);
  if (!cert) return;
  const student = getStudent(cert.studentId);
  openModal(`
    ${certificateMarkup(cert, student, true)}
    <div class="page-actions no-print" style="justify-content:center;margin-top:16px">
      <button class="primary-btn" type="button" id="downloadCertPdfBtn"><i data-lucide="file-down"></i>រក្សាទុក PDF</button>
      <button class="ghost-btn" type="button" id="downloadCertImageBtn"><i data-lucide="image-down"></i>រក្សាទុករូបភាព PNG</button>
    </div>
  `);
  $("#downloadCertPdfBtn").addEventListener("click", printCertificatesAsImages);
  $("#downloadCertImageBtn").addEventListener("click", downloadCertificateImage);
}

function renderCertificateBatchPages(rows) {
  return rows.map((student) => `
    <section class="certificate-print-item">
      ${certificateMarkup(certificateForStudent(student), student)}
    </section>
  `).join("");
}

function showCertificateBatch(rows = studentRows(), title = "វិញ្ញាបនបត្រ") {
  const allRows = rows;
  openModal(`
    <div class="student-card-tools no-print">
      <div>
        <h2>${title}</h2>
        <p class="muted" id="certificateBatchCount">បង្ហាញ ${toKhmerDigits(allRows.length)} សន្លឹក</p>
      </div>
      <div class="student-detail-class-tabs" id="certificateClassTabs">
        <button class="active" data-certificate-class="">ទាំងអស់</button>
        ${gradeOrder.map((item) => `<button data-certificate-class="${item}">${item}</button>`).join("")}
      </div>
      <div class="page-actions">
        <button class="primary-btn" type="button" id="printCertificateBatchBtn"><i data-lucide="printer"></i>បោះពុម្ព / PDF</button>
      </div>
    </div>
    <div class="certificate-print-stack print-area" id="certificatePrintStack" data-certificate-filename="${title.replace(/[\\/:*?"<>|]/g, "-")}">
      ${renderCertificateBatchPages(allRows)}
    </div>
  `);
  $("#printCertificateBatchBtn").addEventListener("click", printCertificatesAsImages);
  $$("[data-certificate-class]").forEach((button) => {
    button.addEventListener("click", () => {
      const classNameValue = button.dataset.certificateClass;
      const nextRows = allRows.filter((student) => classMatchesStudent(student, classNameValue));
      $$("[data-certificate-class]").forEach((item) => item.classList.toggle("active", item === button));
      $("#certificateBatchCount").textContent = `បង្ហាញ ${toKhmerDigits(nextRows.length)} សន្លឹក`;
      $("#certificatePrintStack").innerHTML = renderCertificateBatchPages(nextRows);
    });
  });
}

async function captureCertificatePages() {
  const certificates = $$(".certificate-print-stack .certificate-landscape");
  const pages = certificates.length ? certificates : $$(".certificate-landscape");
  if (!pages.length) return [];
  const originalScrollY = window.scrollY;
  window.scrollTo(0, 0);
  try {
    return await Promise.all(pages.map(async (page) => {
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        allowTaint: false,
        logging: false
      });
      return canvas.toDataURL("image/png");
    }));
  } finally {
    window.scrollTo(0, originalScrollY);
  }
}

async function printCertificatesAsImages() {
  const stack = $("#certificatePrintStack") || $(".certificate-landscape");
  if (!stack) return;
  if (!window.html2canvas) {
    alert("មិនអាចបោះពុម្ពជា PDF បានទេ ព្រោះបណ្ណាល័យ html2canvas មិនទាន់បានផ្ទុក។");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("សូមអនុញ្ញាត pop-up ដើម្បីបោះពុម្ពវិញ្ញាបនបត្រ។");
    return;
  }
  const filename = stack.dataset.certificateFilename || "certificates";
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="km">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        @page { size: A4 landscape; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body { display: grid; place-items: start center; }
        .loading { padding: 24px; font: 16px sans-serif; }
        .certificate-print-page {
          width: 297mm;
          height: 210mm;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          break-after: page;
          page-break-after: always;
        }
        .certificate-print-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
        .certificate-print-page img {
          width: 281mm;
          max-height: 194mm;
          object-fit: contain;
          display: block;
        }
        @media print {
          html, body { width: 297mm; min-height: 210mm; }
          .loading { display: none; }
        }
      </style>
    </head>
    <body><div class="loading">កំពុងរៀបចំ PDF...</div></body>
    </html>
  `);
  printWindow.document.close();

  const button = $("#printCertificateBatchBtn") || $("#downloadCertPdfBtn");
  const originalText = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader-2"></i>កំពុងរៀបចំ...`;
    refreshIcons();
  }

  try {
    const imageUrls = await captureCertificatePages();
    const pagesMarkup = imageUrls.map((src) => `
      <section class="certificate-print-page">
        <img src="${src}" alt="certificate">
      </section>
    `).join("");
    printWindow.document.body.innerHTML = pagesMarkup || `<div class="loading">មិនមានវិញ្ញាបនបត្រសម្រាប់បោះពុម្ពទេ។</div>`;
    const images = Array.from(printWindow.document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    })));
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    console.error(error);
    printWindow.close();
    alert("បោះពុម្ពវិញ្ញាបនបត្រមិនបានទេ។ សូមព្យាយាមម្តងទៀត។");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
      refreshIcons();
    }
  }
}

function qrPattern(text) {
  return Array.from({ length: 81 }, (_, index) => {
    const code = text.charCodeAt(index % text.length);
    return ((code + index * 7) % 3 !== 0 || [0, 1, 7, 8, 9, 17, 63, 71, 72, 73, 79, 80].includes(index)) ? "<span></span>" : "<em></em>";
  }).join("");
}

async function downloadCertificateImage() {
  const certificate = $(".certificate-landscape");
  if (!certificate) return;
  if (!window.html2canvas) {
    alert("មិនអាចរក្សាទុករូបភាពបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយ refresh ម្តងទៀត។");
    return;
  }

  const button = $("#downloadCertImageBtn");
  const originalLabel = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader-circle"></i>កំពុងរក្សាទុក...`;
    refreshIcons();
  }

  try {
    const canvas = await html2canvas(certificate, {
      backgroundColor: "#ffffff",
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: false,
      logging: false
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${certificate.dataset.certificateFilename || "certificate"}.png`;
    link.click();
  } catch (error) {
    console.error(error);
    alert("រក្សាទុករូបភាពមិនបានទេ។ សូមព្យាយាមម្តងទៀត។");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalLabel;
      refreshIcons();
    }
  }
}

function renderReports() {
  const reports = [
    ["របាយការណ៍សិស្ស", "students_report.csv", studentRows(), ["id", "englishName", "gender", "age", "className", "status"]],
    ["របាយការណ៍ឡើងថ្នាក់", "promotion_report.csv", state.students.map((student) => ({ id: student.id, name: student.englishName, class: className(student.classId), next: nextLevel(student), status: label(student.status) })), ["id", "name", "class", "next", "status"]],
    ["របាយការណ៍បញ្ចប់ការសិក្សា", "graduation_report.csv", certificateRows(), ["id", "studentName", "academicYear", "issueDate", "verificationCode"]]
  ];
  $("#view-reports").innerHTML = `
    ${pageHead("របាយការណ៍", "នាំចេញរបាយការណ៍សិស្ស ការឡើងថ្នាក់ និងការបញ្ចប់សិក្សាជា CSV ឬបោះពុម្ពជា PDF។")}
    <div class="report-grid">
      ${reports.map(([title, filename, rows, columns]) => `
        <section class="panel">
          <div class="panel-head">
            <div><h3>${title}</h3><p class="muted">មានទិន្នន័យ ${rows.length} ជួរ</p></div>
            <span class="badge">${rows.length}</span>
          </div>
          <div class="page-actions">
            <button class="primary-btn" data-export="${filename}"><i data-lucide="file-spreadsheet"></i>Excel</button>
            <button class="ghost-btn" data-print-report="${title}"><i data-lucide="file-text"></i>PDF</button>
          </div>
        </section>
      `).join("")}
    </div>
  `;
  $$("[data-export]").forEach((button, index) => {
    button.addEventListener("click", () => exportRows(reports[index][1], reports[index][2], reports[index][3]));
  });
  $$("[data-print-report]").forEach((button) => button.addEventListener("click", () => window.print()));
}

function renderUsers() {
  $("#view-users").innerHTML = `
    ${pageHead("គ្រប់គ្រងអ្នកប្រើ", "គ្រប់គ្រងគណនីចូលប្រើ តួនាទី និងស្ថានភាព។")}
    <div class="content-grid">
      <section class="panel form-card">
        <div class="panel-head"><h3>បង្កើតអ្នកប្រើ</h3></div>
        <form id="userForm" class="form-grid">
          <label>ឈ្មោះ<input name="name" required></label>
          <label>ឈ្មោះអ្នកប្រើ<input name="username" required></label>
          <label>ពាក្យសម្ងាត់<input name="password" type="password" value="password" required></label>
          <label>តួនាទី<select name="role">${options(["Administrator", "Staff", "Teacher"], "Staff")}</select></label>
          <label>ស្ថានភាព<select name="status">${options(["Active", "Inactive"], "Active")}</select></label>
          <button class="primary-btn full" type="submit"><i data-lucide="shield-check"></i>រក្សាទុកអ្នកប្រើ</button>
        </form>
      </section>
      <section class="table-panel"><div class="table-wrap"><table id="usersTable"></table></div></section>
    </div>
  `;
  $("#userForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.id = uid("USR");
    state.users.push(data);
    saveState(`បានបង្កើតអ្នកប្រើ ${data.username}`);
  });
  renderTable("usersTable", state.users, [
    ["ឈ្មោះ", "name"],
    ["ឈ្មោះអ្នកប្រើ", "username"],
    ["តួនាទី", (row) => badge(row.role)],
    ["ស្ថានភាព", (row) => badge(row.status)],
    ["សកម្មភាព", (row) => row.id === currentUser.id ? `<span class="muted">អ្នកប្រើបច្ចុប្បន្ន</span>` : `<button class="danger-btn compact" data-delete-user="${row.id}"><i data-lucide="trash-2"></i>លុប</button>`]
  ]);
  $$("[data-delete-user]").forEach((button) => button.addEventListener("click", () => {
    if (!confirm("តើអ្នកចង់លុបអ្នកប្រើនេះមែនទេ?")) return;
    state.users = state.users.filter((user) => user.id !== button.dataset.deleteUser);
    saveState("បានលុបគណនីអ្នកប្រើ");
  }));
}

function renderAcademic() {
  $("#view-academic").innerHTML = `
    ${pageHead("គ្រប់គ្រងឆ្នាំសិក្សា", "បង្កើតឆ្នាំសិក្សា និងជ្រើសឆ្នាំសិក្សាសកម្ម។")}
    <div class="content-grid">
      <section class="panel form-card">
        <div class="panel-head"><h3>បង្កើតឆ្នាំសិក្សា</h3></div>
        <form id="yearForm" class="form-grid">
          <label>ឈ្មោះ<input name="name" placeholder="2027-2028" required></label>
          <label>ថ្ងៃចាប់ផ្តើម<input name="startsAt" type="date" required></label>
          <label>ថ្ងៃបញ្ចប់<input name="endsAt" type="date" required></label>
          <button class="primary-btn full" type="submit"><i data-lucide="calendar-plus"></i>រក្សាទុកឆ្នាំសិក្សា</button>
        </form>
      </section>
      <section class="table-panel"><div class="table-wrap"><table id="yearsTable"></table></div></section>
    </div>
  `;
  $("#yearForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.id = uid("AY");
    data.status = "Inactive";
    state.academicYears.push(data);
    saveState(`បានបង្កើតឆ្នាំសិក្សា ${data.name}`);
  });
  renderTable("yearsTable", state.academicYears, [
    ["ឈ្មោះ", "name"],
    ["ចាប់ផ្តើម", "startsAt"],
    ["បញ្ចប់", "endsAt"],
    ["ស្ថានភាព", (row) => badge(row.status)],
    ["សកម្មភាព", (row) => row.status === "Active" ? `<span class="muted">សកម្ម</span>` : `<button class="ghost-btn compact" data-set-year="${row.id}"><i data-lucide="check"></i>កំណត់សកម្ម</button>`]
  ]);
  $$("[data-set-year]").forEach((button) => button.addEventListener("click", () => {
    state.academicYears.forEach((year) => year.status = year.id === button.dataset.setYear ? "Active" : "Inactive");
    saveState("បានកំណត់ឆ្នាំសិក្សាសកម្ម");
  }));
}

function renderSettings() {
  $("#view-settings").innerHTML = `
    ${pageHead("ការកំណត់សាលា", "កែប្រែព័ត៌មានសាលា ព្រឹត្តិការណ៍ ការបម្រុងទុក និងកំណត់ហេតុសកម្មភាព។")}
    <div class="settings-grid">
      <section class="panel">
        <div class="panel-head"><h3>ព័ត៌មានសាលា</h3></div>
        <form id="settingsForm" class="form-grid">
          <label>ឈ្មោះសាលា<input name="schoolName" value="${state.settings.schoolName}" required></label>
          <label>ឈ្មោះខ្លី<input name="shortName" value="${state.settings.shortName}" required></label>
          <label>អាសយដ្ឋាន<input name="address" value="${state.settings.address}"></label>
          <label>ទំនាក់ទំនង<input name="contact" value="${state.settings.contact}"></label>
          <label>អ៊ីមែល<input name="email" value="${state.settings.email}"></label>
          <label>នាយិកា<input name="principal" value="${state.settings.principal}"></label>
          <label>អក្សរឡូហ្គោ<input name="logoText" value="${state.settings.logoText}"></label>
          <button class="primary-btn full" type="submit"><i data-lucide="save"></i>រក្សាទុកការកំណត់</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>បម្រុងទុក និងស្តារឡើងវិញ</h3></div>
        <div class="page-actions">
          <button class="primary-btn" id="backupBtn"><i data-lucide="database-backup"></i>បង្កើតបម្រុងទុក</button>
          <button class="ghost-btn" id="downloadBackupBtn"><i data-lucide="download"></i>ទាញយក JSON</button>
          <button class="danger-btn" id="resetDemoBtn"><i data-lucide="rotate-ccw"></i>កំណត់ទិន្នន័យសាកល្បងឡើងវិញ</button>
        </div>
        <p class="muted" style="margin-top:12px">មានបម្រុងទុកក្នុងម៉ាស៊ីន ${state.backups.length} ច្បាប់។</p>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>ប្រតិទិនសាលា</h3></div>
        <form id="eventForm" class="form-grid two">
          <label>ចំណងជើង<input name="title" required></label>
          <label>កាលបរិច្ឆេទ<input name="date" type="date" required></label>
          <label>ប្រភេទ<select name="type">${options(["Event", "Holiday", "Announcement"], "Event")}</select></label>
          <button class="primary-btn" type="submit"><i data-lucide="calendar-plus"></i>បន្ថែម</button>
        </form>
        <div class="calendar-grid" style="margin-top:16px">${state.events.map((event) => `<div class="calendar-card"><strong>${event.date.slice(8)}</strong><span>${event.title}</span><p class="muted">${label(event.type)}</p></div>`).join("")}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>រំលឹកថ្ងៃកំណើត</h3></div>
        <div class="summary-list">
          ${birthdayRows().map((student) => `<div class="summary-tile"><span>${student.englishName}</span><strong>${student.dob.slice(5)}</strong></div>`).join("") || `<p class="muted">មិនមានថ្ងៃកំណើតជិតមកដល់។</p>`}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>កំណត់ហេតុសកម្មភាព</h3></div>
        <ul class="activity-log">${state.activityLogs.slice(0, 10).map((log) => `<li><strong>${log.action}</strong><p class="muted">${new Date(log.at).toLocaleString()} ដោយ ${log.user}</p></li>`).join("")}</ul>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>ការជូនដំណឹង</h3><span class="badge red">${state.events.length}</span></div>
        <div class="summary-list">${state.events.map((event) => `<div class="summary-tile"><span>${event.title}</span><strong>${event.date}</strong></div>`).join("")}</div>
      </section>
    </div>
  `;
  $("#settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings = Object.fromEntries(new FormData(event.currentTarget).entries());
    saveState("បានកែប្រែការកំណត់សាលា");
    renderShell();
  });
  $("#eventForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    data.id = uid("EVT");
    state.events.push(data);
    saveState(`បានបន្ថែមប្រតិទិន ${data.title}`);
  });
  $("#backupBtn").addEventListener("click", () => {
    state.backups.unshift({ id: uid("BKP"), at: new Date().toISOString(), data: JSON.stringify(state) });
    saveState("បានបង្កើតបម្រុងទុកក្នុងម៉ាស៊ីន");
  });
  $("#downloadBackupBtn").addEventListener("click", () => download("kms-backup.json", JSON.stringify(state, null, 2), "application/json"));
  $("#resetDemoBtn").addEventListener("click", () => {
    if (!confirm("តើអ្នកចង់កំណត់ទិន្នន័យសាកល្បងទាំងអស់ឡើងវិញមែនទេ?")) return;
    state = seedState();
    saveState("បានកំណត់ទិន្នន័យសាកល្បងឡើងវិញ");
  });
}

function birthdayRows() {
  const now = new Date();
  return state.students.filter((student) => {
    const dob = new Date(student.dob);
    const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    const days = Math.ceil((next - now) / 86400000);
    return days <= 45;
  }).slice(0, 6);
}

function tableToolbar(searchId, searchLabel, classFilterId, classOptionsHtml, statusFilterId, statuses) {
  return `
    <div class="table-toolbar">
      <div class="toolbar">
        <input id="${searchId}" type="search" placeholder="${searchLabel}">
        <select id="${classFilterId}">${classOptionsHtml}</select>
        <select id="${statusFilterId}">${statusOptions(statuses)}</select>
      </div>
    </div>
  `;
}

function simpleToolbar(searchId, searchLabel) {
  return `<div class="table-toolbar"><input id="${searchId}" type="search" placeholder="${searchLabel}"></div>`;
}

function renderTable(tableId, rows, columns) {
  const table = $(`#${tableId}`);
  const key = tableState[`${tableId}SortKey`] || 0;
  const direction = tableState[`${tableId}SortDirection`] || "asc";
  const sorted = [...rows].sort((a, b) => String(valueForSort(a, columns[key])).localeCompare(String(valueForSort(b, columns[key]))) * (direction === "asc" ? 1 : -1));
  const pageSize = 10;
  const page = Math.min(tableState[`${tableId}Page`] || 1, Math.max(1, Math.ceil(sorted.length / pageSize)));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);
  table.innerHTML = `
    <thead><tr>${columns.map(([label], index) => `<th data-sort="${index}">${label}${key === index ? direction === "asc" ? " ^" : " v" : ""}</th>`).join("")}</tr></thead>
    <tbody>${visible.map((row) => `<tr>${columns.map(([, renderer]) => `<td>${cell(row, renderer)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${columns.length}">រកមិនឃើញទិន្នន័យ។</td></tr>`}</tbody>
    <tfoot><tr><td colspan="${columns.length}">
      <div class="table-toolbar">
        <span class="muted">បង្ហាញ ${visible.length} នៃ ${rows.length}</span>
        <div class="row-actions">
          <button class="ghost-btn compact" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>មុន</button>
          <span class="badge">${page}/${Math.max(1, Math.ceil(sorted.length / pageSize))}</span>
          <button class="ghost-btn compact" data-page="${page + 1}" ${page >= Math.ceil(sorted.length / pageSize) ? "disabled" : ""}>បន្ទាប់</button>
        </div>
      </div>
    </td></tr></tfoot>
  `;
  $$("th[data-sort]", table).forEach((th) => th.addEventListener("click", () => {
    const newKey = Number(th.dataset.sort);
    tableState[`${tableId}SortDirection`] = key === newKey && direction === "asc" ? "desc" : "asc";
    tableState[`${tableId}SortKey`] = newKey;
    render();
  }));
  $$("[data-page]", table).forEach((button) => button.addEventListener("click", () => {
    tableState[`${tableId}Page`] = Number(button.dataset.page);
    render();
  }));
}

function valueForSort(row, column) {
  const renderer = column[1];
  return typeof renderer === "string" ? row[renderer] : "";
}

function cell(row, renderer) {
  return typeof renderer === "function" ? renderer(row) : row[renderer] ?? "";
}

function options(items, selected) {
  return items.map((item) => `<option value="${item}" ${item === selected ? "selected" : ""}>${label(item)}</option>`).join("");
}

function classOptions(emptyLabel, selected) {
  return `${emptyLabel ? `<option value="">${emptyLabel}</option>` : ""}${state.classes.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${label(item.name)}</option>`).join("")}`;
}

function teacherOptions(emptyLabel, selected) {
  return `${emptyLabel ? `<option value="">${emptyLabel}</option>` : ""}${state.teachers.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${item.name}</option>`).join("")}`;
}

function studentOptions(selected) {
  return state.students.filter((student) => student.status !== "Graduated").map((student) => `<option value="${student.id}" ${student.id === selected ? "selected" : ""}>${student.englishName} - ${student.id}</option>`).join("");
}

function statusOptions(items) {
  const [empty, ...rest] = items;
  return `<option value="">${empty}</option>${rest.map((item) => `<option value="${item}">${label(item)}</option>`).join("")}`;
}

function badge(value) {
  const color = value === "Active" || value === "Paid" || value === "Present" || value === "Administrator" ? "green" : value === "Inactive" || value === "Absent" ? "red" : value === "Partial" || value === "Pending" || value === "Excused" ? "yellow" : "";
  return `<span class="badge ${color}">${label(value)}</span>`;
}

function actionButtons(type, id) {
  return `
    <div class="row-actions">
      <button class="ghost-btn compact" data-edit-${type}="${id}"><i data-lucide="pencil"></i>កែប្រែ</button>
      <button class="danger-btn compact" data-delete-${type}="${id}"><i data-lucide="trash-2"></i>លុប</button>
    </div>
  `;
}

function bindRowActions(type, editHandler, deleteHandler) {
  $$(`[data-edit-${type}]`).forEach((button) => button.addEventListener("click", () => editHandler(button.dataset[`edit${capitalize(type)}`])));
  $$(`[data-delete-${type}]`).forEach((button) => button.addEventListener("click", () => deleteHandler(button.dataset[`delete${capitalize(type)}`])));
  refreshIcons();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function openModal(html) {
  $("#modalContent").innerHTML = html;
  $("#modal").classList.remove("hidden");
  refreshIcons();
}

function closeModal() {
  $("#modal").classList.add("hidden");
}

function exportRows(filename, rows, columns) {
  const csv = [columns.join(","), ...rows.map((row) => columns.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  download(filename, csv, "text/csv");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toggleTheme() {
  document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("kms-theme", document.body.dataset.theme);
}

function handleGlobalSearch(event) {
  const query = event.target.value.trim().toLowerCase();
  if (!query) return;
  const student = state.students.find((item) => `${item.id} ${item.englishName} ${item.khmerName}`.toLowerCase().includes(query));
  const teacher = state.teachers.find((item) => `${item.name} ${item.email}`.toLowerCase().includes(query));
  if (student) {
    activeView = "students";
    renderShell();
    render();
    $("#studentSearch").value = query;
    renderStudentRows();
  } else if (teacher && allowedItems().some(([key]) => key === "teachers")) {
    activeView = "teachers";
    renderShell();
    render();
    $("#teacherSearch").value = query;
    renderTeacherRows();
  }
}

document.addEventListener("DOMContentLoaded", init);
