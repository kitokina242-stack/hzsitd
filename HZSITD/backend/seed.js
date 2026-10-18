// ==============================================================================
// HZSITD Official Paperless Letter Portal — Database Seeder
// Populates all 9 directories, hierarchical staff accounts, and test scenarios
// ==============================================================================

const db = require('./db');
const crypto = require('crypto');

console.log('🌱 Seeding HZSITD Letter Portal database...');

// 1. Seed Directories
const directories = [
  {
    code: 'DEPT_HEAD',
    name: 'Head of Department Office',
    amharic_name: 'የመምሪያ ኃላፊ ቢሮ',
    short_name: 'Dept Head Office',
    icon: 'lucide:award',
    description: 'Executive leadership, strategic direction, and final endorsement of all official correspondence.'
  },
  {
    code: 'ICT_INFRA',
    name: 'ICT Infrastructure & Network Administration Directory',
    amharic_name: 'የኢንፎርሜሽን ኮሙኒኬሽን መሠረተ ልማት እና ኔትወርክ አስተዳደር መምሪያ',
    short_name: 'ICT Infrastructure',
    icon: 'lucide:network',
    description: 'Data centers, fiber optics, wireless connectivity, and server cluster operations across Hadiya Zone.'
  },
  {
    code: 'SW_DEV',
    name: 'Software Development & Systems Integration Directory',
    amharic_name: 'የሶፍትዌር ልማት እና ሲስተሞች ውህደት መምሪያ',
    short_name: 'Software Development',
    icon: 'lucide:code-2',
    description: 'Custom portal design, e-government platforms, API integrations, and database architectures.'
  },
  {
    code: 'SCI_TECH',
    name: 'Science & Technology Innovation & Research Directory',
    amharic_name: 'የሳይንስና ቴክኖሎጂ ፈጠራ እና ምርምር መምሪያ',
    short_name: 'Science & Innovation',
    icon: 'lucide:flask-conical',
    description: 'Technological research, youth innovation incubation, STEM promotion, and patent support.'
  },
  {
    code: 'DIGI_LIT',
    name: 'Digital Literacy, Training & Capacity Building Directory',
    amharic_name: 'የዲጂታል እውቀት ስልጠና እና አቅም ግንባታ መምሪያ',
    short_name: 'Digital Literacy',
    icon: 'lucide:graduation-cap',
    description: 'Civil service IT skilling, citizen digital literacy programs, and community tech centers.'
  },
  {
    code: 'CYBER_SEC',
    name: 'Cybersecurity & Data Protection Directory',
    amharic_name: 'የሳይበር ደህንነት እና የመረጃ ጥበቃ መምሪያ',
    short_name: 'Cybersecurity',
    icon: 'lucide:shield-check',
    description: 'Threat surveillance, incident response, privacy compliance, and IT vulnerability auditing.'
  },
  {
    code: 'PLAN_BUDGET',
    name: 'Planning, Monitoring, Evaluation & Budgeting Directory',
    amharic_name: 'የእቅድ፣ ክትትል፣ ግምገማ እና በጀት ዝግጅት መምሪያ',
    short_name: 'Planning & Budget',
    icon: 'lucide:pie-chart',
    description: 'Annual strategic planning, budget forecasting, KPI tracking, and operational audits.'
  },
  {
    code: 'ADMIN_HR',
    name: 'Administration, Human Resources & Finance Directory',
    amharic_name: 'የአስተዳደር፣ የሰው ኃይል እና የፋይናንስ መምሪያ',
    short_name: 'Admin & HR',
    icon: 'lucide:users',
    description: 'Staff payroll, talent acquisition, procurement, logistics, and legal records.'
  },
  {
    code: 'PR_COMMS',
    name: 'Public Relations, Communications & Outreach Directory',
    amharic_name: 'የህዝብ ግንኙነት እና ኮሙኒኬሽን መምሪያ',
    short_name: 'PR & Communications',
    icon: 'lucide:megaphone',
    description: 'Press releases, public digital media dissemination, media inquiries, and official briefings.'
  }
];

// Clear existing tables
db.exec(`
  DELETE FROM attachments;
  DELETE FROM letter_comments;
  DELETE FROM letter_timeline;
  DELETE FROM letters;
  DELETE FROM chat_messages;
  DELETE FROM users;
  DELETE FROM directories;
  DELETE FROM system_settings;
  DELETE FROM sqlite_sequence;
`);

const insertDir = db.prepare(`
  INSERT INTO directories (code, name, amharic_name, short_name, icon, description)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const d of directories) {
  insertDir.run(d.code, d.name, d.amharic_name, d.short_name, d.icon, d.description);
}

// Fetch directory IDs
const dirRows = db.prepare('SELECT id, code FROM directories').all();
const dirMap = {};
dirRows.forEach(r => dirMap[r.code] = r.id);

// 2. Seed Users
const users = [
  // Level 3: Department Head
  {
    username: 'dr_bezabih',
    password_hash: 'admin123',
    full_name: 'Dr. Bezabih Alemu',
    email: 'bezabih.alemu@hzsitd.gov.et',
    phone: '+251-46-555-0101',
    role: 'Department Head',
    directory_id: dirMap['DEPT_HEAD'],
    position_title: 'Head of Department',
    signature_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="70" viewBox="0 0 220 70"><path d="M 15 45 Q 40 10 70 35 T 125 30 T 175 48 T 205 25" fill="none" stroke="%231a365d" stroke-width="2.5" stroke-linecap="round"/><path d="M 60 40 Q 95 62 140 38" fill="none" stroke="%231a365d" stroke-width="1.8"/><text x="25" y="62" font-family="cursive" font-size="14" fill="%232b6cb0">Dr. Bezabih Alemu</text></svg>',
    stamp_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="60" fill="none" stroke="%239b1c1c" stroke-width="2.5" stroke-dasharray="4,2"/><circle cx="65" cy="65" r="50" fill="none" stroke="%239b1c1c" stroke-width="1.5"/><text x="65" y="32" font-family="sans-serif" font-size="8" font-weight="bold" fill="%239b1c1c" text-anchor="middle">HADIYA ZONE GOV</text><text x="65" y="45" font-family="sans-serif" font-size="7" font-weight="bold" fill="%239b1c1c" text-anchor="middle">SCIENCE &amp; IT DEPT</text><circle cx="65" cy="65" r="14" fill="%239b1c1c" opacity="0.1"/><polygon points="65,55 69,63 77,63 71,68 73,76 65,71 57,76 59,68 53,63 61,63" fill="%239b1c1c"/><text x="65" y="90" font-family="sans-serif" font-size="7" font-weight="bold" fill="%239b1c1c" text-anchor="middle">OFFICIAL SEAL</text><text x="65" y="103" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="%239b1c1c" text-anchor="middle">★ HOSSANA ★</text></svg>',
    avatar_url: '../assets/images/profile/user-1.jpg'
  },
  // Level 2: Directory Lead (Software Dev)
  {
    username: 'eng_yohannes',
    password_hash: 'lead123',
    full_name: 'Eng. Yohannes Haile',
    email: 'yohannes.haile@hzsitd.gov.et',
    phone: '+251-46-555-0102',
    role: 'Directory Lead',
    directory_id: dirMap['SW_DEV'],
    position_title: 'Director of Software Development & Systems Integration',
    signature_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><path d="M 20 40 Q 50 15 80 30 T 140 25 T 185 35" fill="none" stroke="%231a365d" stroke-width="2" stroke-linecap="round"/><text x="30" y="52" font-family="cursive" font-size="12" fill="%232b6cb0">Yohannes H.</text></svg>',
    stamp_url: '',
    avatar_url: '../assets/images/profile/user-2.jpg'
  },
  // Level 1: Officer (Software Dev)
  {
    username: 'almaz_t',
    password_hash: 'officer123',
    full_name: 'Almaz Tesfaye',
    email: 'almaz.tesfaye@hzsitd.gov.et',
    phone: '+251-46-555-0103',
    role: 'Officer',
    directory_id: dirMap['SW_DEV'],
    position_title: 'Senior Systems Engineer',
    signature_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M 15 35 Q 45 10 75 25 T 130 20 T 165 32" fill="none" stroke="%232c5282" stroke-width="1.8"/><text x="25" y="45" font-family="cursive" font-size="11" fill="%232b6cb0">Almaz T.</text></svg>',
    stamp_url: '',
    avatar_url: '../assets/images/profile/user-3.jpg'
  },
  // Level 2: Directory Lead (Cybersecurity)
  {
    username: 'meron_t',
    password_hash: 'lead123',
    full_name: 'Meron Tadesse',
    email: 'meron.tadesse@hzsitd.gov.et',
    phone: '+251-46-555-0104',
    role: 'Directory Lead',
    directory_id: dirMap['CYBER_SEC'],
    position_title: 'Director of Cybersecurity & Data Protection',
    signature_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><path d="M 20 38 Q 60 12 90 28 T 150 22 T 180 32" fill="none" stroke="%231a365d" stroke-width="2"/><text x="30" y="52" font-family="cursive" font-size="12" fill="%232b6cb0">Meron T.</text></svg>',
    stamp_url: '',
    avatar_url: '../assets/images/profile/user-4.jpg'
  },
  // Level 1: Officer (Cybersecurity)
  {
    username: 'dawit_k',
    password_hash: 'officer123',
    full_name: 'Dawit Kassa',
    email: 'dawit.kassa@hzsitd.gov.et',
    phone: '+251-46-555-0105',
    role: 'Officer',
    directory_id: dirMap['CYBER_SEC'],
    position_title: 'Security Operations Analyst',
    signature_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M 20 30 Q 55 12 85 24 T 145 22" fill="none" stroke="%232c5282" stroke-width="1.8"/><text x="25" y="45" font-family="cursive" font-size="11" fill="%232b6cb0">Dawit K.</text></svg>',
    stamp_url: '',
    avatar_url: '../assets/images/profile/user-5.jpg'
  },
  // Level 2: Directory Lead (ICT Infra)
  {
    username: 'kassahun_b',
    password_hash: 'lead123',
    full_name: 'Kassahun Belay',
    email: 'kassahun.belay@hzsitd.gov.et',
    phone: '+251-46-555-0106',
    role: 'Directory Lead',
    directory_id: dirMap['ICT_INFRA'],
    position_title: 'Director of ICT Infrastructure & Network Administration',
    signature_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><path d="M 18 35 Q 50 15 95 32 T 160 25" fill="none" stroke="%231a365d" stroke-width="2"/><text x="30" y="50" font-family="cursive" font-size="12" fill="%232b6cb0">Kassahun B.</text></svg>',
    stamp_url: '',
    avatar_url: '../assets/images/profile/user-6.jpg'
  },
  // Level 1: Officer (ICT Infra)
  {
    username: 'selam_m',
    password_hash: 'officer123',
    full_name: 'Selam Mengistu',
    email: 'selam.mengistu@hzsitd.gov.et',
    phone: '+251-46-555-0107',
    role: 'Officer',
    directory_id: dirMap['ICT_INFRA'],
    position_title: 'Network Systems Specialist',
    signature_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M 15 32 Q 45 15 80 28 T 150 25" fill="none" stroke="%232c5282" stroke-width="1.8"/><text x="25" y="44" font-family="cursive" font-size="11" fill="%232b6cb0">Selam M.</text></svg>',
    stamp_url: '',
    avatar_url: '../assets/images/profile/user-7.jpg'
  },
  // Level 4: System Admin
  {
    username: 'admin_solomon',
    password_hash: 'admin2026',
    full_name: 'Solomon Bekele',
    email: 'admin@hzsitd.gov.et',
    phone: '+251-46-555-0100',
    role: 'System Admin',
    directory_id: dirMap['DEPT_HEAD'],
    position_title: 'Lead IT Systems Administrator',
    signature_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50"><path d="M 20 32 Q 60 14 90 28 T 150 20" fill="none" stroke="%231a365d" stroke-width="2"/><text x="25" y="44" font-family="cursive" font-size="11" fill="%232b6cb0">Solomon B.</text></svg>',
    stamp_url: '',
    avatar_url: '../assets/images/profile/user-8.jpg'
  }
];

const insertUser = db.prepare(`
  INSERT INTO users (username, password_hash, full_name, email, phone, role, directory_id, position_title, signature_url, stamp_url, avatar_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const u of users) {
  insertUser.run(u.username, u.password_hash, u.full_name, u.email, u.phone, u.role, u.directory_id, u.position_title, u.signature_url, u.stamp_url, u.avatar_url);
}

const userRows = db.prepare('SELECT * FROM users').all();
const userMap = {};
userRows.forEach(r => userMap[r.username] = r);

// 3. Seed Realistic Letters Representing Scenarios A & B
const insertLetter = db.prepare(`
  INSERT INTO letters (
    reference_no, direction, subject, body, priority, letter_type,
    sender_type, external_sender_name, external_sender_org, external_sender_ref,
    sender_id, sender_directory_id, recipient_type, recipient_directory_id,
    assigned_officer_id, external_recipient_name, external_recipient_org, external_recipient_address,
    status, approval_stage, digital_signature, signature_type, stamp_data,
    endorsed_by, endorsed_at, dispatched_at, verification_hash,
    security_classification, created_by, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?
  )
`);

const insertTimeline = db.prepare(`
  INSERT INTO letter_timeline (letter_id, actor_id, actor_name, actor_role, action, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertComment = db.prepare(`
  INSERT INTO letter_comments (letter_id, author_id, comment_text, comment_type, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

// -----------------------------------------------------------------------------
// Letter 1: SCENARIO A — INCOMING LETTER (Top-Down Assignment Workflow)
// Path: Ministry -> Dept Head Dr. Bezabih -> assigned to Lead Eng. Yohannes -> delegated to Officer Almaz Tesfaye
// -----------------------------------------------------------------------------
const l1Res = insertLetter.run(
  'HZSITD/IN/2026/014',
  'INCOMING',
  'Directive on Implementation of National Digital Government Framework across Zone Departments',
  `To: Hadiya Zone Science & Information Technology Department
Attn: Head of Department

SUBJECT: MANDATORY ADOPTION OF NATIONAL E-SERVICES ARCHITECTURE (NESA) STANDARDS

In accordance with Federal Proclamation No. 1290/2024 and the National Digital Ethiopia 2025 Strategy, all regional and zonal science & technology departments are hereby instructed to commence immediate alignment with the unified interoperability framework.

Specific Actions Required:
1. Conduct a full infrastructure readiness assessment of all local data centers and public service interfaces.
2. Formulate a technical transition roadmap for municipal digital revenue systems.
3. Submit a preliminary compliance report to the Ministry of Innovation & Technology within twenty (20) working days.

We expect your Department's proactive cooperation in realizing a seamlessly connected public service delivery ecosystem.

With high regards,
State Minister of Innovation & Technology
Federal Democratic Republic of Ethiopia, Addis Ababa`,
  'Urgent',
  'Directive / Instruction',
  'EXTERNAL',
  'Dr. Foziya Amin (State Minister)',
  'Ministry of Innovation & Technology (MInT)',
  'MInT/FDRE/DIR/2026/894',
  null,
  null,
  'INTERNAL',
  dirMap['SW_DEV'],
  userMap['almaz_t'].id, // Assigned to Officer Almaz
  null,
  null,
  null,
  'Under Review',
  'Officer Draft',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'Official',
  userMap['dr_bezabih'].id,
  '2026-10-12 09:30:00',
  '2026-10-13 14:15:00'
);

const l1Id = l1Res.lastInsertRowid;

// Timeline for Letter 1
insertTimeline.run(l1Id, userMap['dr_bezabih'].id, userMap['dr_bezabih'].full_name, 'Department Head', 'Received & Registered', 'Official communication logged from Ministry of Innovation & Technology (MInT).', '2026-10-12 09:30:00');
insertTimeline.run(l1Id, userMap['dr_bezabih'].id, userMap['dr_bezabih'].full_name, 'Department Head', 'Assigned Down to Directory', 'Assigned to Software Development & Systems Integration Directory. Instructions: Eng. Yohannes to lead technical gap assessment.', '2026-10-12 11:20:00');
insertTimeline.run(l1Id, userMap['eng_yohannes'].id, userMap['eng_yohannes'].full_name, 'Directory Lead', 'Delegated to Officer', 'Assigned directly to Senior Systems Engineer Almaz Tesfaye for execution and drafting of technical audit response.', '2026-10-13 09:15:00');

// Comments for Letter 1
insertComment.run(l1Id, userMap['dr_bezabih'].id, 'Eng. Yohannes: Please treat this with highest priority. Review the interoperability matrix and assign our best engineer to compile the baseline audit.', 'Minute', '2026-10-12 11:22:00');
insertComment.run(l1Id, userMap['eng_yohannes'].id, 'Almaz: Please take ownership of this assessment. Coordinate with Selam in ICT Infrastructure to ensure data center connectivity specs are included.', 'Instruction', '2026-10-13 09:18:00');


// -----------------------------------------------------------------------------
// Letter 2: SCENARIO B — OUTGOING LETTER (Bottom-Up Approval Flow)
// Path: Drafted by Officer Almaz -> Reviewed & Endorsed by Lead Eng. Yohannes -> Pending Dept Head Dr. Bezabih Alemu
// -----------------------------------------------------------------------------
const l2Res = insertLetter.run(
  'HZSITD/OUT/2026/042',
  'OUTGOING',
  'Request for Fiber Optic Backbone Expansion Budget Allocation for Hossana City Administrative Center',
  `To: Hadiya Zone Finance & Economic Development Department
Attn: Planning & Budget Directorate
Hossana, Ethiopia

SUBJECT: CAPITAL BUDGET CLEARANCE FOR PHASE II METROPOLITAN FIBER OPTIC EXTENSION

The Hadiya Zone Science & Information Technology Department has finalized the engineering survey and bill of quantities (BOQ) for extending high-speed optical fiber connectivity to fourteen (14) municipal public service delivery institutions across Hossana City.

Project Highlights:
- Total Route Distance: 18.4 kilometers single-mode 48-core underground fiber
- Covered Facilities: Zone High Court, Central Revenue Office, General Hospital, and 3 Sub-City Administrations
- Estimated Project Cost: ETB 14,850,000 (Fourteen Million Eight Hundred Fifty Thousand Birr)

All technical validations, environmental routing clearances, and equipment vendor matrices have been reviewed and approved by our engineering committee. We respectfully request the allocation and disbursement of the preliminary 35% mobilization budget from the regional digital infrastructure capital fund.

Respectfully submitted,
Hadiya Zone Science & Information Technology Department`,
  'Urgent',
  'Request',
  'INTERNAL',
  null,
  null,
  null,
  userMap['almaz_t'].id,
  dirMap['SW_DEV'],
  'EXTERNAL',
  null,
  null,
  'Ato Melaku Kebede (Director)',
  'Hadiya Zone Finance & Economic Development Department',
  'Hossana, Main Administration Compound, Block C',
  'Pending Department Head',
  'Department Head Endorsement',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'Official',
  userMap['almaz_t'].id,
  '2026-10-13 10:00:00',
  '2026-10-14 08:30:00'
);

const l2Id = l2Res.lastInsertRowid;

// Timeline for Letter 2
insertTimeline.run(l2Id, userMap['almaz_t'].id, userMap['almaz_t'].full_name, 'Officer', 'Draft Created', 'Officer Almaz Tesfaye prepared the complete project proposal and budget justification.', '2026-10-13 10:00:00');
insertTimeline.run(l2Id, userMap['almaz_t'].id, userMap['almaz_t'].full_name, 'Officer', 'Submitted for Review', 'Submitted up to Directory Lead Eng. Yohannes Haile for engineering validation.', '2026-10-13 15:45:00');
insertTimeline.run(l2Id, userMap['eng_yohannes'].id, userMap['eng_yohannes'].full_name, 'Directory Lead', 'Reviewed & Approved', 'Director of Software Development verified BOQ and technical feasibility. Forwarded to Head of Department for executive endorsement.', '2026-10-14 08:30:00');

// Comments for Letter 2
insertComment.run(l2Id, userMap['almaz_t'].id, 'Initial draft includes the comprehensive BOQ and price comparison from 3 reputable fiber contractors.', 'Note', '2026-10-13 10:05:00');
insertComment.run(l2Id, userMap['eng_yohannes'].id, 'Approved with recommendation. The cost-benefit analysis is solid and directly addresses the latency issues reported by the Revenue Office. Forwarding to Dr. Bezabih for final signature.', 'Minute', '2026-10-14 08:32:00');


// -----------------------------------------------------------------------------
// Letter 3: COMPLETED & DISPATCHED LETTER (Full Signatures, Official Stamp, QR Verification Hash)
// -----------------------------------------------------------------------------
const l3Hash = crypto.createHash('sha256').update('HZSITD/OUT/2026/039' + 'Official Endorsement of Public Wi-Fi Hotspots Initiative' + 'Dr. Bezabih Alemu' + '2026-10-10').digest('hex');

const l3Res = insertLetter.run(
  'HZSITD/OUT/2026/039',
  'OUTGOING',
  'Official Endorsement of Public Wi-Fi Hotspots Initiative in Hossana Central Market',
  `To: Hossana City Administration
Mayor's Executive Office
Hossana, Ethiopia

SUBJECT: FORMAL ENDORSEMENT AND TECHNICAL CLEARANCE FOR PUBLIC WI-FI PHASE 1

We are pleased to inform your office that the Hadiya Zone Science & Information Technology Department has approved the site design and spectrum allocation for four (4) high-density outdoor public Wi-Fi zones in the central commercial district of Hossana.

The installation will provide complimentary 10 Mbps connectivity for local small businesses, students, and citizens accessing government e-services. Bandwidth management policies will ensure secure, filtered, and equitable network distribution.

The ICT Infrastructure Directory has been directed to supervise the physical antenna mounting and fiber link terminations beginning Monday next week.

Signed and sealed on behalf of the Department,
Dr. Bezabih Alemu
Head of Department
Hadiya Zone Science & Information Technology Department`,
  'Routine',
  'Official Letter',
  'INTERNAL',
  null,
  null,
  null,
  userMap['selam_m'].id,
  dirMap['ICT_INFRA'],
  'EXTERNAL',
  null,
  null,
  'Hon. Mayor Fikadu Ermias',
  'Hossana City Administration',
  'Mayor Office, Hossana City Hall',
  'Dispatched',
  'Completed',
  userMap['dr_bezabih'].signature_url,
  'PROFILE',
  userMap['dr_bezabih'].stamp_url,
  userMap['dr_bezabih'].id,
  '2026-10-10 14:00:00',
  '2026-10-10 16:30:00',
  l3Hash,
  'Public',
  userMap['selam_m'].id,
  '2026-10-08 11:00:00',
  '2026-10-10 16:30:00'
);

const l3Id = l3Res.lastInsertRowid;

insertTimeline.run(l3Id, userMap['selam_m'].id, userMap['selam_m'].full_name, 'Officer', 'Draft Created', 'Initial survey and endorsement request drafted by Network Specialist Selam Mengistu.', '2026-10-08 11:00:00');
insertTimeline.run(l3Id, userMap['kassahun_b'].id, userMap['kassahun_b'].full_name, 'Directory Lead', 'Reviewed & Approved', 'Director Kassahun Belay verified spectrum clearance and equipment safety.', '2026-10-09 10:30:00');
insertTimeline.run(l3Id, userMap['dr_bezabih'].id, userMap['dr_bezabih'].full_name, 'Department Head', 'Endorsed & Digitally Signed', 'Executive approval granted. Digital cryptographic signature and official circular seal applied.', '2026-10-10 14:00:00');
insertTimeline.run(l3Id, userMap['admin_solomon'].id, userMap['admin_solomon'].full_name, 'System Admin', 'Dispatched & Archived', 'Official dispatch package transmitted electronically and verification QR code generated.', '2026-10-10 16:30:00');


// -----------------------------------------------------------------------------
// Letter 4: RETURNED FOR REVISION (Demonstrating Quality Control & Revision Workflow)
// -----------------------------------------------------------------------------
const l4Res = insertLetter.run(
  'HZSITD/OUT/2026/040',
  'OUTGOING',
  'Proposal for Upgrading Zonal Data Center Storage Clusters and Backup Array',
  `To: Regional Science & IT Bureau
Hawassa, Sidama / Central Ethiopia

SUBJECT: REVISION REQUIRED: DATA STORAGE HARDWARE SPECIFICATION

Proposal for replacement of aging SAN storage units in the Zonal Data Center with NVMe all-flash enterprise storage arrays...`,
  'Routine',
  'Proposal',
  'INTERNAL',
  null,
  null,
  null,
  userMap['dawit_k'].id,
  dirMap['CYBER_SEC'],
  'INTERNAL',
  dirMap['ICT_INFRA'],
  null,
  null,
  null,
  null,
  'Returned for Revision',
  'Returned',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'Internal Only',
  userMap['dawit_k'].id,
  '2026-10-09 13:00:00',
  '2026-10-11 11:00:00'
);

const l4Id = l4Res.lastInsertRowid;

insertTimeline.run(l4Id, userMap['dawit_k'].id, userMap['dawit_k'].full_name, 'Officer', 'Draft Submitted', 'Submitted proposal for flash storage modernization.', '2026-10-09 13:00:00');
insertTimeline.run(l4Id, userMap['meron_t'].id, userMap['meron_t'].full_name, 'Directory Lead', 'Returned for Revision', 'Returned to Officer Dawit Kassa. Notes: Missing automated offsite disaster recovery replication parameters.', '2026-10-11 11:00:00');

insertComment.run(l4Id, userMap['meron_t'].id, 'Dawit: The proposal lacks clear specifications for off-site disaster recovery and ransomware-immutable snapshotting. Please add these critical sections and recalculate total storage needs before resubmission.', 'Revision Request', '2026-10-11 11:05:00');


// 4. Seed Chat Messages
const insertChat = db.prepare(`
  INSERT INTO chat_messages (sender_id, recipient_id, channel, message_text, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

insertChat.run(userMap['dr_bezabih'].id, null, 'general', 'Welcome all directory heads and officers to the new Paperless Letter Sending Portal. Please ensure all official incoming and outgoing correspondence is routed digitally through this platform.', '2026-10-12 08:00:00');
insertChat.run(userMap['eng_yohannes'].id, null, 'general', 'Software Development Directory is live and actively reviewing ministerial directives.', '2026-10-12 08:30:00');
insertChat.run(userMap['almaz_t'].id, userMap['eng_yohannes'].id, 'direct', 'Eng. Yohannes, I have reviewed the MInT directive (HZSITD/IN/2026/014). Working on the baseline questionnaire today.', '2026-10-13 10:15:00');
insertChat.run(userMap['eng_yohannes'].id, userMap['almaz_t'].id, 'direct', 'Excellent work Almaz. Please keep Dr. Bezabih updated as soon as the preliminary tables are drafted.', '2026-10-13 10:30:00');


// 5. Seed System Settings
const insertSetting = db.prepare(`
  INSERT INTO system_settings (key, value, description)
  VALUES (?, ?, ?)
`);

insertSetting.run('system_name', 'HZSITD Paperless Letter Sending Portal', 'Official platform title');
insertSetting.run('current_year', '2026', 'Fiscal/Correspondence year');
insertSetting.run('next_letter_num', '43', 'Sequence counter for outgoing letters');
insertSetting.run('auto_qr_verification', 'true', 'Whether to generate cryptographic verification hashes');
insertSetting.run('department_seal_text', 'HADIYA ZONE GOVERNMENT SCIENCE & IT DEPT - HOSSANA', 'Text embedded in SVG seal');

console.log('✅ Seeding completed successfully!');
console.log(`   - 9 Directories initialized`);
console.log(`   - 8 Staff Accounts across Levels 1, 2, 3, and 4 created`);
console.log(`   - 4 Sample Letters covering Scenario A (Top-Down) & Scenario B (Bottom-Up) generated`);
console.log(`   - Timeline audits and routing minutes seeded`);
