const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_PDF_PATH = 'C:\\Users\\USER\\Desktop\\HZSITD\\HZSITD_Master_API_and_Portal_Specification.pdf';
const ARTIFACT_PDF_PATH = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\a5de1bc3-bc70-4039-96c6-bf52cfa44bee\\HZSITD_Master_API_and_Portal_Specification.pdf';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HZSITD Master API Specification & Architecture Blueprint</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
      @bottom-right {
        content: counter(page) " / " counter(pages);
      }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .header-banner {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .dept-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #0284c7;
    }
    .doc-main-title {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 4px 0 0 0;
    }
    .doc-meta {
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      background: #e0f2fe;
      color: #0369a1;
      margin-bottom: 4px;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 5px;
      margin-top: 22px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p, li {
      font-size: 9.5pt;
      line-height: 1.5;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      font-weight: 700;
      color: #0f172a;
    }
    code, pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    code {
      font-size: 8.5pt;
      background: #f1f5f9;
      padding: 1.5px 4px;
      border-radius: 3px;
      color: #0f172a;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 8pt;
      line-height: 1.35;
      overflow-x: auto;
      margin: 8px 0;
      page-break-inside: avoid;
    }
    .method-get { color: #0284c7; font-weight: 700; }
    .method-post { color: #16a34a; font-weight: 700; }
    .method-put { color: #d97706; font-weight: 700; }
    .method-delete { color: #dc2626; font-weight: 700; }
    .callout {
      background: #f0fdf4;
      border-left: 3px solid #16a34a;
      padding: 8px 12px;
      margin: 12px 0;
      border-radius: 0 6px 6px 0;
      font-size: 9pt;
      color: #166534;
      page-break-inside: avoid;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <div class="header-banner">
    <div>
      <div class="dept-title">Hadiya Zone Science & Information Technology Department</div>
      <h1 class="doc-main-title">Master API Specification & Architecture Blueprint</h1>
      <div style="font-size: 9pt; color: #475569; margin-top: 2px;">
        Complete Contract: Letter Management System (LCMS) &amp; Public Portal CMS
      </div>
    </div>
    <div class="doc-meta">
      <span class="badge">Version 2.0 • Production Contract</span><br>
      <strong>Stack:</strong> Express + Prisma + TypeScript + Socket.IO<br>
      <strong>Target:</strong> Backend Engineering Team
    </div>
  </div>

  <h2>1. System Scope & Core Domains</h2>
  <p>
    This technical contract defines the end-to-end API specification for the HZSITD platform across its two core operational pillars:
  </p>
  <ul>
    <li><strong>Letter Management System (LCMS):</strong> Multi-tier hierarchical correspondence, cryptographic verification QR codes, minute directives, departmental delegations, attachment handling, and real-time Socket.IO synchronization.</li>
    <li><strong>Portal Management System (CMS &amp; Public Gateway):</strong> Public announcements, zonal digital initiatives, citizen contact inquiry tickets, department directories, and cryptographic verification ledger.</li>
  </ul>

  <h2>2. Role Hierarchy & Authority Matrix</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Role</th>
        <th style="width: 15%;">Authority Level</th>
        <th>Capabilities in Workflow</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Department Head</strong></td>
        <td>Executive (L3)</td>
        <td>Final endorsement &amp; legal seal; minutes &amp; downward directives to directorates or specific officers; zone-wide audit clearance.</td>
      </tr>
      <tr>
        <td><strong>Directory Lead</strong></td>
        <td>Managerial (L2)</td>
        <td>Clears subordinate officer drafts; minutes &amp; delegates directives to officers within their directorate; inter-directorate correspondence.</td>
      </tr>
      <tr>
        <td><strong>Officer</strong></td>
        <td>Operational (L1)</td>
        <td>Authoring workbench; executes assigned tasks/directives; uploads evidence/PDF attachments; submits drafts up to lead.</td>
      </tr>
      <tr>
        <td><strong>System Admin</strong></td>
        <td>Governance (L0)</td>
        <td>User provisioning, directory setup, system settings, immutable audit log monitoring.</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Standard Envelope & Error Conventions</h2>
  <pre><code>// Success Envelope:
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 85, "totalPages": 5 }
}

// Error Envelope:
{
  "success": false,
  "error": {
    "code": "PROTOCOL_VIOLATION",
    "message": "An author cannot address an internal directive to themselves.",
    "fieldErrors": [{ "field": "assigned_officer_id", "message": "Invalid recipient" }]
  }
}</code></pre>

  <div class="page-break"></div>

  <h2>4. Complete Prisma Schema Model Structure</h2>
  <p>Below is the complete relational model mapping for your <code>schema.prisma</code>:</p>
  <pre><code>enum UserRole {
  OFFICER          @map("Officer")
  DIRECTORY_LEAD   @map("Directory Lead")
  DEPARTMENT_HEAD  @map("Department Head")
  SYSTEM_ADMIN     @map("System Admin")
}

enum LetterDirection {
  INCOMING
  OUTGOING
}

enum LetterPriority {
  ROUTINE       @map("Routine")
  NORMAL        @map("Normal")
  URGENT        @map("Urgent")
  CONFIDENTIAL  @map("Confidential")
}

enum LetterStatus {
  DRAFT                    @map("Draft")
  UNDER_REVIEW             @map("Under Review")
  PENDING_DEPARTMENT_HEAD  @map("Pending Department Head")
  APPROVED                 @map("Approved")
  DISPATCHED               @map("Dispatched")
  RETURNED_FOR_REVISION    @map("Returned for Revision")
  ARCHIVED                 @map("Archived")
}

enum ApprovalStage {
  OFFICER_DRAFT               @map("Officer Draft")
  DIRECTORY_LEAD_REVIEW       @map("Directory Lead Review")
  DEPARTMENT_HEAD_ENDORSEMENT @map("Department Head Endorsement")
  COMPLETED                   @map("Completed")
  RETURNED                    @map("Returned")
}

model Directory {
  id          Int      @id @default(autoincrement())
  code        String   @unique
  name        String
  shortName   String?  @map("short_name")
  users       User[]
  sentLetters Letter[] @relation("SenderDirectory")
  recvLetters Letter[] @relation("RecipientDirectory")
}

model User {
  id            Int       @id @default(autoincrement())
  username      String    @unique
  passwordHash  String    @map("password_hash")
  fullName      String    @map("full_name")
  email         String    @unique
  role          UserRole
  positionTitle String    @map("position_title")
  directoryId   Int?      @map("directory_id")
  directory     Directory? @relation(fields: [directoryId], references: [id])
}

model Letter {
  id                    Int             @id @default(autoincrement())
  referenceNo           String          @unique @map("reference_no")
  trackingToken         String?         @unique @map("tracking_token")
  direction             LetterDirection
  subject               String
  body                  String
  priority              LetterPriority  @default(ROUTINE)
  letterType            String          @default("Official Letter") @map("letter_type")
  senderType            String          @default("INTERNAL") @map("sender_type")
  senderId              Int?            @map("sender_id")
  senderDirectoryId     Int?            @map("sender_directory_id")
  recipientType         String          @default("INTERNAL") @map("recipient_type")
  recipientDirectoryId  Int?            @map("recipient_directory_id")
  assignedOfficerId     Int?            @map("assigned_officer_id")
  status                LetterStatus    @default(DRAFT)
  approvalStage         ApprovalStage   @default(OFFICER_DRAFT) @map("approval_stage")
  digitalSignature      String?         @map("digital_signature")
  stampData             String?         @map("stamp_data")
  timeline              LetterTimeline[]
  comments              LetterComment[]
  attachments           Attachment[]
}</code></pre>

  <div class="page-break"></div>

  <h2>5. RESTful Endpoint Catalog</h2>

  <h3>Module 1: Authentication &amp; Governance</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Method</th>
        <th style="width: 35%;">Endpoint</th>
        <th>Description &amp; Access Role</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="method-post">POST</span></td>
        <td><code>/api/auth/login</code></td>
        <td>Authenticates username/password; returns JWT + user profile.</td>
      </tr>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/auth/me</code></td>
        <td>Validates bearer token; returns current authenticated session.</td>
      </tr>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/users</code></td>
        <td>Returns personnel roster filtered by <code>directory_id</code> or <code>role</code>.</td>
      </tr>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/directories</code></td>
        <td>Returns list of all 9 institutional directorates.</td>
      </tr>
    </tbody>
  </table>

  <h3>Module 2: Letter Management &amp; State Engine</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Method</th>
        <th style="width: 35%;">Endpoint</th>
        <th>Description &amp; Access Role</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/letters</code></td>
        <td>Paginated correspondence filtered by tab (<code>inbox</code>, <code>sent</code>, <code>drafts</code>, <code>archived</code>).</td>
      </tr>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/letters/:id</code></td>
        <td>Complete relational letter with attachments, minute trail, and signatures.</td>
      </tr>
      <tr>
        <td><span class="method-post">POST</span></td>
        <td><code>/api/letters</code></td>
        <td>Creates letter draft or direct submission with target directorate/officer.</td>
      </tr>
      <tr>
        <td><span class="method-post">POST</span></td>
        <td><code>/api/letters/:id/action</code></td>
        <td>Executes state transition: <code>submit_to_lead</code>, <code>approve_to_head</code>, <code>endorse_and_seal</code>, <code>return_for_revision</code>, <code>assign_to_directory</code>, <code>delegate_to_officer</code>.</td>
      </tr>
      <tr>
        <td><span class="method-post">POST</span></td>
        <td><code>/api/letters/:id/comments</code></td>
        <td>Appends minute instruction or review note to letter trail.</td>
      </tr>
      <tr>
        <td><span class="method-post">POST</span></td>
        <td><code>/api/upload</code></td>
        <td>Uploads multipart PDF or evidence attachment.</td>
      </tr>
    </tbody>
  </table>

  <h3>Module 3: Verification &amp; Public Cryptographic Ledger</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Method</th>
        <th style="width: 35%;">Endpoint</th>
        <th>Description &amp; Access Role</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/public/letters/verify/:token</code></td>
        <td>QR Code scan endpoint: returns authenticity certificate, seal timestamp, and validity.</td>
      </tr>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/public/letters/track?ref=...</code></td>
        <td>Public reference lookup service.</td>
      </tr>
    </tbody>
  </table>

  <h3>Module 4: Portal CMS &amp; Public Operations</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Method</th>
        <th style="width: 35%;">Endpoint</th>
        <th>Description &amp; Access Role</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/portal/announcements</code></td>
        <td>Public news, circulars, and official press releases.</td>
      </tr>
      <tr>
        <td><span class="method-post">POST</span></td>
        <td><code>/api/portal/announcements</code></td>
        <td>Create announcement (Admin / Department Head only).</td>
      </tr>
      <tr>
        <td><span class="method-get">GET</span></td>
        <td><code>/api/portal/projects</code></td>
        <td>Public zonal technology initiatives showcase.</td>
      </tr>
      <tr>
        <td><span class="method-post">POST</span></td>
        <td><code>/api/portal/inquiries</code></td>
        <td>Public contact form submission; issues tracking ticket number.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout">
    <strong>Working Reference Backend Available:</strong> A fully functional Express reference server with SQLite/Prisma compatibility is located at <code>HZSITD/backend/server.js</code> with sample database queries in <code>HZSITD/backend/db.js</code>.
  </div>

</body>
</html>
`;

async function generatePdf() {
  console.log('Launching Chrome to generate Master API Specification PDF...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: OUTPUT_PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '16mm',
      bottom: '16mm',
      left: '14mm',
      right: '14mm'
    }
  });

  // Also copy to artifacts
  fs.copyFileSync(OUTPUT_PDF_PATH, ARTIFACT_PDF_PATH);

  await browser.close();
  console.log('Master API Specification PDF created successfully at:', OUTPUT_PDF_PATH);
}

generatePdf().catch(err => {
  console.error('PDF Generation Failed:', err);
  process.exit(1);
});
