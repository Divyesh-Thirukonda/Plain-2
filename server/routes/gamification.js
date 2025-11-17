const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

const router = express.Router();

// Get or create user
router.get('/user/:id', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!user) {
      // Create new user
      const userId = req.params.id;
      db.run(
        'INSERT INTO users (id, username, points, level, badges, completed_tickets, watched_clips) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, `user_${userId.substring(0, 8)}`, 0, 1, '[]', '[]', '[]'],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          db.get('SELECT * FROM users WHERE id = ?', [userId], (err, newUser) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(formatUser(newUser));
          });
        }
      );
    } else {
      res.json(formatUser(user));
    }
  });
});

// Update user profile
router.patch('/user/:id', (req, res) => {
  const { username, email, role } = req.body;
  const updates = [];
  const params = [];

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }
  if (email) {
    updates.push('email = ?');
    params.push(email);
  }
  if (role) {
    updates.push('role = ?');
    params.push(role);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(req.params.id);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Get user stats
router.get('/user/:id/stats', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const completedTickets = user.completed_tickets ? JSON.parse(user.completed_tickets) : [];
    const watchedClips = user.watched_clips ? JSON.parse(user.watched_clips) : [];
    const badges = user.badges ? JSON.parse(user.badges) : [];

    res.json({
      points: user.points,
      level: user.level,
      tickets_completed: completedTickets.length,
      clips_watched: watchedClips.length,
      badges_earned: badges.length,
      progress_to_next_level: user.points % 100
    });
  });
});

// Award badge to user
router.post('/user/:id/badge', (req, res) => {
  const { badge_name, badge_icon } = req.body;

  db.get('SELECT badges FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const badges = user.badges ? JSON.parse(user.badges) : [];
    
    const newBadge = {
      id: uuidv4(),
      name: badge_name,
      icon: badge_icon,
      earned_at: new Date().toISOString()
    };

    badges.push(newBadge);

    db.run(
      'UPDATE users SET badges = ? WHERE id = ?',
      [JSON.stringify(badges), req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Badge awarded!', badge: newBadge });
      }
    );
  });
});

// Track clip watched
router.post('/user/:id/watched/:clipId', (req, res) => {
  db.get('SELECT watched_clips, points, level FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const watchedClips = user.watched_clips ? JSON.parse(user.watched_clips) : [];
    
    // Only award points for first watch
    if (!watchedClips.includes(req.params.clipId)) {
      watchedClips.push(req.params.clipId);
      
      const pointsEarned = 5;
      const newPoints = user.points + pointsEarned;
      const newLevel = Math.floor(newPoints / 100) + 1;

      db.run(
        'UPDATE users SET watched_clips = ?, points = ?, level = ? WHERE id = ?',
        [JSON.stringify(watchedClips), newPoints, newLevel, req.params.id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Check for milestone badges
          checkMilestoneBadges(req.params.id, watchedClips.length, newPoints);
          
          res.json({ 
            message: 'Clip watched!',
            points_earned: pointsEarned,
            new_points: newPoints,
            new_level: newLevel
          });
        }
      );
    } else {
      res.json({ message: 'Already watched' });
    }
  });
});

// Get leaderboard
router.get('/leaderboard', (req, res) => {
  db.all(
    'SELECT id, username, role, points, level FROM users ORDER BY points DESC LIMIT 10',
    [],
    (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(users);
    }
  );
});

// Get all achievements
router.get('/achievements', (req, res) => {
  db.all('SELECT * FROM achievements ORDER BY points_required', [], (err, achievements) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(achievements);
  });
});

// Create achievement
router.post('/achievements', (req, res) => {
  const { name, description, badge_icon, points_required, condition_type, condition_value } = req.body;
  const achievementId = uuidv4();

  db.run(
    `INSERT INTO achievements (id, name, description, badge_icon, points_required, condition_type, condition_value) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [achievementId, name, description, badge_icon, points_required, condition_type, condition_value],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: achievementId, message: 'Achievement created' });
    }
  );
});

// Helper functions
function formatUser(user) {
  return {
    ...user,
    badges: user.badges ? JSON.parse(user.badges) : [],
    completed_tickets: user.completed_tickets ? JSON.parse(user.completed_tickets) : [],
    watched_clips: user.watched_clips ? JSON.parse(user.watched_clips) : []
  };
}

function checkMilestoneBadges(userId, clipsWatched, points) {
  const milestones = [
    { clips: 5, name: 'Eager Learner', icon: '🎓' },
    { clips: 10, name: 'Knowledge Seeker', icon: '📚' },
    { clips: 25, name: 'Onboarding Master', icon: '🏆' },
    { points: 100, name: 'Century Club', icon: '💯' },
    { points: 500, name: 'Point Machine', icon: '⚡' }
  ];

  milestones.forEach(milestone => {
    if (milestone.clips && clipsWatched === milestone.clips) {
      awardBadge(userId, milestone.name, milestone.icon);
    }
    if (milestone.points && points >= milestone.points) {
      // Check if already awarded
      db.get('SELECT badges FROM users WHERE id = ?', [userId], (err, user) => {
        if (!err && user) {
          const badges = user.badges ? JSON.parse(user.badges) : [];
          if (!badges.some(b => b.name === milestone.name)) {
            awardBadge(userId, milestone.name, milestone.icon);
          }
        }
      });
    }
  });
}

function awardBadge(userId, name, icon) {
  db.get('SELECT badges FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return;

    const badges = user.badges ? JSON.parse(user.badges) : [];
    badges.push({
      id: uuidv4(),
      name,
      icon,
      earned_at: new Date().toISOString()
    });

    db.run('UPDATE users SET badges = ? WHERE id = ?', [JSON.stringify(badges), userId]);
    console.log(`🏆 Badge awarded to ${userId}: ${icon} ${name}`);
  });
}

module.exports = router;
