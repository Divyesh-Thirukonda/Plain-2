const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database/onboarding.db');
const dbDir = path.dirname(DB_PATH);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  console.log(`📁 Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`📊 Database path: ${DB_PATH}`);
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connection established');
  }
});

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Recordings table
      db.run(`
        CREATE TABLE IF NOT EXISTS recordings (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          duration INTEGER,
          file_path TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT 0
        )
      `, (err) => {
        if (err) console.error('Error creating recordings table:', err);
      });

      // Clips table
      db.run(`
        CREATE TABLE IF NOT EXISTS clips (
          id TEXT PRIMARY KEY,
          recording_id TEXT,
          title TEXT NOT NULL,
          start_time REAL NOT NULL,
          end_time REAL NOT NULL,
          file_path TEXT NOT NULL,
          transcript TEXT,
          tags TEXT,
          role TEXT,
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (recording_id) REFERENCES recordings(id)
        )
      `, (err) => {
        if (err) console.error('Error creating clips table:', err);
      });

      // Tickets table
      db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          role TEXT NOT NULL,
          difficulty TEXT,
          points INTEGER DEFAULT 10,
          status TEXT DEFAULT 'open',
          assigned_to TEXT,
          related_clips TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating tickets table:', err);
      });

      // Users table for gamification
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT,
          role TEXT,
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          badges TEXT,
          completed_tickets TEXT,
          watched_clips TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating users table:', err);
      });

      // Achievements table
      db.run(`
        CREATE TABLE IF NOT EXISTS achievements (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          badge_icon TEXT,
          points_required INTEGER,
          condition_type TEXT,
          condition_value TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating achievements table:', err);
          reject(err);
        } else {
          console.log('✅ Database tables initialized');
          resolve();
        }
      });
    });
  });
}

module.exports = { db, initializeDatabase };
