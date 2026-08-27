'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';
const { createApp } = require('../src/server.js');

let server, base, cookie;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123' }),
    redirect: 'manual',
  });
  cookie = res.headers.get('set-cookie').split(';')[0];
});
after(() => server.close());

test('a note title of 120 characters is accepted', async () => {
  const title = 'x'.repeat(120);
  const res = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ title, body: 'ok' }),
    redirect: 'manual',
  });
  assert.strictEqual(res.status, 302);
});

test('a note title of 121 characters is rejected', async () => {
  const title = 'x'.repeat(121);
  const res = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ title, body: 'ok' }),
    redirect: 'manual',
  });
  assert.strictEqual(res.status, 400);
});
