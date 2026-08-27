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

test('a script tag in a note body is escaped, not executed', async () => {
  const login = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123' }),
    redirect: 'manual',
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ title: 'XSS probe', body: '<script>alert(1)</script>' }),
    redirect: 'manual',
  });

  const id = (await (await fetch(`${base}/`)).text()).match(/href="\/notes\/(\d+)"/)[1];
  const page = await (await fetch(`${base}/notes/${id}`)).text();

  assert.ok(!page.includes('<script>alert(1)</script>'), 'the script tag reached the page unescaped');
  assert.match(page, /&lt;script&gt;/);
});

test('a script tag in a note title is escaped, on the list page and in <title>', async () => {
  const login = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123' }),
    redirect: 'manual',
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ title: '<script>alert(2)</script>', body: 'title XSS probe' }),
    redirect: 'manual',
  });

  const listPage = await (await fetch(`${base}/`)).text();
  assert.ok(!listPage.includes('<script>alert(2)</script>'), 'the note title reached the list page unescaped');
  assert.match(listPage, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);

  const id = listPage.match(/href="\/notes\/(\d+)"/)[1];
  const notePage = await (await fetch(`${base}/notes/${id}`)).text();
  assert.ok(!notePage.includes('<title><script>alert(2)</script>'), 'the note title reached the <title> element unescaped');
  assert.match(notePage, /<title>&lt;script&gt;alert\(2\)&lt;\/script&gt; · Campus Notes<\/title>/);
});