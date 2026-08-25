'use strict';

const express = require('express');
const { currentUser } = require('./auth.js');
const { notesPage, notePage } = require('./views.js');

const router = express.Router();

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const notes = db
    .prepare('SELECT * FROM notes ORDER BY id DESC')
    .all();
  res.send(notesPage(notes, currentUser(req)));
});

router.post('/notes', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).send('Sign in first.');

  const { title = '', body = '' } = req.body || {};
  if (!title.trim()) return res.status(400).send('A note needs a title.');
  // 120 is a judgement call, not a derived value -- there is no column-width or
  // UI constraint elsewhere in this codebase that produced the number. Enforced
  // here rather than as a schema CHECK constraint so the limit stays a one-line
  // change; the trade-off is that a route this handler does not cover could
  // still insert a longer title. Raised and accepted in Activity 5's review.
  if (title.length > 120) return res.status(400).send('A note title cannot exceed 120 characters.');

  req.app.locals.db
    .prepare('INSERT INTO notes (author, title, body) VALUES (?, ?, ?)')
    .run(user.username, title, body);
  res.redirect('/');
});

router.get('/notes/:id', (req, res) => {
  const note = req.app.locals.db
    .prepare('SELECT * FROM notes WHERE id = ?')
    .get(Number(req.params.id));
  if (!note) return res.status(404).send('No such note.');
  res.send(notePage(note));
});

module.exports = router;
