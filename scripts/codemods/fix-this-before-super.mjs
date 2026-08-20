/*
 * Pre-transform for CoffeeScript files that decaffeinate refuses because the
 * constructor touches `this` before `super` (plan 5.2c). Two patterns:
 *  1. `@.prop` (or `@prop`) referenced inside the super(...) call arguments -
 *     at that point it can only read the prototype value, so it becomes
 *     `<ClassName>.prototype.prop`.
 *  2. CoffeeScript constructor param-properties `(@x, @y)` - become plain
 *     params with `@x = x` assignments inserted AFTER the super call.
 * Run before decaffeinate-batch on the listed files.
 */
import fs from 'node:fs';

for (const file of process.argv.slice(2)) {
  let src = fs.readFileSync(file, 'utf8');
  const classMatch = src.match(/class (\w+) extends/);
  if (!classMatch) {
    console.error(`no class in ${file}`);
    continue;
  }
  const className = classMatch[1];

  // pattern 1: @.prop or @prop inside super(...) args
  src = src.replace(/super\(([^\n]*)\)/g, (m, args) => {
    const fixed = args.replace(/@\.?(\w+)/g, `${className}.prototype.$1`);
    return `super(${fixed})`;
  });

  // pattern 2: constructor param-properties
  src = src.replace(
    /^(\s*)constructor\s*:\s*\(([^)]*)\)\s*->\n((?:.*\n)*?)(\s*)(super\([^\n]*\))/m,
    (m, ind, params, between, sind, superCall) => {
      const names = [];
      const newParams = params
        .split(',')
        .map((p) => {
          const t = p.trim();
          if (t.startsWith('@')) {
            const n = t.slice(1);
            names.push(n);
            return n;
          }
          return t;
        })
        .filter((p) => p !== '')
        .join(', ');
      if (names.length === 0) return m;
      const assigns = names.map((n) => `${sind}@${n} = ${n}`).join('\n');
      return `${ind}constructor: (${newParams}) ->\n${between}${sind}${superCall}\n${assigns}`;
    },
  );
  fs.writeFileSync(file, src);
  console.log(`pre-transformed ${file}`);
}
