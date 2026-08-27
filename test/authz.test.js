'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';
const SRC = process.env.CAMPUS_NOTES_SRC || '../src';
const { createApp } = require(`${SRC}/server.js`);

let server, base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function cookieFor(username, password) {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
    redirect: 'manual',
  });
  return res.headers.get('set-cookie').split(';')[0];
}

test('an anonymous visitor cannot read the user list', async () => {
  const res = await fetch(`${base}/admin/users`);
  assert.strictEqual(res.status, 401, 'the user list was readable without signing in');
});

test('a staff account cannot read the user list', async () => {
  const cookie = await cookieFor('mutesi', 'lab-week-3');
  const res = await fetch(`${base}/admin/users`, { headers: { cookie } });
  assert.strictEqual(res.status, 403, 'a non-administrator read the user list');
});

test('an administrator can read the user list, without password hashes', async () => {
  const cookie = await cookieFor('admin', 'admin123');
  const res = await fetch(`${base}/admin/users`, { headers: { cookie } });
  assert.strictEqual(res.status, 200);
  const users = await res.json();
  assert.ok(users.length >= 3);
  assert.ok(!('password_hash' in users[0]), 'password hashes were returned to the client');
});