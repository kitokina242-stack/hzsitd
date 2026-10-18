// ==============================================================================
// HZSITD Official Paperless Letter Portal — Database Engine
// Engine: SQLite via native Node 22 `node:sqlite` (DatabaseSync)
// ==============================================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'hzsitd_portal.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high-performance and relational integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize Tables
function initSchema() {
  db.exec(`
    -- 1. Directories Table
    CREATE TABLE IF NOT EXISTS directories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      amharic_name TEXT,
      short_name TEXT,
      icon TEXT DEFAULT 'lucide:folder',
      description TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 2. Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK (role IN ('Officer', 'Directory Lead', 'Department Head', 'System Admin')),
      directory_id INTEGER REFERENCES directories(id),
      position_title TEXT NOT NULL,
      signature_url TEXT,
      stamp_url TEXT,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 3. Letters Table
    CREATE TABLE IF NOT EXISTS letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING')),
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Routine' CHECK (priority IN ('Routine', 'Normal', 'Urgent', 'Confidential')),
      letter_type TEXT NOT NULL DEFAULT 'Official Letter',
      sender_type TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (sender_type IN ('INTERNAL', 'EXTERNAL')),
      external_sender_name TEXT,
      external_sender_org TEXT,
      external_sender_ref TEXT,
      sender_id INTEGER REFERENCES users(id),
      sender_directory_id INTEGER REFERENCES directories(id),
      recipient_type TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (recipient_type IN ('INTERNAL', 'EXTERNAL')),
      recipient_directory_id INTEGER REFERENCES directories(id),
      assigned_officer_id INTEGER REFERENCES users(id),
      external_recipient_name TEXT,
      external_recipient_org TEXT,
      external_recipient_address TEXT,
      status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN (
        'Draft', 
        'Under Review', 
        'Pending Department Head', 
        'Approved', 
        'Dispatched', 
        'Rejected', 
        'Returned for Revision', 
        'Archived'
      )),
      approval_stage TEXT NOT NULL DEFAULT 'Officer Draft' CHECK (approval_stage IN (
        'Officer Draft', 
        'Directory Lead Review', 
        'Department Head Endorsement', 
        'Completed', 
        'Returned'
      )),
      digital_signature TEXT,
      signature_type TEXT,
      stamp_data TEXT,
      endorsed_by INTEGER REFERENCES users(id),
      endorsed_at TEXT,
      dispatched_at TEXT,
      verification_hash TEXT,
      security_classification TEXT DEFAULT 'Public',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 4. Letter Timeline Table (Full Auditing & Step Tracking)
    CREATE TABLE IF NOT EXISTS letter_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letter_id INTEGER NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
      actor_id INTEGER REFERENCES users(id),
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 5. Letter Comments Table (Routing Minutes, Review Comments & Instructions)
    CREATE TABLE IF NOT EXISTS letter_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letter_id INTEGER NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id),
      comment_text TEXT NOT NULL,
      comment_type TEXT DEFAULT 'Minute',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 6. Attachments Table
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letter_id INTEGER NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 7. Chat Messages Table (Inter-office messaging)
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      recipient_id INTEGER REFERENCES users(id),
      channel TEXT DEFAULT 'general',
      message_text TEXT NOT NULL,
      attachment_url TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 8. System Settings Table
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );
  `);
}

initSchema();

module.exports = db;
