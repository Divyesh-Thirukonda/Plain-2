const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const recordingRoutes = require('./routes/recordings');
const clipRoutes = require('./routes/clips');
const ticketRoutes = require('./routes/tickets');
const gamificationRoutes = require('./routes/gamification');
const { initializeDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/recordings', recordingRoutes);
app.use('/api/clips', clipRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/gamification', gamificationRoutes);

// Root route - redirect to recorder
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Plain Onboarding API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
