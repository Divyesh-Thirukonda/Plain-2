const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

const router = express.Router();

// Get all clips with optional filtering
router.get('/', (req, res) => {
  const { role, tags, search } = req.query;
  let query = 'SELECT * FROM clips WHERE 1=1';
  const params = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  if (tags) {
    query += ' AND tags LIKE ?';
    params.push(`%${tags}%`);
  }

  if (search) {
    query += ' AND (title LIKE ? OR transcript LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    })));
  });
});

// Get a specific clip
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM clips WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    res.json({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    });
  });
});

// Create a new clip
router.post('/', (req, res) => {
  const clipId = uuidv4();
  const { recording_id, title, start_time, end_time, file_path, transcript, tags, role } = req.body;

  db.run(
    `INSERT INTO clips (id, recording_id, title, start_time, end_time, file_path, transcript, tags, role) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clipId,
      recording_id,
      title,
      start_time,
      end_time,
      file_path,
      transcript || '',
      JSON.stringify(tags || []),
      role || 'general'
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: clipId, message: 'Clip created successfully' });
    }
  );
});

// Increment view count
router.post('/:id/view', (req, res) => {
  db.run(
    'UPDATE clips SET views = views + 1 WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'View count updated' });
    }
  );
});

// Increment like count
router.post('/:id/like', (req, res) => {
  db.run(
    'UPDATE clips SET likes = likes + 1 WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Like count updated' });
    }
  );
});

// Update clip tags
router.patch('/:id/tags', (req, res) => {
  const { tags } = req.body;
  db.run(
    'UPDATE clips SET tags = ? WHERE id = ?',
    [JSON.stringify(tags), req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Tags updated successfully' });
    }
  );
});

module.exports = router;
