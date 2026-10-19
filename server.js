const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel Serverless & Local Directories
const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
const MEMORIES_FILE = path.join(DATA_DIR, 'memories.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// If on Vercel, copy initial seed files from repo to /tmp
if (isVercel) {
  const localDataDir = path.join(__dirname, 'data');
  if (fs.existsSync(path.join(localDataDir, 'config.json')) && !fs.existsSync(CONFIG_FILE)) {
    try { fs.copyFileSync(path.join(localDataDir, 'config.json'), CONFIG_FILE); } catch (_) {}
  }
  if (fs.existsSync(path.join(localDataDir, 'memories.json')) && !fs.existsSync(MEMORIES_FILE)) {
    try { fs.copyFileSync(path.join(localDataDir, 'memories.json'), MEMORIES_FILE); } catch (_) {}
  }
}

// Initialize config if needed
if (!fs.existsSync(CONFIG_FILE)) {
  const defaultConfig = {
    vaultPassword: 'shaurya2026',
    vaultPin: '2026',
    title: 'The Friendship Capsule',
    subtitle: 'A private vault of timeless memories for our inner circle'
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
}

// Initialize memories if needed
if (!fs.existsSync(MEMORIES_FILE)) {
  fs.writeFileSync(MEMORIES_FILE, JSON.stringify([], null, 2));
}

// In-memory active vault sessions (tokens)
const activeSessions = new Set();

function getConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (!cfg.vaultPassword) {
      cfg.vaultPassword = cfg.vaultPin || 'shaurya2026';
      saveConfig(cfg);
    }
    return cfg;
  } catch (e) {
    return { vaultPassword: 'shaurya2026', title: 'The Friendship Capsule' };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function getMemories() {
  try {
    return JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveMemories(memories) {
  fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
if (isVercel) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Helper: auth verification
function requireVaultAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized or session expired' });
  }
  next();
}

// Count words helper
function countWords(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// ------------------- PUBLIC ENDPOINTS -------------------

// Public Status (returns title, counts, but NO photos or notes)
app.get('/api/status', (req, res) => {
  const cfg = getConfig();
  const memories = getMemories();
  res.json({
    title: cfg.title || 'The Friendship Capsule',
    subtitle: cfg.subtitle || '',
    totalMemories: memories.length,
    recentNames: memories.slice(-6).map(m => m.friendName) // shows only friend first names for social proof!
  });
});

// Friend submits a memory
app.post('/api/memories', (req, res) => {
  try {
    const { friendName, note, photoBase64, mood, filter, stickers } = req.body;

    if (!friendName || !friendName.trim()) {
      return res.status(400).json({ error: 'Please enter your name or nickname!' });
    }

    if (!photoBase64) {
      return res.status(400).json({ error: 'Please snap or upload a photo!' });
    }

    const cleanNote = (note || '').trim();
    const wordCount = countWords(cleanNote);
    if (wordCount > 20) {
      return res.status(400).json({ error: `Note has ${wordCount} words. Limit is strictly 20 words!` });
    }

    // Save photo to file system
    const id = crypto.randomUUID();
    let ext = 'jpg';
    let base64Data = photoBase64;

    const matches = photoBase64.match(/^data:image\/([a-zA-Z0-9.+]+);base64,(.+)$/);
    if (matches) {
      ext = matches[1].replace('jpeg', 'jpg');
      base64Data = matches[2];
    }

    const filename = `snap_${Date.now()}_${id.slice(0, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const newMemory = {
      id,
      friendName: friendName.trim(),
      note: cleanNote,
      wordCount,
      photoUrl: `/uploads/${filename}`,
      mood: mood || 'Whimsical',
      filter: filter || 'normal',
      stickers: Array.isArray(stickers) ? stickers : [],
      createdAt: new Date().toISOString()
    };

    const memories = getMemories();
    memories.unshift(newMemory); // newest first
    saveMemories(memories);

    res.json({
      success: true,
      message: 'Your memory has been safely sealed into the vault!',
      memory: {
        id: newMemory.id,
        friendName: newMemory.friendName,
        createdAt: newMemory.createdAt
      }
    });
  } catch (err) {
    console.error('Error saving memory:', err);
    res.status(500).json({ error: 'Failed to seal your memory into the vault.' });
  }
});

// Host login (Enter Password)
app.post('/api/auth/login', (req, res) => {
  const inputPassword = (req.body.password || req.body.pin || '').toString().trim();
  const cfg = getConfig();
  const currentPassword = (cfg.vaultPassword || cfg.vaultPin || 'shaurya2026').toString().trim();

  if (!inputPassword || inputPassword !== currentPassword) {
    return res.status(401).json({ error: 'Incorrect Keeper Password. Access denied.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.add(token);

  res.json({
    success: true,
    message: 'Welcome back, Vault Keeper!',
    token
  });
});

// Change Password from any device (verifying current/previous password)
app.post('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const cfg = getConfig();
  const activePassword = (cfg.vaultPassword || cfg.vaultPin || 'shaurya2026').toString().trim();
  const prevPassword = (cfg.previousPassword || '').toString().trim();

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please enter both current/previous password and your new password.' });
  }

  const cleanCurrent = currentPassword.toString().trim();
  const cleanNew = newPassword.toString().trim();

  // Allow change if matching current active password OR last previous password
  if (cleanCurrent !== activePassword && cleanCurrent !== prevPassword) {
    return res.status(401).json({ error: 'Current/previous password is incorrect. Verification failed.' });
  }

  if (cleanNew.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters.' });
  }

  cfg.previousPassword = activePassword;
  cfg.vaultPassword = cleanNew;
  cfg.vaultPin = cleanNew; // maintain backwards compat
  saveConfig(cfg);

  res.json({
    success: true,
    message: 'Password updated successfully across all devices!'
  });
});

// Verify existing token
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.json({ authenticated: false });
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  res.json({ authenticated: activeSessions.has(token) });
});

// ------------------- PROTECTED VAULT ENDPOINTS -------------------

// Get all memories (HOST ONLY)
app.get('/api/vault/memories', requireVaultAuth, (req, res) => {
  const memories = getMemories();
  res.json({
    total: memories.length,
    memories
  });
});

// Delete a memory (HOST ONLY)
app.delete('/api/vault/memories/:id', requireVaultAuth, (req, res) => {
  const { id } = req.params;
  let memories = getMemories();
  const target = memories.find(m => m.id === id);

  if (target) {
    // Try to remove file
    if (target.photoUrl && target.photoUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, target.photoUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }
    memories = memories.filter(m => m.id !== id);
    saveMemories(memories);
    res.json({ success: true, message: 'Memory removed from vault.' });
  } else {
    res.status(404).json({ error: 'Memory not found' });
  }
});

// Update Password while inside Vault (HOST ONLY)
app.post('/api/vault/update-pin', requireVaultAuth, (req, res) => {
  const newPass = (req.body.newPassword || req.body.newPin || '').toString().trim();
  if (!newPass || newPass.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  const cfg = getConfig();
  cfg.previousPassword = cfg.vaultPassword || cfg.vaultPin || 'shaurya2026';
  cfg.vaultPassword = newPass;
  cfg.vaultPin = newPass;
  saveConfig(cfg);

  res.json({ success: true, message: 'Vault Password updated successfully.' });
});

// Export all memories data (HOST ONLY)
app.get('/api/vault/export', requireVaultAuth, (req, res) => {
  const memories = getMemories();
  res.setHeader('Content-Disposition', 'attachment; filename=friendship_vault_backup.json');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(memories, null, 2));
});

// Logout
app.post('/api/auth/logout', requireVaultAuth, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  if (token) activeSessions.delete(token);
  res.json({ success: true });
});

// Custom 404 Handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start server locally (if not on Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✨ Friendship Capsule Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
