'use strict';

const express = require('express');
const path = require('node:path');

const router = express.Router();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// V4 fixed -- reduce to a bare filename, then require it to be on the allowlist.
const DOWNLOADABLE = new Set(['handbook.txt', 'timetable.txt']);

router.get('/download', (req, res) => {
  const name = path.basename(String(req.query.file || ''));
  if (!DOWNLOADABLE.has(name)) return res.status(404).send('No such file.');
  res.sendFile(path.join(PUBLIC_DIR, name));
});

module.exports = router;
