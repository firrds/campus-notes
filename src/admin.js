'use strict';

const express = require('express');

const router = express.Router();

// V6 fixed -- an explicit authorisation check. Static analysis never flagged
// this route, because nothing dangerous was being called; the defect was an
// absent line. A test found it.
const { currentUser } = require('./auth.js');

function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in first.' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Administrators only.' });
  next();
}

router.get('/admin/users', requireAdmin, (req, res) => {
  const users = req.app.locals.db
    .prepare('SELECT id, username, role FROM users ORDER BY id')   // no hashes
    .all();
  res.json(users);
});

module.exports = router;
