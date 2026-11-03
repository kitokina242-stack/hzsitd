const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_PDF_PATH = 'C:\\Users\\USER\\Desktop\\HZSITD\\HZSITD_Backend_API_Specification.pdf';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HZSITD Backend Technical Integration Specification</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    /* Header Banner */
    .doc-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .doc-brand {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .doc-org {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #0e9be6;
    }

    .doc-title {
      font-size: 19pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 2px 0 0 0;
    }

    .doc-sub {
      font-size: 10pt;
      color: #64748b;
      margin-top: 2px;
    }

    .doc-meta {
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
      line-height: 1.4;
    }

    .doc-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    /* Section Styling */
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 12.5pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      color: #ffffff;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 700;
    }

    p {
      margin: 0 0 10px 0;
      color: #334155;
      font-size: 9.5pt;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 9pt;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1.5px solid #cbd5e1;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Badges */
    .method {
      display: inline-block;
      font-weight: 700;
      font-size: 7.5pt;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .method.get { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .method.post { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 3px;
      color: #0f172a;
      border: 1px solid #e2e8f0;
    }

    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8pt;
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      margin: 8px 0 12px 0;
      overflow-x: auto;
      line-height: 1.45;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }

    .card-title {
      font-weight: 700;
      font-size: 9pt;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .note-box {
      background: #f0fdf4;
      border-left: 3.5px solid #16a34a;
      padding: 8px 12px;
      margin: 10px 0;
      font-size: 8.5pt;
      color: #166534;
      border-radius: 0 4px 4px 0;
    }

    .warning-box {
      background: #fffbeb;
      border-left: 3.5px solid #f59e0b;
      padding: 8px 12px;
      margin: 10px 0;
      font-size: 8.5pt;
      color: #92400e;
      border-radius: 0 4px 4px 0;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="doc-header">
    <div class="doc-brand">
      <div class="doc-org">Hadiya Zone Science & Information Technology Department</div>
      <h1 class="doc-title">Backend API & System Contract</h1>
      <div class="doc-sub">Technical Handover Specifications — Modules 3 to 7</div>
    </div>
    <div class="doc-meta">
      <div class="doc-badge">Official Specification</div>
      <div><strong>Target Team:</strong> Zosimas, Diyana, Setelin</div>
      <div><strong>Frontend Stack:</strong> Next.js 16 + RTK Query</div>
      <div><strong>Date:</strong> October 2026</div>
    </div>
  </div>

  <!-- SECTION 3 -->
  <div class="section">
    <div class="section-title">
      <span class="section-num">3</span>
      <span>REST API Contract Expected by Frontend (Base URL: /api)</span>
    </div>
    <p>
      The frontend uses <strong>Redux Toolkit Query (RTK Query)</strong> with automatic Bearer token injection (<code>Authorization: Bearer &lt;token&gt;</code>). The backend Express server must expose the endpoints listed below under the <code>/api</code> route namespace.
    </p>

    <table>
      <thead>
        <tr>
          <th style="width: 14%;">Module</th>
          <th style="width: 9%;">Method</th>
          <th style="width: 32%;">Endpoint</th>
          <th style="width: 45%;">Expected Request / Response Contract</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Auth</strong></td>
          <td><span class="method post">POST</span></td>
          <td><code>/api/auth/login</code></td>
          <td>
            <strong>Body:</strong> <code>{ email, password }</code><br>
            <strong>Returns:</strong> <code>{ token, user: { id, full_name, email, role, directory_id } }</code>
          </td>
        </tr>
        <tr>
          <td><strong>Auth</strong></td>
          <td><span class="method get">GET</span></td>
          <td><code>/api/auth/me</code></td>
          <td>
            Validates Bearer token in header.<br>
            <strong>Returns:</strong> <code>{ user: { id, full_name, email, role, directory_id } }</code>
          </td>
        </tr>
        <tr>
          <td><strong>Letters</strong></td>
          <td><span class="method get">GET</span></td>
          <td><code>/api/letters?tab=&amp;search=&amp;page=</code></td>
          <td>
            Supports query params: <code>tab</code> (inbox/outbound/archive), <code>search</code>, <code>page</code>.<br>
            <strong>Returns:</strong> <code>{ letters: Letter[], total: number }</code>
          </td>
        </tr>
        <tr>
          <td><strong>Letters</strong></td>
          <td><span class="method get">GET</span></td>
          <td><code>/api/letters/:id</code></td>
          <td>
            Returns letter with minutes, audit trail, and attachments.<br>
            <strong>Returns:</strong> Full <code>Letter</code> object with nested relations.
          </td>
        </tr>
        <tr>
          <td><strong>Letters</strong></td>
          <td><span class="method post">POST</span></td>
          <td><code>/api/letters</code></td>
          <td>
            Drafts new correspondence.<br>
            <strong>Body:</strong> <code>{ subject, body, priority, recipient_directory, attachments }</code>
          </td>
        </tr>
        <tr>
          <td><strong>Letters</strong></td>
          <td><span class="method post">POST</span></td>
          <td><code>/api/letters/:id/action</code></td>
          <td>
            Executes stage transition & legal seal endorsement.<br>
            <strong>Body:</strong> <code>{ action: "submit_review" | "endorse_seal" | "return_for_revision" | "delegate_officer", comment?, target_officer_id? }</code>
          </td>
        </tr>
        <tr>
          <td><strong>Stats</strong></td>
          <td><span class="method get">GET</span></td>
          <td><code>/api/stats</code></td>
          <td>
            Dashboard cards aggregate metrics.<br>
            <strong>Returns:</strong> <code>{ totalLetters, sentCount, pendingCount, archivedCount, clearanceQueueCount }</code>
          </td>
        </tr>
        <tr>
          <td><strong>Directories</strong></td>
          <td><span class="method get">GET</span></td>
          <td><code>/api/directories</code></td>
          <td>
            Returns all 9 zonal departmental directorates.<br>
            <strong>Returns:</strong> <code>Array&lt;{ id, name, code, lead_name }&gt;</code>
          </td>
        </tr>
        <tr>
          <td><strong>Users</strong></td>
          <td><span class="method get">GET</span></td>
          <td><code>/api/users?role=&amp;directory_id=</code></td>
          <td>
            Directory personnel for delegation and clearance dropdowns.<br>
            <strong>Returns:</strong> <code>Array&lt;{ id, full_name, email, role, directory_id }&gt;</code>
          </td>
        </tr>
        <tr>
          <td><strong>Public</strong></td>
          <td><span class="method get">GET</span></td>
          <td><code>/api/letters/track?ref=</code></td>
          <td>
            Public document authenticity check for <code>/verify</code>.<br>
            <strong>Returns:</strong> <code>{ reference_no, subject, seal_hash, date_issued, status }</code>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 4 -->
  <div class="section">
    <div class="section-title">
      <span class="section-num">4</span>
      <span>Socket.io Real-Time Synchronization Events</span>
    </div>
    <p>
      The frontend incorporates a global <code>useSocket</code> hook connecting to <code>http://localhost:8000</code>. When correspondence changes state, the backend should emit the following events to automatically invalidate and refetch queue caches:
    </p>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">1. Letter Created (<code>letter_created</code>)</div>
        <p>Emitted whenever a new incoming or outgoing letter is drafted.</p>
        <pre>{
  "letterId": 104,
  "reference_no": "HZSITD/OUT/2026/042",
  "sender_name": "Dr. Bezabih Alemu",
  "timestamp": "2026-10-18T14:30:00Z"
}</pre>
      </div>

      <div class="card">
        <div class="card-title">2. Letter Actioned (<code>letter_actioned</code>)</div>
        <p>Emitted upon stage transition, review endorsement, or seal dispatch.</p>
        <pre>{
  "letterId": 104,
  "action": "endorse_seal",
  "newStatus": "Sealed & Dispatched",
  "approval_stage": "Completed",
  "actor_name": "Dr. Bezabih Alemu"
}</pre>
      </div>
    </div>

    <div class="card" style="margin-top: 6px;">
      <div class="card-title">3. New Direct Notification (<code>notification_new</code>)</div>
      <p>Emitted to alert a designated officer or directory lead of direct assignments.</p>
      <pre>{
  "recipient_id": 4,
  "title": "Directive Delegated: ICT Infrastructure",
  "message": "You have been delegated letter ref: HZSITD/IN/2026/018 by Directory Lead.",
  "letter_id": 104
}</pre>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 5 -->
  <div class="section">
    <div class="section-title">
      <span class="section-num">5</span>
      <span>Role Strings & Prisma Enums</span>
    </div>
    <p>
      The frontend enforces strict TypeScript union types. The Prisma schema, database migrations, and Zod validator schemas <strong>must match these exact string literals</strong>:
    </p>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">Prisma Enum: UserRole</div>
        <pre>enum UserRole {
  DEPARTMENT_HEAD  @map("Department Head")
  DIRECTORY_LEAD   @map("Directory Lead")
  OFFICER          @map("Officer")
  SYSTEM_ADMIN     @map("System Admin")
}</pre>
      </div>

      <div class="card">
        <div class="card-title">Zod Schema Validation (TypeScript)</div>
        <pre>import { z } from 'zod';

export const RoleEnum = z.enum([
  'Department Head',
  'Directory Lead',
  'Officer',
  'System Admin'
]);</pre>
      </div>
    </div>

    <div class="grid-2" style="margin-top: 6px;">
      <div class="card">
        <div class="card-title">Letter Priority Values</div>
        <p><code>'Routine'</code> | <code>'Urgent'</code> | <code>'Express'</code> | <code>'Executive Immediate'</code></p>
      </div>
      <div class="card">
        <div class="card-title">Letter Status Values</div>
        <p><code>'Draft'</code> | <code>'Pending Clearance'</code> | <code>'Executive Review'</code> | <code>'Sealed & Dispatched'</code> | <code>'Archived'</code></p>
      </div>
    </div>
  </div>

  <!-- SECTION 6 -->
  <div class="section">
    <div class="section-title">
      <span class="section-num">6</span>
      <span>Frontend Environment Variables & CORS Configuration</span>
    </div>
    <p>
      The Next.js frontend connects to your Express service using standard client-side environment variables. Ensure the Express server enables CORS for all configured frontend origins.
    </p>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">Frontend Environment Variables (.env.local)</div>
        <pre># Express REST API Base URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Socket.io Real-Time Server
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000</pre>
      </div>

      <div class="card">
        <div class="card-title">Express CORS Configuration Example</div>
        <pre>import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://hzsitd.gov.et',
    /\\.vercel\\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));</pre>
      </div>
    </div>

    <div class="warning-box">
      <strong>CORS Preflight Notice:</strong> Ensure your Express backend handles <code>OPTIONS</code> requests cleanly and allows the <code>Authorization</code> header; otherwise, JWT token authentication will fail during cross-origin preflight checks.
    </div>
  </div>

  <!-- SECTION 7 -->
  <div class="section">
    <div class="section-title">
      <span class="section-num">7</span>
      <span>Working Reference Implementation in Repository</span>
    </div>
    <p>
      A fully operational reference server with working Express route handlers, SQLite schema, and realistic institutional seed data is included directly in the project repository for your reference:
    </p>

    <table>
      <thead>
        <tr>
          <th style="width: 32%;">Reference File</th>
          <th style="width: 68%;">Description & Practical Usage</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>HZSITD/backend/server.js</code></td>
          <td>Complete Express server demonstrating authentication verification, letter stage transitions, and Socket.io broadcasts.</td>
        </tr>
        <tr>
          <td><code>HZSITD/backend/db.js</code></td>
          <td>Database schema definition showing relational tables: <code>users</code>, <code>directories</code>, <code>letters</code>, <code>minutes</code>, <code>attachments</code>, and <code>audit_logs</code>.</td>
        </tr>
        <tr>
          <td><code>HZSITD/backend/seed.js</code></td>
          <td>Seeded dataset with 9 zonal directories, 4 realistic persona users, and sample correspondence records across all approval stages.</td>
        </tr>
      </tbody>
    </table>

    <div class="note-box">
      <strong>Quick Start Reference Command:</strong> You can spin up the reference backend locally at any time by running:
      <br>
      <code>node HZSITD/backend/server.js</code> (Runs on port 8000).
    </div>
  </div>

</body>
</html>
`;

async function generatePdf() {
  console.log('Generating PDF Specification using Chrome headless...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: OUTPUT_PDF_PATH,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-family: -apple-system, sans-serif; font-size: 7.5pt; color: #94a3b8; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px;">
          <span>HZSITD Letter Portal — Backend Technical Handover</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '14mm',
        bottom: '16mm',
        left: '14mm',
        right: '14mm'
      }
    });

    console.log('PDF generated successfully at:', OUTPUT_PDF_PATH);
  } catch (err) {
    console.error('Error generating PDF:', err);
  } finally {
    await browser.close();
  }
}

generatePdf();
