'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

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

// This test does not go through HTTP -- there is no signup route, and the
// fixed /admin/users deliberately withholds password_hash (that is V6's own
// fix). Storage properties are checked directly against a fresh copy of the
// same open()/seed code path the server itself uses.
test('two users with the same password get different stored hashes, and the stored hash is not a raw digest of the password', async () => {
  const dbModule = require(`${SRC}/db.js`);
  const db = dbModule.open();

  const computeHash = dbModule.hashPassword || dbModule.md5;
  assert.ok(typeof computeHash === 'function', 'db.js exports no password-hashing function');

  const insert = db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  );
  const shared = 'twin-password-99';
  insert.run('twin-one', computeHash(shared), 'staff');
  insert.run('twin-two', computeHash(shared), 'staff');

  const rows = db
    .prepare("SELECT password_hash FROM users WHERE username IN ('twin-one', 'twin-two') ORDER BY username")
    .all();

  assert.notStrictEqual(
    rows[0].password_hash,
    rows[1].password_hash,
    'two users with the same password got the same stored hash -- there is no per-user salt'
  );

  const rawDigests = ['md5', 'sha1', 'sha256'].map((alg) =>
    crypto.createHash(alg).update(shared).digest('hex')
  );
  for (const [i, row] of rows.entries()) {
    assert.ok(
      !rawDigests.includes(row.password_hash),
      `stored hash for twin-${i === 0 ? 'one' : 'two'} is a raw, unsalted digest of the password`
    );
  }
});