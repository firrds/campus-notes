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
