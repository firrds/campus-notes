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

test('a quote in the username cannot sign anyone in', async () => {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: "' OR '1'='1' --", password: 'anything' }),
    redirect: 'manual',
  });
  assert.strictEqual(res.status, 401, 'the injection payload was accepted as a valid login');
});