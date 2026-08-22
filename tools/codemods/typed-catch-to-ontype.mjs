#!/usr/bin/env node
/*
 * bluebird `.catch(SomeError, handler)` -> `.catch(onType(SomeError, handler))`.
 *
 * Native `.catch` cannot filter by error class. `onType`
 * (@duelyst/common/utils/utils_promise) does the `instanceof` check and - crucially
 * - RETHROWS anything that does not match. Without that rethrow, a catch
 * written for one error class silently swallows every other error, which is
 * the main way this migration could turn a crash into a quiet success.
 *
 * Only the OPENING of the call is rewritten and the handler is left completely
 * untouched, so multi-line handlers, `function` forms and nested parentheses
 * are all unaffected: the transform inserts `onType(` and one `)` at the
 * matching close paren, found by brace counting rather than by regex.
 *
 * bluebird's OWN error classes (Promise.TimeoutError, Promise.CancellationError)
 * are deliberately skipped - they belong with the `.timeout()`/`.cancellable()`
 * conversion, since native promises have no equivalent to inherit from.
 *
 * Usage: node tools/codemods/typed-catch-to-ontype.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';

// `.catch(Identifier.Path,` but never `.catch(Promise.*,`
const OPEN = /\.catch\((?!Promise\.)([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*,/g;

/** index of the paren that closes the one opened at `open` */
function matchParen(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

let changed = 0;
let sites = 0;
for (const file of process.argv.slice(2)) {
  let src = readFileSync(file, 'utf8');
  let n = 0;
  // work right-to-left so earlier indices stay valid
  const hits = [...src.matchAll(OPEN)].reverse();
  for (const m of hits) {
    const openParen = src.indexOf('(', m.index);
    const closeParen = matchParen(src, openParen);
    if (closeParen === -1) continue;
    const inner = src.slice(openParen + 1, closeParen);
    src = `${src.slice(0, openParen)}(onType(${inner}))${src.slice(closeParen + 1)}`;
    n += 1;
  }
  if (n) {
    // add the import next to the file's other requires
    if (!/utils_promise/.test(src)) {
      const lastRequire = [...src.matchAll(/^(?:const|var|let) .*= require\(.*\);$/gm)].pop();
      if (lastRequire) {
        const at = lastRequire.index + lastRequire[0].length;
        const depth = (file.match(/\//g) || []).length;
        const rel = file.startsWith('app/')
          ? '@duelyst/common/utils/utils_promise'
          : '@duelyst/common/utils/utils_promise';
        src = `${src.slice(0, at)}\nconst { onType } = require('${rel}');${src.slice(at)}`;
      }
    }
    writeFileSync(file, src);
    changed += 1;
    sites += n;
  }
}
console.log(`${changed} file(s), ${sites} typed catch(es) converted`);
