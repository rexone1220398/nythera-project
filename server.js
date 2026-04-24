require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Database = require('better-sqlite3');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const db = new Database(path.join(__dirname, 'database.sqlite'));

db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    uid INTEGER UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function createUid() {
  for (let i = 0; i < 20; i += 1) {
    const uid = Math.floor(100000 + Math.random() * 900000);
    const exists = db.prepare('SELECT id FROM users WHERE uid = ?').get(uid);
    if (!exists) return uid;
  }
  throw new Error('Could not create unique UID');
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, uid: user.uid, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    uid: user.uid,
    role: user.role,
    created_at: user.created_at
  };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = req.cookies.nythera_token || bearerToken;

  if (!token) {
    return res.status(401).json({ error: 'Ты не авторизован' });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Сессия истекла, войди заново' });
  }
}

app.post('/api/register', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (nickname.length < 3) {
      return res.status(400).json({ error: 'Никнейм должен быть минимум 3 символа' });
    }

    if (!email.includes('@') || email.length < 6) {
      return res.status(400).json({ error: 'Введи корректный email' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const uid = createUid();

    const result = db.prepare(`
      INSERT INTO users (nickname, email, password_hash, uid)
      VALUES (?, ?, ?, ?)
    `).run(nickname, email, passwordHash, uid);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = createToken(user);

    res.cookie('nythera_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ message: 'Аккаунт создан', token, user: publicUser(user) });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Этот email уже зарегистрирован' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = createToken(user);
    res.cookie('nythera_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ message: 'Вход выполнен', token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  return res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('nythera_token');
  return res.json({ message: 'Выход выполнен' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`NytheraClient project started: http://localhost:${PORT}`);
});
