#!/usr/bin/env node
/*
 * Bring the data_access integration suites back onto the current API.
 *
 * These suites were written against an older users module and have been
 * unrunnable since it changed. Two drifts:
 *
 *   createNewUser(email, username, password, inviteCode, ...)
 *     -> createNewUser(username, password, inviteCode, ...)
 *   The email parameter is gone -- createNewUser does not touch email at all
 *   any more (Firebase auth owns it), and the suites never assert on it, so the
 *   argument is simply dropped. Left as-is, `kumite14` lands in the referralCode
 *   slot and every suite dies in beforeAll with InvalidReferralCodeError.
 *
 *   userIdForEmail(email) -> userIdForUsername(username)
 *   The function was removed. The suites' own createNewUser calls give the
 *   email->username mapping, so the rename carries the matching identifier
 *   rather than the email.
 *
 * Usage: node scripts/codemods/revive-data-access-tests.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@typescript-eslint/parser';

// taken from the suites' own createNewUser(email, username, ...) pairs
const EMAIL_TO_USERNAME = new Map([
  ['unit-test@duelyst.local', 'unittest'],
  ['unit-test-opponent@duelyst.local', 'unittestopponent'],
  ['does@not.exist', 'doesnotexist'],
]);
const VAR_TO_VAR = new Map([
  ['email', 'username'],
  ['email1', 'username1'],
  ['email2', 'username2'],
  ['email3', 'username3'],
  ['email4', 'username4'],
  ['userEmail', 'userName'],
]);

const walk = (node, fn) => {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const k of Object.keys(node)) {
    if (k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, fn));
    else if (v && typeof v.type === 'string') walk(v, fn);
  }
};

let files = 0;
let dropped = 0;
let renamed = 0;
const unmapped = [];

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { range: true });
  } catch (e) {
    console.error(`  parse failed ${file}`);
    continue;
  }

  const edits = []; // { start, end, text }

  walk(ast, (n) => {
    if (n.type !== 'CallExpression' || n.callee.type !== 'MemberExpression') return;
    const name = n.callee.property && n.callee.property.name;

    if (name === 'createNewUser' && n.arguments.length >= 2) {
      // drop the leading email argument
      const first = n.arguments[0];
      const second = n.arguments[1];
      edits.push({ start: first.range[0], end: second.range[0], text: '' });
      dropped += 1;
      return;
    }

    if (name === 'userIdForEmail') {
      edits.push({
        start: n.callee.property.range[0],
        end: n.callee.property.range[1],
        text: 'userIdForUsername',
      });
      renamed += 1;
      const arg = n.arguments[0];
      if (!arg) return; // userIdForEmail() -- arity test
      if (arg.type === 'Literal' && EMAIL_TO_USERNAME.has(arg.value)) {
        edits.push({
          start: arg.range[0],
          end: arg.range[1],
          text: `'${EMAIL_TO_USERNAME.get(arg.value)}'`,
        });
      } else if (arg.type === 'Identifier' && VAR_TO_VAR.has(arg.name)) {
        edits.push({ start: arg.range[0], end: arg.range[1], text: VAR_TO_VAR.get(arg.name) });
      } else {
        unmapped.push(`${file}: userIdForEmail(${src.slice(arg.range[0], arg.range[1])})`);
      }
    }
  });

  if (!edits.length) continue;
  let out = src;
  for (const e of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  try {
    parse(out, { range: true });
  } catch (e) {
    console.error(`  !! ${file}: output does not parse (${e.message})`);
    continue;
  }
  writeFileSync(file, out);
  files += 1;
}

console.log(
  `${files} file(s): dropped ${dropped} email argument(s), renamed ${renamed} userIdForEmail call(s)`,
);
for (const u of unmapped) console.log(`  UNMAPPED (hand-check): ${u}`);
