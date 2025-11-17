const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

const router = express.Router();

// Get all tickets with optional filtering
router.get('/', (req, res) => {
  const { role, status, assigned_to } = req.query;
  let query = 'SELECT * FROM tickets WHERE 1=1';
  const params = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (assigned_to) {
    query += ' AND assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(row => ({
      ...row,
      related_clips: row.related_clips ? JSON.parse(row.related_clips) : []
    })));
  });
});

// Get a specific ticket
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({
      ...row,
      related_clips: row.related_clips ? JSON.parse(row.related_clips) : []
    });
  });
});

// Create a new ticket
router.post('/', (req, res) => {
  const ticketId = uuidv4();
  const { title, description, role, difficulty, points, related_clips } = req.body;

  if (!title || !role) {
    return res.status(400).json({ error: 'Title and role are required' });
  }

  db.run(
    `INSERT INTO tickets (id, title, description, role, difficulty, points, related_clips) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ticketId,
      title,
      description || '',
      role,
      difficulty || 'beginner',
      points || 10,
      JSON.stringify(related_clips || [])
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: ticketId, message: 'Ticket created successfully' });
    }
  );
});

// Assign ticket to user
router.patch('/:id/assign', (req, res) => {
  const { user_id } = req.body;

  db.run(
    'UPDATE tickets SET assigned_to = ?, status = ? WHERE id = ?',
    [user_id, 'in-progress', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Ticket assigned successfully' });
    }
  );
});

// Complete ticket
router.patch('/:id/complete', (req, res) => {
  const { user_id } = req.body;

  db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id], (err, ticket) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Update ticket status
    db.run(
      'UPDATE tickets SET status = ? WHERE id = ?',
      ['completed', req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Award points to user
        db.get('SELECT * FROM users WHERE id = ?', [user_id], (err, user) => {
          if (err || !user) {
            return res.json({ message: 'Ticket completed' });
          }

          const newPoints = user.points + ticket.points;
          const newLevel = Math.floor(newPoints / 100) + 1;
          
          const completedTickets = user.completed_tickets ? JSON.parse(user.completed_tickets) : [];
          completedTickets.push(req.params.id);

          db.run(
            'UPDATE users SET points = ?, level = ?, completed_tickets = ? WHERE id = ?',
            [newPoints, newLevel, JSON.stringify(completedTickets), user_id],
            (err) => {
              if (err) console.error('Error updating user:', err);
              res.json({ 
                message: 'Ticket completed successfully',
                points_earned: ticket.points,
                new_points: newPoints,
                new_level: newLevel
              });
            }
          );
        });
      }
    );
  });
});

// Get starter tickets for a role
router.get('/role/:role/starters', (req, res) => {
  db.all(
    'SELECT * FROM tickets WHERE role = ? AND status = ? ORDER BY difficulty, points LIMIT 5',
    [req.params.role, 'open'],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows.map(row => ({
        ...row,
        related_clips: row.related_clips ? JSON.parse(row.related_clips) : []
      })));
    }
  );
});

module.exports = router;
