'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyPassword } = require('./db.js');
const { loginPage } = require('./views.js');

// V3 fixed -- read the secret from the environment, and refuse to start without it.
const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error('SESSION_SECRET is not set. Refusing to start with a default secret.');
}

const router = express.Router();

router.get('/login', (req, res) => {
  res.send(loginPage(null));
});

router.post('/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const db = req.app.locals.db;

   // V1 fixed -- the username is a bound parameter, so a quote in it is data.
  const row = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username);

  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).send(loginPage('Incorrect username or password.'));
  }

  const token = jwt.sign({ username: row.username, role: row.role }, JWT_SECRET);
  res.cookie('session', token, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/');
});

function currentUser(req) {
  const token = req.cookies && req.cookies.session;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { router, currentUser, JWT_SECRET };
