// ==============================================================================
// HZSITD Official Paperless Letter Portal — Express Server & REST API
// Serves static website assets and complete workflow API
// ==============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const db = require('./db');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join:user', (data) => {
    if (data && data.userId) {
      socket.join(`user:${data.userId}`);
    }
  });
});

const PORT = process.env.PORT || 8000;
const ROOT_DIR = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Active Session / Development Testing Role Switcher
// Default to Department Head (Dr. Bezabih Alemu)
let currentUsername = 'dr_bezabih';
let currentUserId = null;

// Helper: Get Current User with Directory Details
function getCurrentUser() {
  let row = null;
  if (currentUserId) {
    row = db.prepare(`
      SELECT u.*, d.name AS directory_name, d.code AS directory_code, d.short_name AS directory_short
      FROM users u
      LEFT JOIN directories d ON u.directory_id = d.id
      WHERE u.id = ?
    `).get(currentUserId);
  }
  if (!row && currentUsername) {
    row = db.prepare(`
      SELECT u.*, d.name AS directory_name, d.code AS directory_code, d.short_name AS directory_short
      FROM users u
      LEFT JOIN directories d ON u.directory_id = d.id
      WHERE u.username = ?
    `).get(currentUsername);
  }
  if (!row) {
    row = db.prepare(`
      SELECT u.*, d.name AS directory_name, d.code AS directory_code, d.short_name AS directory_short
      FROM users u
      LEFT JOIN directories d ON u.directory_id = d.id
      LIMIT 1
    `).get();
  }
  if (row) {
    currentUserId = row.id;
    currentUsername = row.username;
  }
  return row || null;
}

// Helper: Generate Reference Number
function generateRefNo(direction, letterType) {
  const year = new Date().getFullYear();
  const dirPrefix = direction === 'INCOMING' ? 'IN' : 'OUT';
  const countRow = db.prepare(`
    SELECT COUNT(*) AS count FROM letters WHERE reference_no LIKE ?
  `).get(`HZSITD/${dirPrefix}/${year}/%`);
  const seq = String((countRow ? countRow.count : 0) + 1).padStart(3, '0');
  return `HZSITD/${dirPrefix}/${year}/${seq}`;
}

// Helper: Log Timeline Event
function logTimeline(letterId, actorId, action, notes) {
  const actor = db.prepare('SELECT id, full_name, role FROM users WHERE id = ?').get(actorId);
  const name = actor ? actor.full_name : 'System';
  const role = actor ? actor.role : 'System';
  db.prepare(`
    INSERT INTO letter_timeline (letter_id, actor_id, actor_name, actor_role, action, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(letterId, actorId, name, role, action, notes);
}

// ==============================================================================
// 1. AUTH & TESTING ROLE SWITCHING ENDPOINTS
// ==============================================================================

app.get('/api/auth/current-user', (req, res) => {
  const user = getCurrentUser();
  res.json({ success: true, user });
});

app.post(['/api/auth/switch-user', '/api/auth/switch-role'], (req, res) => {
  const { userId, username, role } = req.body;
  let target = null;
  if (userId) {
    target = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  } else if (username) {
    target = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  } else if (role) {
    target = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get(role);
  }
  if (!target) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  currentUserId = target.id;
  const user = getCurrentUser();
  res.json({ success: true, user, message: `Switched session to ${user.full_name} (${user.role})` });
});

app.get('/api/users', (req, res) => {
  const { directory_id, role } = req.query;
  let sql = `
    SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role, u.position_title, 
           u.directory_id, u.avatar_url, d.name AS directory_name, d.short_name AS directory_short
    FROM users u
    LEFT JOIN directories d ON u.directory_id = d.id
    WHERE u.is_active = 1
  `;
  const params = [];
  if (directory_id) {
    sql += ' AND u.directory_id = ?';
    params.push(directory_id);
  }
  if (role) {
    sql += ' AND u.role = ?';
    params.push(role);
  }
  sql += ' ORDER BY u.id ASC';
  const users = db.prepare(sql).all(...params);
  res.json({ success: true, users });
});

app.get('/api/directories', (req, res) => {
  const directories = db.prepare('SELECT * FROM directories ORDER BY id ASC').all();
  res.json({ success: true, directories });
});

// ==============================================================================
// 2. DASHBOARD METRICS & KPI COUNTERS
// ==============================================================================

app.get('/api/stats', (req, res) => {
  const user = getCurrentUser();
  if (!user) return res.status(401).json({ success: false, message: 'Not logged in' });

  const totalLetters = db.prepare('SELECT COUNT(*) AS count FROM letters').get().count;
  const urgentLetters = db.prepare("SELECT COUNT(*) AS count FROM letters WHERE priority = 'Urgent'").get().count;
  const archivedLetters = db.prepare("SELECT COUNT(*) AS count FROM letters WHERE status IN ('Archived', 'Dispatched')").get().count;

  // Inbox & Pending calculation based on hierarchy
  let pendingCount = 0;
  let inboxCount = 0;

  if (user.role === 'Department Head') {
    // Dept Head sees all incoming ministerial/external letters + outgoing letters awaiting final endorsement
    pendingCount = db.prepare(`
      SELECT COUNT(*) AS count FROM letters 
      WHERE (direction = 'OUTGOING' AND approval_stage = 'Department Head Endorsement')
         OR (direction = 'INCOMING' AND status = 'Under Review' AND assigned_officer_id IS NULL)
    `).get().count;

    inboxCount = db.prepare(`
      SELECT COUNT(*) AS count FROM letters 
      WHERE (direction = 'INCOMING' AND recipient_directory_id = ?)
         OR (direction = 'OUTGOING' AND approval_stage = 'Department Head Endorsement')
         OR (recipient_directory_id = ? AND recipient_type = 'INTERNAL')
         OR (assigned_officer_id = ?)
    `).get(user.directory_id, user.directory_id, user.id).count;
  } else if (user.role === 'Directory Lead') {
    // Directory Lead sees incoming routed to their directory + outgoing drafts from their officers awaiting review
    pendingCount = db.prepare(`
      SELECT COUNT(*) AS count FROM letters 
      WHERE (direction = 'OUTGOING' AND approval_stage = 'Directory Lead Review' AND sender_directory_id = ?)
         OR (direction = 'INCOMING' AND recipient_directory_id = ? AND assigned_officer_id IS NULL)
    `).get(user.directory_id, user.directory_id).count;

    inboxCount = db.prepare(`
      SELECT COUNT(*) AS count FROM letters 
      WHERE (recipient_directory_id = ? AND (direction = 'INCOMING' OR recipient_type = 'INTERNAL'))
         OR (assigned_officer_id = ?)
         OR (direction = 'OUTGOING' AND approval_stage = 'Directory Lead Review' AND sender_directory_id = ?)
    `).get(user.directory_id, user.id, user.directory_id).count;
  } else {
    // Level 1 Officer sees letters assigned to them or returned to them
    pendingCount = db.prepare(`
      SELECT COUNT(*) AS count FROM letters 
      WHERE (assigned_officer_id = ? AND status = 'Under Review')
         OR (created_by = ? AND status = 'Returned for Revision')
    `).get(user.id, user.id).count;

    inboxCount = db.prepare(`
      SELECT COUNT(*) AS count FROM letters 
      WHERE assigned_officer_id = ? OR (created_by = ? AND status = 'Returned for Revision')
    `).get(user.id, user.id).count;
  }

  const sentCount = db.prepare(`
    SELECT COUNT(*) AS count FROM letters 
    WHERE sender_id = ? OR created_by = ?
  `).get(user.id, user.id).count;

  res.json({
    success: true,
    stats: {
      totalLetters,
      inboxCount,
      sentCount,
      pendingCount,
      urgentLetters,
      archivedLetters,
      userRole: user.role,
      userName: user.full_name
    }
  });
});

// ==============================================================================
// 3. LETTERS CRUD & WORKFLOW TAB FILTERS
// ==============================================================================

app.get('/api/letters', (req, res) => {
  const user = getCurrentUser();
  const { tab = 'all', status, priority, direction, search } = req.query;

  let sql = `
    SELECT l.*, 
           u_sender.full_name AS sender_name, u_sender.position_title AS sender_title,
           d_sender.name AS sender_dir_name, d_sender.short_name AS sender_dir_short,
           d_recip.name AS recipient_dir_name, d_recip.short_name AS recipient_dir_short,
           u_assigned.full_name AS assigned_officer_name,
           u_endorsed.full_name AS endorsed_by_name,
           (SELECT COUNT(*) FROM attachments a WHERE a.letter_id = l.id) AS attachment_count,
           (SELECT COUNT(*) FROM attachments a WHERE a.letter_id = l.id AND (a.mime_type LIKE '%pdf%' OR a.filename LIKE '%.pdf')) AS has_pdf
    FROM letters l
    LEFT JOIN users u_sender ON l.sender_id = u_sender.id
    LEFT JOIN directories d_sender ON l.sender_directory_id = d_sender.id
    LEFT JOIN directories d_recip ON l.recipient_directory_id = d_recip.id
    LEFT JOIN users u_assigned ON l.assigned_officer_id = u_assigned.id
    LEFT JOIN users u_endorsed ON l.endorsed_by = u_endorsed.id
    WHERE 1=1
  `;
  const params = [];

  // Hierarchy-aware tab filtering
  if (tab === 'inbox') {
    if (user.role === 'Department Head') {
      sql += ` AND (
        (l.direction = 'INCOMING')
        OR (l.direction = 'OUTGOING' AND l.approval_stage = 'Department Head Endorsement')
        OR (l.recipient_directory_id = ? AND l.recipient_type = 'INTERNAL')
        OR (l.assigned_officer_id = ?)
      )`;
      params.push(user.directory_id, user.id);
    } else if (user.role === 'Directory Lead') {
      sql += ` AND (
        (l.recipient_directory_id = ? AND (l.direction = 'INCOMING' OR l.recipient_type = 'INTERNAL'))
        OR (l.assigned_officer_id = ?)
        OR (l.direction = 'OUTGOING' AND l.approval_stage = 'Directory Lead Review' AND l.sender_directory_id = ?)
      )`;
      params.push(user.directory_id, user.id, user.directory_id);
    } else {
      // Officer
      sql += ` AND (l.assigned_officer_id = ? OR (l.created_by = ? AND l.status = 'Returned for Revision'))`;
      params.push(user.id, user.id);
    }
  } else if (tab === 'sent') {
    sql += ` AND (l.sender_id = ? OR l.created_by = ?)`;
    params.push(user.id, user.id);
  } else if (tab === 'drafts') {
    sql += ` AND l.status = 'Draft' AND l.created_by = ?`;
    params.push(user.id);
  } else if (tab === 'archived') {
    sql += ` AND l.status IN ('Archived', 'Dispatched')`;
  }

  if (status) {
    sql += ` AND l.status = ?`;
    params.push(status);
  }
  if (priority) {
    sql += ` AND l.priority = ?`;
    params.push(priority);
  }
  if (direction) {
    sql += ` AND l.direction = ?`;
    params.push(direction);
  }
  if (search) {
    sql += ` AND (l.reference_no LIKE ? OR l.subject LIKE ? OR l.body LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  sql += ' ORDER BY l.id DESC';
  const letters = db.prepare(sql).all(...params);
  res.json({ success: true, count: letters.length, letters });
});

// Public Letter Tracking (Must precede /api/letters/:id to avoid Express param collision)
app.get(['/api/letters/track/:ref(*)', '/api/letters/track'], (req, res) => {
  const ref = req.params.ref || req.query.ref;
  if (!ref) {
    return res.status(400).json({ success: false, message: 'Reference number is required' });
  }
  const letter = db.prepare(`
    SELECT l.id, l.reference_no, l.direction, l.subject, l.priority, l.letter_type, 
           l.status, l.approval_stage, l.created_at, l.dispatched_at, l.verification_hash,
           d_recip.name AS recipient_dir_name,
           d_sender.name AS sender_dir_name,
           u_endorsed.full_name AS endorsed_by_name
    FROM letters l
    LEFT JOIN directories d_recip ON l.recipient_directory_id = d_recip.id
    LEFT JOIN directories d_sender ON l.sender_directory_id = d_sender.id
    LEFT JOIN users u_endorsed ON l.endorsed_by = u_endorsed.id
    WHERE l.reference_no = ? OR l.id = ?
  `).get(ref, ref);

  if (!letter) {
    return res.status(404).json({ success: false, message: 'No letter found with this tracking reference.' });
  }

  const timeline = db.prepare(`
    SELECT actor_name, actor_role, action, notes, created_at 
    FROM letter_timeline 
    WHERE letter_id = ? 
    ORDER BY id ASC
  `).all(letter.id);

  res.json({ success: true, letter, timeline });
});

// Single Letter with Detailed Timeline, Comments, and Attachments
app.get('/api/letters/:id', (req, res) => {
  const { id } = req.params;
  const letter = db.prepare(`
    SELECT l.*, 
           u_sender.full_name AS sender_name, u_sender.position_title AS sender_title, u_sender.email AS sender_email,
           d_sender.name AS sender_dir_name, d_sender.short_name AS sender_dir_short,
           d_recip.name AS recipient_dir_name, d_recip.short_name AS recipient_dir_short,
           u_assigned.full_name AS assigned_officer_name, u_assigned.email AS assigned_officer_email,
           u_endorsed.full_name AS endorsed_by_name, u_endorsed.position_title AS endorsed_by_title
    FROM letters l
    LEFT JOIN users u_sender ON l.sender_id = u_sender.id
    LEFT JOIN directories d_sender ON l.sender_directory_id = d_sender.id
    LEFT JOIN directories d_recip ON l.recipient_directory_id = d_recip.id
    LEFT JOIN users u_assigned ON l.assigned_officer_id = u_assigned.id
    LEFT JOIN users u_endorsed ON l.endorsed_by = u_endorsed.id
    WHERE l.id = ?
  `).get(id);

  if (!letter) {
    return res.status(404).json({ success: false, message: 'Letter not found' });
  }

  const timeline = db.prepare(`
    SELECT * FROM letter_timeline WHERE letter_id = ? ORDER BY id ASC
  `).all(id);

  const comments = db.prepare(`
    SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.avatar_url
    FROM letter_comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.letter_id = ?
    ORDER BY c.id ASC
  `).all(id);

  const attachments = db.prepare(`
    SELECT * FROM attachments WHERE letter_id = ? ORDER BY id ASC
  `).all(id);

  res.json({ success: true, letter, timeline, comments, attachments });
});

// Create / Compose Letter
app.post('/api/letters', (req, res) => {
  const user = getCurrentUser();
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const {
    direction = 'OUTGOING',
    subject,
    body,
    priority = 'Routine',
    letter_type = 'Official Letter',
    recipient_type = 'INTERNAL',
    recipient_directory_id = null,
    assigned_officer_id = null,
    external_sender_name = null,
    external_sender_org = null,
    external_sender_ref = null,
    external_recipient_name = null,
    external_recipient_org = null,
    external_recipient_address = null,
    is_draft = false
  } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ success: false, message: 'Subject and Letter Body are required.' });
  }

  // Administrative Protocol Check: Prevent sending letter to oneself
  const isDirectingToSelf = (assigned_officer_id && Number(assigned_officer_id) === user.id);
  const isDirectingToOwnDirWithoutOfficer = (!assigned_officer_id && recipient_directory_id && Number(recipient_directory_id) === user.directory_id && user.role !== 'Department Head');

  if (direction === 'OUTGOING' && recipient_type === 'INTERNAL' && (isDirectingToSelf || isDirectingToOwnDirWithoutOfficer)) {
    return res.status(400).json({
      success: false,
      message: isDirectingToSelf
        ? 'Administrative Protocol Violation: An author cannot address an internal letter or directive to themselves.'
        : 'Administrative Protocol Violation: Please designate a specific officer/lead or select a subordinate target directorate.'
    });
  }

  const refNo = generateRefNo(direction, letter_type);

  let initialStatus = 'Draft';
  let initialStage = 'Officer Draft';

  if (!is_draft) {
    if (direction === 'INCOMING') {
      initialStatus = 'Under Review';
      initialStage = 'Officer Draft';
    } else {
      // OUTGOING letter submission flow:
      if (user.role === 'Officer') {
        initialStatus = 'Under Review';
        initialStage = 'Directory Lead Review'; // routes up to Lead
      } else if (user.role === 'Directory Lead') {
        initialStatus = 'Pending Department Head';
        initialStage = 'Department Head Endorsement'; // routes up to Head
      } else if (user.role === 'Department Head') {
        initialStatus = 'Approved';
        initialStage = 'Completed';
      }
    }
  }

  const result = db.prepare(`
    INSERT INTO letters (
      reference_no, direction, subject, body, priority, letter_type,
      sender_type, external_sender_name, external_sender_org, external_sender_ref,
      sender_id, sender_directory_id, recipient_type, recipient_directory_id,
      assigned_officer_id, external_recipient_name, external_recipient_org, external_recipient_address,
      status, approval_stage, created_by, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime')
    )
  `).run(
    refNo,
    direction,
    subject,
    body,
    priority,
    letter_type,
    direction === 'INCOMING' ? 'EXTERNAL' : 'INTERNAL',
    external_sender_name,
    external_sender_org,
    external_sender_ref,
    user.id,
    user.directory_id,
    recipient_type,
    recipient_directory_id,
    assigned_officer_id,
    external_recipient_name,
    external_recipient_org,
    external_recipient_address,
    initialStatus,
    initialStage,
    user.id
  );

  const letterId = result.lastInsertRowid;

  // Insert attachments if provided
  if (Array.isArray(req.body.attachments) && req.body.attachments.length > 0) {
    const insertAtt = db.prepare(`
      INSERT INTO attachments (letter_id, filename, original_name, mime_type, file_size, file_path, uploaded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    for (const att of req.body.attachments) {
      if (att && att.filename) {
        insertAtt.run(
          letterId,
          att.filename,
          att.original_name || att.filename,
          att.mime_type || 'application/pdf',
          att.file_size || 0,
          att.url || `/uploads/${att.filename}`,
          user.id
        );
      }
    }
  }

  // Log Timeline
  const actionText = is_draft ? 'Draft Created' : 'Letter Submitted';
  let notes = is_draft 
    ? `Saved as draft by ${user.full_name}.`
    : `Submitted by ${user.full_name} (${user.role}). Routed to ${initialStage}.`;

  if (!is_draft && assigned_officer_id) {
    const assignedUser = db.prepare('SELECT full_name, role, position_title FROM users WHERE id = ?').get(assigned_officer_id);
    if (assignedUser) {
      notes += ` Specifically directed to ${assignedUser.full_name} (${assignedUser.role} — ${assignedUser.position_title}).`;
    }
  }
  logTimeline(letterId, user.id, actionText, notes);

  // Real-time notification broadcast
  io.emit('letter:created', {
    letterId,
    reference_no: refNo,
    subject,
    sender: user.full_name
  });

  res.status(201).json({
    success: true,
    message: is_draft ? 'Letter saved as draft' : 'Letter submitted successfully',
    letterId,
    letter_id: letterId,
    referenceNo: refNo,
    reference_no: refNo
  });
});

// ==============================================================================
// 4. HIERARCHICAL WORKFLOW STATE ENGINE (SCENARIOS A & B)
// ==============================================================================

app.post('/api/letters/:id/action', (req, res) => {
  const user = getCurrentUser();
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const { action, notes, recipient_directory_id, assigned_officer_id, signature_type, custom_signature } = req.body;

  const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(id);
  if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });

  const now = new Date().toISOString();

  // 1. Submit / Escalate from Officer to Directory Lead
  if (action === 'submit_to_lead') {
    db.prepare(`
      UPDATE letters 
      SET status = 'Under Review', approval_stage = 'Directory Lead Review', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(id);
    logTimeline(id, user.id, 'Submitted for Review', notes || 'Forwarded to Directory Lead for review.');
  }

  // 2. Approve from Directory Lead to Department Head
  else if (action === 'approve_to_head') {
    if (user.role !== 'Directory Lead' && user.role !== 'Department Head' && user.role !== 'System Admin') {
      return res.status(403).json({ success: false, message: 'Only Directory Lead or Head can elevate letters to executive approval.' });
    }
    db.prepare(`
      UPDATE letters 
      SET status = 'Pending Department Head', approval_stage = 'Department Head Endorsement', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(id);
    logTimeline(id, user.id, 'Reviewed & Recommended', notes || 'Directory Lead verified contents and forwarded to Department Head for final endorsement.');
    if (notes) {
      db.prepare(`INSERT INTO letter_comments (letter_id, author_id, comment_text, comment_type) VALUES (?, ?, ?, 'Minute')`).run(id, user.id, notes);
    }
  }

  // 3. Return for Revision (Back to Officer)
  else if (action === 'return_for_revision') {
    db.prepare(`
      UPDATE letters 
      SET status = 'Returned for Revision', approval_stage = 'Returned', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(id);
    logTimeline(id, user.id, 'Returned for Revision', notes || 'Returned to drafting officer for necessary corrections.');
    if (notes) {
      db.prepare(`INSERT INTO letter_comments (letter_id, author_id, comment_text, comment_type) VALUES (?, ?, ?, 'Revision Request')`).run(id, user.id, notes);
    }
  }

  // 4. Executive Endorsement, Digital Signature & Official Seal Stamp (Department Head Final Step)
  else if (action === 'endorse_and_sign') {
    if (user.role !== 'Department Head' && user.role !== 'System Admin') {
      return res.status(403).json({ success: false, message: 'Only Department Head can officially sign and stamp letters.' });
    }

    // Determine Signature Image/Data
    let signatureData = user.signature_url;
    if (signature_type === 'DRAWN' && custom_signature) {
      signatureData = custom_signature;
    } else if (signature_type === 'UPLOADED' && custom_signature) {
      signatureData = custom_signature;
    }

    const stampData = user.stamp_url;

    // Generate SHA-256 Verification Hash
    const rawHashString = `${letter.reference_no}|${letter.subject}|${user.full_name}|${now}`;
    const verificationHash = crypto.createHash('sha256').update(rawHashString).digest('hex');

    db.prepare(`
      UPDATE letters 
      SET status = 'Dispatched',
          approval_stage = 'Completed',
          digital_signature = ?,
          signature_type = ?,
          stamp_data = ?,
          endorsed_by = ?,
          endorsed_at = datetime('now', 'localtime'),
          dispatched_at = datetime('now', 'localtime'),
          verification_hash = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(signatureData, signature_type || 'PROFILE', stampData, user.id, verificationHash, id);

    logTimeline(id, user.id, 'Endorsed & Digitally Signed', notes || 'Official digital signature and department seal applied. Verification QR generated.');
    if (notes) {
      db.prepare(`INSERT INTO letter_comments (letter_id, author_id, comment_text, comment_type) VALUES (?, ?, ?, 'Minute')`).run(id, user.id, notes);
    }
  }

  // 5. Scenario A: Department Head assigns incoming letter down to Directory
  else if (action === 'assign_to_directory') {
    if (user.role !== 'Department Head' && user.role !== 'System Admin') {
      return res.status(403).json({ success: false, message: 'Only Department Head can assign incoming correspondence to a Directory.' });
    }
    db.prepare(`
      UPDATE letters 
      SET recipient_directory_id = ?, status = 'Under Review', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(recipient_directory_id, id);

    const dir = db.prepare('SELECT name FROM directories WHERE id = ?').get(recipient_directory_id);
    logTimeline(id, user.id, 'Assigned Down to Directory', `Assigned to ${dir ? dir.name : 'Directory'}. Notes: ${notes || 'Action required.'}`);
    if (notes) {
      db.prepare(`INSERT INTO letter_comments (letter_id, author_id, comment_text, comment_type) VALUES (?, ?, ?, 'Minute')`).run(id, user.id, notes);
    }
  }

  // 6. Scenario A: Directory Lead delegates to specific Officer
  else if (action === 'delegate_to_officer') {
    if (user.role !== 'Directory Lead' && user.role !== 'Department Head' && user.role !== 'System Admin') {
      return res.status(403).json({ success: false, message: 'Only Directory Lead or Head can delegate to an officer.' });
    }
    db.prepare(`
      UPDATE letters 
      SET assigned_officer_id = ?, status = 'Under Review', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(assigned_officer_id, id);

    const officer = db.prepare('SELECT full_name FROM users WHERE id = ?').get(assigned_officer_id);
    logTimeline(id, user.id, 'Delegated to Officer', `Delegated to ${officer ? officer.full_name : 'Officer'}. Notes: ${notes || 'Please handle this.'}`);
    if (notes) {
      db.prepare(`INSERT INTO letter_comments (letter_id, author_id, comment_text, comment_type) VALUES (?, ?, ?, 'Instruction')`).run(id, user.id, notes);
    }
  }

  // 7. General Archive
  else if (action === 'archive') {
    db.prepare(`
      UPDATE letters 
      SET status = 'Archived', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(id);
    logTimeline(id, user.id, 'Archived', notes || 'Letter archived permanently in records.');
  }

  io.emit('letter:action', {
    letterId: id,
    reference_no: letter ? letter.reference_no : `Letter #${id}`,
    action,
    actor: user.full_name
  });

  res.json({ success: true, message: `Action '${action}' executed successfully.` });
});

// Add Comment / Minute
app.post('/api/letters/:id/comments', (req, res) => {
  const user = getCurrentUser();
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const { comment_text, comment_type = 'Minute' } = req.body;

  if (!comment_text) return res.status(400).json({ success: false, message: 'Comment text is required.' });

  db.prepare(`
    INSERT INTO letter_comments (letter_id, author_id, comment_text, comment_type, created_at)
    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(id, user.id, comment_text, comment_type);

  logTimeline(id, user.id, 'Comment Added', comment_text);

  const letter = db.prepare('SELECT reference_no FROM letters WHERE id = ?').get(id);
  io.emit('letter:comment', {
    letterId: id,
    reference_no: letter ? letter.reference_no : `Letter #${id}`,
    author: user.full_name,
    text: comment_text
  });

  res.json({ success: true, message: 'Comment added successfully' });
});

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      url: fileUrl
    }
  });
});

// Attach Documents to Letter Endpoint
app.post('/api/letters/:id/attachments', upload.array('files', 10), (req, res) => {
  const user = getCurrentUser();
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const letterId = Number(req.params.id);
  const letter = db.prepare('SELECT id, reference_no FROM letters WHERE id = ?').get(letterId);
  if (!letter) {
    return res.status(404).json({ success: false, message: 'Letter not found.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded.' });
  }

  const insertAtt = db.prepare(`
    INSERT INTO attachments (letter_id, filename, original_name, mime_type, file_size, file_path, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);

  const inserted = [];
  for (const f of req.files) {
    const fileUrl = `/uploads/${f.filename}`;
    const result = insertAtt.run(
      letterId,
      f.filename,
      f.originalname,
      f.mimetype,
      f.size,
      fileUrl,
      user.id
    );
    inserted.push({
      id: result.lastInsertRowid,
      letter_id: letterId,
      filename: f.filename,
      original_name: f.originalname,
      mime_type: f.mimetype,
      file_size: f.size,
      file_path: fileUrl
    });
  }

  logTimeline(letterId, user.id, 'Documents Attached', `${req.files.length} document(s) uploaded by ${user.full_name}.`);
  io.emit('letter:updated', { letterId });

  res.json({
    success: true,
    message: 'Attachments uploaded successfully',
    attachments: inserted
  });
});

// ==============================================================================
// 5. INTER-OFFICE CHAT MESSAGES
// ==============================================================================

app.get('/api/chat', (req, res) => {
  const user = getCurrentUser();
  const { channel = 'general', recipient_id } = req.query;

  let sql = `
    SELECT m.*, u.full_name AS sender_name, u.role AS sender_role, u.avatar_url AS sender_avatar
    FROM chat_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (recipient_id) {
    sql += ` AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))`;
    params.push(user.id, recipient_id, recipient_id, user.id);
  } else {
    sql += ` AND m.channel = ?`;
    params.push(channel);
  }

  sql += ' ORDER BY m.id ASC LIMIT 100';
  const messages = db.prepare(sql).all(...params);
  res.json({ success: true, messages });
});

app.post('/api/chat', (req, res) => {
  const user = getCurrentUser();
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { message_text, channel = 'general', recipient_id = null, attachment_url = null } = req.body;
  if (!message_text) return res.status(400).json({ success: false, message: 'Message text required' });

  db.prepare(`
    INSERT INTO chat_messages (sender_id, recipient_id, channel, message_text, attachment_url, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(user.id, recipient_id, channel, message_text, attachment_url);

  res.json({ success: true, message: 'Message sent' });
});

// Full Audit Log for Administrative Oversight
app.get('/api/audit-logs', (req, res) => {
  const logs = db.prepare(`
    SELECT t.*, l.reference_no, l.subject, l.direction, l.status AS letter_status
    FROM letter_timeline t
    JOIN letters l ON t.letter_id = l.id
    ORDER BY t.id DESC LIMIT 150
  `).all();
  res.json({ success: true, count: logs.length, logs });
});

// System Settings
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM system_settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json({ success: true, settings });
});

// ==============================================================================
// 6. STATIC ASSET HOSTING & CLIENT ROUTING
// ==============================================================================

app.use('/assets', express.static(path.join(ROOT_DIR, 'assets')));
app.use('/html', express.static(path.join(ROOT_DIR, 'html')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Root URL redirects to portal or home
app.get('/', (req, res) => {
  res.redirect('/html/index.html');
});

// Start Server with Socket.io
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🚀 HZSITD Server & Letter Portal Live!`);
  console.log(`  🔗 Web Portal:  http://localhost:${PORT}/html/letter-portal.html`);
  console.log(`  ⚡ Realtime WS: http://localhost:${PORT} (Socket.io)`);
  console.log(`  🏠 Homepage:    http://localhost:${PORT}/html/index.html`);
  console.log(`  📦 REST API:    http://localhost:${PORT}/api/...`);
  console.log(`=======================================================`);
});
