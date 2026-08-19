/*
 * Vite build for the browser client (MODERNIZATION_PLAN.md Phase 4).
 *
 * Replaces gulp's browserify bundle (gulp/bundler.js) only: it produces
 * dist/src/duelyst.js from app/index.coffee. Everything else (vendor.js
 * concat, css, index.html, resource packages/copy, locales) still comes from
 * gulp until later Phase 4 steps. Run `pnpm build:vite` after a normal gulp
 * build (it needs the generated app/data/packages.js).
 *
 * Legacy semantics preserved:
 * - CoffeeScript sources compile per-file (coffeeify equivalent)
 * - .hbs templates precompile against hbsfy/runtime (hbsfy equivalent)
 * - glslify('<path>') CALL SITES are statically replaced with the compiled
 *   shader source (glslify-transform equivalent), via the glslify v7
 *   compiler; the runtime `require 'glslify'` is aliased to a stub
 * - envify vars become `define` entries, sourced from config/ like
 *   gulp/shared.js does
 * - the whole graph is CommonJS: commonjsOptions.strictRequires keeps
 *   require-time execution order, which the codebase's circular-dependency
 *   idiom ("module.exports before requires") depends on
 * - vendor globals (jQuery, Backbone, Marionette, cc, ...) stay a separate
 *   <script src="vendor.js"> - never imported here
 */
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rootDir = path.dirname(fileURLToPath(import.meta.url));

const coffee = require('coffeescript');
const Handlebars = require('handlebars');
const glslify = require('glslify7');
const config = require('./config/config');
const { version } = require('./version.json');

const env = config.get('env');

// same variable set as gulp/bundler.js envify()
const ENV_VARS = {
  NODE_ENV: env,
  VERSION: version,
  API_URL: config.get('api'),
  FIREBASE_URL: config.get('firebase.url'),
  ALL_CARDS_AVAILABLE: config.get('allCardsAvailable'),
  AI_TOOLS_ENABLED: config.get('aiToolsEnabled'),
  RECORD_CLIENT_LOGS: config.get('recordClientLogs'),
  INVITE_CODES_ACTIVE: config.get('inviteCodesActive'),
  RECAPTCHA_ACTIVE: config.get('recaptcha.enabled'),
  BUGSNAG_WEB: config.get('bugsnag.web_key'),
  BUGSNAG_DESKTOP: config.get('bugsnag.desktop_key'),
  TRACKING_PIXELS_ENABLED: false,
  LANDING_PAGE_URL: '/',
  REFERRER_PAGE_URLS: '',
};
const define = Object.fromEntries(
  Object.entries(ENV_VARS).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)]),
);
// anything else reading process.env at runtime gets an empty object
define['process.env'] = '{}';

function coffeePlugin() {
  return {
    name: 'duelyst:coffeescript',
    transform(code, id) {
      if (!id.endsWith('.coffee')) return null;
      return { code: coffee.compile(code, { bare: true, header: false }), map: null };
    },
  };
}

function hbsPlugin() {
  return {
    name: 'duelyst:hbsfy',
    transform(code, id) {
      if (!id.endsWith('.hbs')) return null;
      const precompiled = Handlebars.precompile(code);
      return {
        code: `var HandlebarsRuntime = require('hbsfy/runtime');\nmodule.exports = HandlebarsRuntime.template(${precompiled});\n`,
        map: null,
      };
    },
  };
}

// Statically replace glslify('<relative path>') calls with the compiled
// shader source as a string literal. Runs with enforce:'pre' on the RAW
// source, before the coffee transform - the call syntax is identical in JS
// and CoffeeScript, and a JSON string literal is valid in both.
function glslifyCallPlugin() {
  const CALL_RE = /glslify\((['"])([^'"]+)\1\)/g;
  return {
    name: 'duelyst:glslify-calls',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.(js|coffee)$/.test(id) || !code.includes('glslify(')) return null;
      const out = code.replace(CALL_RE, (match, _q, rel) => {
        const file = path.resolve(path.dirname(id), rel);
        const source = glslify.file(file);
        if (source.includes('#{')) {
          throw new Error(`${id}: compiled shader ${rel} contains '#{' which would interpolate in CoffeeScript`);
        }
        return JSON.stringify(source);
      });
      return out === code ? null : { code: out, map: null };
    },
  };
}

// browserify executed CJS modules with `this === module.exports`; rolldown's
// wrapper leaves top-level `this` undefined. moment-duration-format's UMD
// closer `})(this)` depends on it (only as a fallback lookup object).
function umdThisShimPlugin() {
  return {
    name: 'duelyst:umd-this-shim',
    transform(code, id) {
      if (!id.includes('moment-duration-format')) return null;
      let out = code.replace('})(this);', '})(typeof self !== \'undefined\' ? self : {});');
      // its `typeof require === "function"` guard is false in the browser even
      // though the bundler statically rewires the require('moment') call
      out = out.replace('if (typeof require === "function") {', 'if (true) {');
      return out === code ? null : { code: out, map: null };
    },
  };
}

// gulp adds app/tools/editor.coffee as a second browserify entry when
// datGuiEditorEnabled (development); both land in the single duelyst.js.
// A virtual entry reproduces that multi-entry-single-bundle behavior.
const VIRTUAL_ENTRY = '\0duelyst-entry';
function entryPlugin() {
  const entries = ["./app/index.js"];
  if (config.get('datGuiEditorEnabled')) entries.push('./app/tools/editor.js');
  return {
    name: 'duelyst:entry',
    resolveId(id) {
      return id === 'duelyst-entry' ? VIRTUAL_ENTRY : null;
    },
    load(id) {
      if (id !== VIRTUAL_ENTRY) return null;
      return entries.map((e) => `require(${JSON.stringify(path.resolve(rootDir, e))});`).join('\n');
    },
  };
}

export default defineConfig({
  root: rootDir,
  define,
  resolve: {
    alias: {
      // root-absolute requires (app-module-path / browserify `paths`)
      app: path.resolve(rootDir, 'app'),
      test: path.resolve(rootDir, 'test'),
      // runtime glslify import is dead after static replacement; stub it
      glslify: path.resolve(rootDir, 'app/tools/glslify-stub.js'),
      // node builtins used by client code (browserify shimmed these):
      // events -> session2.coffee, url -> landing.js
      events: path.resolve(rootDir, 'node_modules/events'),
      url: path.resolve(rootDir, 'node_modules/url'),
      os: path.resolve(rootDir, 'node_modules/os-browserify/browser.js'),
    },
    extensions: ['.js', '.coffee', '.json'],
    // browserify parity: use the CJS builds of dependencies (browser/main),
    // never the ESM "module" entry - the CJS code in this repo expects
    // require() to return module.exports (e.g. i18next.use), not a namespace
    mainFields: ['browser', 'main'],
  },
  plugins: [entryPlugin(), glslifyCallPlugin(), coffeePlugin(), hbsPlugin(), umdThisShimPlugin()],
  build: {
    outDir: 'dist/src',
    emptyOutDir: false, // dist/src is shared with the gulp outputs
    target: 'es2015',
    minify: false, // parity with the non-minified dev gulp build; enable later
    sourcemap: false,
    commonjsOptions: {
      // the entire app graph is CommonJS, not just node_modules
      include: [/node_modules/, /app\//, /packages\//],
      extensions: ['.js', '.coffee'],
      transformMixedEsModules: true,
      // preserve require-time execution order: the codebase's circular-
      // dependency idiom (export-before-require) needs real CJS semantics
      strictRequires: true,
    },
    rollupOptions: {
      input: 'duelyst-entry',
      output: {
        format: 'iife',
        entryFileNames: 'duelyst.js',
        inlineDynamicImports: true,
        // browserify parity: it injected a process shim for dependencies that
        // touch the bare `process` global at runtime (nextTick etc.)
        banner: "var process = { env: {}, browser: true, argv: [], cwd: function () { return '/'; }, nextTick: function (fn) { var args = [].slice.call(arguments, 1); setTimeout(function () { fn.apply(null, args); }, 0); } };",
      },
    },
  },
});
