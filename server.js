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

// Load .env locally if exists (without external dependencies)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  try {
    const envLines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (_) {}
}

// Cloud Database Connections (Supabase / Vercel KV / Upstash Redis / Firebase)
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('⚡ Supabase Cloud Client Initialized successfully!');
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err.message);
  }
}

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'tripathi_friendship_vault_secret_2026';

// In-memory active vault sessions (tokens fallback)
const activeSessions = new Set();

// Stateless HMAC auth token generator (essential for multi-instance Vercel Serverless)
function generateAuthToken() {
  const payload = { role: 'keeper', exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  return `${str}.${sig}`;
}

function verifyAuthToken(token) {
  if (!token) return false;
  if (activeSessions.has(token)) return true;
  if (!token.includes('.')) return false;
  const [str, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  if (sig !== expectedSig) return false;
  try {
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    return payload && payload.exp > Date.now();
  } catch (_) {
    return false;
  }
}

async function getConfig() {
  // 1. Try Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('vault_config')
        .select('*')
        .eq('id', 'primary_config')
        .maybeSingle();

      if (data && !error) {
        return {
          vaultPassword: data.vault_password || '2026',
          vaultPin: data.vault_password || '2026',
          previousPassword: data.previous_password || '',
          title: data.title || 'The Friendship Capsule',
          subtitle: data.subtitle || 'A private vault of timeless memories for our inner circle'
        };
      } else if (!data && !error) {
        const seedConfig = {
          id: 'primary_config',
          vault_password: '2026',
          title: 'The Friendship Capsule',
          subtitle: 'A private vault of timeless memories for our inner circle'
        };
        await supabase.from('vault_config').upsert(seedConfig);
        return seedConfig;
      }
    } catch (err) {
      console.warn('Supabase getConfig notice:', err.message);
    }
  }

  // 2. Try Vercel KV
  if (KV_URL && KV_TOKEN) {
    try {
      const res = await fetch(`${KV_URL}/get/friendscapsule_config`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const data = await res.json();
      if (data && data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
  }

  // 3. Local Fallback
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (!cfg.vaultPassword) {
      cfg.vaultPassword = cfg.vaultPin || 'shaurya2026';
      await saveConfig(cfg);
    }
    return cfg;
  } catch (e) {
    return { vaultPassword: 'shaurya2026', title: 'The Friendship Capsule' };
  }
}

async function saveConfig(cfg) {
  // 1. Save to Supabase
  if (supabase) {
    try {
      await supabase.from('vault_config').upsert({
        id: 'primary_config',
        vault_password: cfg.vaultPassword || cfg.vaultPin || '2026',
        previous_password: cfg.previousPassword || '',
        title: cfg.title || 'The Friendship Capsule',
        subtitle: cfg.subtitle || '',
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Supabase saveConfig notice:', err.message);
    }
  }

  // 2. Save to Vercel KV
  if (KV_URL && KV_TOKEN) {
    try {
      await fetch(`${KV_URL}/set/friendscapsule_config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cfg)
      });
    } catch (_) {}
  }

  // 3. Local Disk
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); } catch (_) {}
}

async function getMemories() {
  // 1. Try Supabase Cloud Database (Primary persistent storage)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        if (data.length > 0) {
          return data.map(row => ({
            id: row.id,
            friendName: row.friend_name,
            note: row.note,
            wordCount: row.word_count || 0,
            photoUrl: row.photo_url,
            photoBase64: row.photo_url,
            mood: row.mood || 'Bakchodi',
            filter: row.filter || 'none',
            stickers: Array.isArray(row.stickers) ? row.stickers : (typeof row.stickers === 'string' ? JSON.parse(row.stickers || '[]') : []),
            isPublic: row.is_public === true,
            createdAt: row.created_at
          }));
        } else {
          // If Supabase table is brand new, seed from local file
          try {
            const seedList = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8') || '[]');
            if (seedList.length > 0) {
              await saveMemories(seedList);
              return seedList;
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('Supabase getMemories notice:', err.message);
    }
  }

  // 2. Try Vercel KV / Upstash Redis
  if (KV_URL && KV_TOKEN) {
    try {
      const res = await fetch(`${KV_URL}/get/friendscapsule_memories`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const data = await res.json();
      if (data && data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('Vercel KV read error, falling back to local:', err.message);
    }
  }

  // 3. Try Firebase Realtime Database
  if (FIREBASE_DB_URL) {
    try {
      const cleanUrl = FIREBASE_DB_URL.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/memories.json`);
      const data = await res.json();
      if (data && Array.isArray(data)) return data;
      if (data && typeof data === 'object') return Object.values(data);
    } catch (err) {
      console.warn('Firebase read error, falling back to local:', err.message);
    }
  }

  // 4. Fallback to Local/Seed file
  try {
    const list = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
    let changed = false;
    const updated = list.map(m => {
      if (m.isPublic === undefined) {
        m.isPublic = false;
        changed = true;
      }
      if (m.photoUrl && m.photoUrl.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, m.photoUrl);
        if (fs.existsSync(localPath)) {
          try {
            const fileData = fs.readFileSync(localPath);
            const ext = path.extname(localPath).replace('.', '') || 'jpg';
            m.photoUrl = `data:image/${ext};base64,${fileData.toString('base64')}`;
            changed = true;
          } catch (_) {}
        }
      }
      return m;
    });
    if (changed) {
      try { fs.writeFileSync(MEMORIES_FILE, JSON.stringify(updated, null, 2)); } catch (_) {}
    }
    return updated;
  } catch (e) {
    return [];
  }
}

async function saveMemories(memories) {
  // 1. Save to Supabase Cloud Database
  if (supabase) {
    try {
      const rows = memories.map(m => ({
        id: m.id,
        friend_name: m.friendName,
        note: m.note,
        word_count: m.wordCount || 0,
        photo_url: m.photoUrl,
        mood: m.mood || 'Bakchodi',
        filter: m.filter || 'none',
        stickers: m.stickers || [],
        is_public: m.isPublic === true,
        created_at: m.createdAt || new Date().toISOString()
      }));
      await supabase.from('memories').upsert(rows, { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase saveMemories notice:', err.message);
    }
  }

  // 2. Save to Vercel KV / Upstash if configured
  if (KV_URL && KV_TOKEN) {
    try {
      await fetch(`${KV_URL}/set/friendscapsule_memories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(memories)
      });
    } catch (err) {
      console.warn('Vercel KV write error:', err.message);
    }
  }

  // 3. Save to Firebase Realtime Database if configured
  if (FIREBASE_DB_URL) {
    try {
      const cleanUrl = FIREBASE_DB_URL.replace(/\/$/, '');
      await fetch(`${cleanUrl}/memories.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memories)
      });
    } catch (err) {
      console.warn('Firebase write error:', err.message);
    }
  }

  // 4. Save locally
  try {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
  } catch (_) {}
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
  if (!verifyAuthToken(token)) {
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

// Cloud health & database connection diagnostic
app.get('/api/health-cloud', (req, res) => {
  const hasSupabase = !!supabase;
  const hasKV = !!(KV_URL && KV_TOKEN);
  const hasFirebase = !!FIREBASE_DB_URL;
  const cloudConnected = hasSupabase || hasKV || hasFirebase;
  const provider = hasSupabase
    ? 'Supabase Cloud PostgreSQL'
    : (hasKV ? 'Vercel KV (Upstash)' : (hasFirebase ? 'Firebase Realtime DB' : 'Local Disk'));

  res.json({
    isVercel,
    cloudConnected,
    provider,
    notice: cloudConnected
      ? `✨ ${provider} is active! Memories and master password sync live across all devices.`
      : '⚠️ Running in local storage mode. Add SUPABASE_URL & SUPABASE_KEY to your Vercel Environment Variables to sync across devices.'
  });
});

// Public Status
app.get('/api/status', async (req, res) => {
  const cfg = await getConfig();
  const memories = await getMemories();
  res.json({
    title: cfg.title || 'The Friendship Capsule',
    subtitle: cfg.subtitle || '',
    totalMemories: memories.length,
    recentNames: memories.slice(-6).map(m => m.friendName)
  });
});

// Friend submits a memory
app.post('/api/memories', async (req, res) => {
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

    let ext = 'jpg';
    let base64Data = photoBase64;
    const matches = photoBase64.match(/^data:image\/([a-zA-Z0-9.+]+);base64,(.+)$/);
    if (matches) {
      ext = matches[1].replace('jpeg', 'jpg');
      base64Data = matches[2];
    }

    const id = crypto.randomUUID();
    try {
      const filename = `snap_${Date.now()}_${id.slice(0, 8)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    } catch (_) {}

    const photoDataUrl = photoBase64.startsWith('data:')
      ? photoBase64
      : `data:image/${ext};base64,${base64Data}`;

    const newMemory = {
      id,
      friendName: friendName.trim(),
      note: cleanNote,
      wordCount,
      photoUrl: photoDataUrl,       // Portable Base64: loads instantly on any device
      photoBase64: photoDataUrl,
      mood: mood || 'Bakchodi',
      filter: filter || 'none',
      stickers: Array.isArray(stickers) ? stickers : [],
      isPublic: false,             // PRIVACY: False by default! Only Shaurya can see it until approved
      createdAt: new Date().toISOString()
    };

    const memories = await getMemories();
    memories.unshift(newMemory);
    await saveMemories(memories);

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
app.post('/api/auth/login', async (req, res) => {
  const inputPassword = (req.body.password || req.body.pin || '').toString().trim();
  const cfg = await getConfig();
  const currentPassword = (cfg.vaultPassword || cfg.vaultPin || 'shaurya2026').toString().trim();

  if (!inputPassword || inputPassword !== currentPassword) {
    return res.status(401).json({ error: 'Incorrect Keeper Password. Access denied.' });
  }

  const token = generateAuthToken();
  activeSessions.add(token);

  res.json({
    success: true,
    message: 'Welcome back, Vault Keeper!',
    token
  });
});

// Change Password from any device (verifying current/previous password)
app.post('/api/auth/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const cfg = await getConfig();
  const activePassword = (cfg.vaultPassword || cfg.vaultPin || 'shaurya2026').toString().trim();
  const prevPassword = (cfg.previousPassword || '').toString().trim();

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please enter both current/previous password and your new password.' });
  }

  const cleanCurrent = currentPassword.toString().trim();
  const cleanNew = newPassword.toString().trim();

  if (cleanCurrent !== activePassword && cleanCurrent !== prevPassword) {
    return res.status(401).json({ error: 'Current/previous password is incorrect. Verification failed.' });
  }

  if (cleanNew.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters.' });
  }

  cfg.previousPassword = activePassword;
  cfg.vaultPassword = cleanNew;
  cfg.vaultPin = cleanNew;
  await saveConfig(cfg);

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
  res.json({ authenticated: verifyAuthToken(token) });
});

// ------------------- PROTECTED VAULT ENDPOINTS -------------------

// Get all memories (HOST ONLY)
app.get('/api/vault/memories', requireVaultAuth, async (req, res) => {
  const memories = await getMemories();
  res.json({
    total: memories.length,
    memories
  });
});

// Delete a memory (HOST ONLY)
app.delete('/api/vault/memories/:id', requireVaultAuth, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from('memories').delete().eq('id', id);
    } catch (_) {}
  }
  let memories = await getMemories();
  const target = memories.find(m => m.id === id);

  if (target) {
    memories = memories.filter(m => m.id !== id);
    await saveMemories(memories);
    res.json({ success: true, message: 'Memory removed from vault.' });
  } else {
    res.status(404).json({ error: 'Memory not found' });
  }
});

// Toggle memory public visibility in Friends Capsule (HOST ONLY)
app.post('/api/vault/memories/:id/toggle-public', requireVaultAuth, async (req, res) => {
  const { id } = req.params;
  let memories = await getMemories();
  const target = memories.find(m => m.id === id);

  if (target) {
    target.isPublic = !target.isPublic;
    if (supabase) {
      try {
        await supabase.from('memories').update({ is_public: target.isPublic }).eq('id', id);
      } catch (_) {}
    }
    await saveMemories(memories);
    res.json({
      success: true,
      isPublic: target.isPublic,
      message: target.isPublic ? 'Memory is now visible in Friends Capsule!' : 'Memory is now private to Shaurya only.'
    });
  } else {
    res.status(404).json({ error: 'Memory not found' });
  }
});

// Get Publicly Approved Memories for Friends Column (PUBLIC)
app.get('/api/memories/public', async (req, res) => {
  const memories = await getMemories();
  const publicList = memories.filter(m => m.isPublic === true);
  res.json({
    total: publicList.length,
    memories: publicList
  });
});

// Update Password while inside Vault (HOST ONLY)
app.post('/api/vault/update-pin', requireVaultAuth, async (req, res) => {
  const newPass = (req.body.newPassword || req.body.newPin || '').toString().trim();
  if (!newPass || newPass.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  const cfg = await getConfig();
  cfg.previousPassword = cfg.vaultPassword || cfg.vaultPin || 'shaurya2026';
  cfg.vaultPassword = newPass;
  cfg.vaultPin = newPass;
  await saveConfig(cfg);

  res.json({ success: true, message: 'Vault Password updated successfully.' });
});

// Export all memories data (HOST ONLY)
app.get('/api/vault/export', requireVaultAuth, async (req, res) => {
  const memories = await getMemories();
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
