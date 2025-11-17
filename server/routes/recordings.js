const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { db } = require('../database/db');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(path.join(uploadDir, 'recordings'))) {
  fs.mkdirSync(path.join(uploadDir, 'recordings'), { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(uploadDir, 'recordings'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Upload a new recording
router.post('/upload', upload.single('video'), (req, res) => {
  console.log('📹 Upload request received');
  
  if (!req.file) {
    console.error('❌ No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const recordingId = uuidv4();
  const { title, description } = req.body;

  console.log(`📝 Recording metadata - ID: ${recordingId}, Title: ${title}`);

  db.run(
    `INSERT INTO recordings (id, title, description, file_path) VALUES (?, ?, ?, ?)`,
    [recordingId, title || 'Untitled Recording', description || '', req.file.path],
    function(err) {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Recording saved: ${recordingId}`);
      res.json({
        id: recordingId,
        message: 'Recording uploaded successfully',
        filePath: req.file.path
      });
    }
  );
});

// Get all recordings
router.get('/', (req, res) => {
  db.all('SELECT * FROM recordings ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a specific recording
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM recordings WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    res.json(row);
  });
});

// Mark recording as processed
router.patch('/:id/processed', (req, res) => {
  db.run(
    'UPDATE recordings SET processed = 1 WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Recording marked as processed' });
    }
  );
});

module.exports = router;
