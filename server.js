require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// SQLite Database Setup
const db = new sqlite3.Database('./waitlist.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      goal TEXT,
      joined DATETIME DEFAULT CURRENT_TIMESTAMP,
      notified BOOLEAN DEFAULT 0
    )
  `, (err) => {
    if (err) console.error('Table creation error:', err);
    else console.log('Waitlist table ready');
  });
}

// Routes

// Serve HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'nightshift.html'));
});

// API: Add to waitlist
app.post('/api/waitlist', (req, res) => {
  const { email, goal, joined } = req.body;

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const stmt = db.prepare(
    'INSERT INTO waitlist (email, goal, joined) VALUES (?, ?, ?)'
  );

  stmt.run([email, goal || null, joined || new Date().toISOString()], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Email already on waitlist' });
      }
      return res.status(500).json({ error: 'Failed to add to waitlist' });
    }
    
    res.status(201).json({
      success: true,
      id: this.lastID,
      message: 'Successfully added to waitlist'
    });
  });

  stmt.finalize();
});

// API: Get waitlist (admin only - requires token)
app.get('/api/waitlist', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  // Simple token check (in production, use proper auth)
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all('SELECT id, email, goal, joined FROM waitlist ORDER BY joined DESC', 
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ count: rows.length, entries: rows });
    }
  );
});

// API: Delete from waitlist
app.delete('/api/waitlist/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.run('DELETE FROM waitlist WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, message: 'Deleted from waitlist' });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Nightshift API running on http://localhost:${PORT}`);
  console.log(`📊 Database: ./waitlist.db`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Database close error:', err);
    console.log('\nDatabase connection closed');
    process.exit(0);
  });
});
