/*
 * Vite build for the browser client (MODERNIZATION_PLAN.md Phase 4).
 *
 * Replaces gulp's browserify bundle (gulp/bundler.js) only: it produces
 * dist/src/duelyst.js from apps/client/index.ts. Everything else (vendor.js
 * concat, css, index.html, resource packages/copy, locales) still comes from
 * gulp until later Phase 4 steps. Run `pnpm build:vite` after a normal gulp
 * build (it needs the generated packages/data/packages.js).
 *
 * Legacy semantics preserved:
 * - .hbs templates precompile against handlebars/runtime
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

const Handlebars = require('handlebars');
const glslify = require('glslify7');

// TRAP (learned the hard way): `vite build` sets NODE_ENV=production before
// this file loads, which would make convict silently read production.json
// (where api is ""). The build orchestrator (tools/build/build-client.mjs)
// therefore resolves the config under the REAL environment and hands the
// values over via DUELYST_BUILD_CONFIG. Direct `pnpm build:vite` runs fall
// back to convict forced to development unless DUELYST_ENV says otherwise.
let ENV_VARS;
let config;
if (process.env.DUELYST_BUILD_CONFIG) {
  ENV_VARS = JSON.parse(process.env.DUELYST_BUILD_CONFIG);
  config = { get: (k) => ({ datGuiEditorEnabled: ENV_VARS.DAT_GUI_EDITOR_ENABLED })[k] };
} else {
  process.env.NODE_ENV = process.env.DUELYST_ENV || 'development';
  config = require('./config/config');
  const { version } = require('./version.json');
  // same variable set as gulp/bundler.js envify()
  ENV_VARS = {
    NODE_ENV: config.get('env'),
    VERSION: version,
    API_URL: config.get('api'),
    GAME_SERVER_URL: config.get('gameServerUrl'),
    SP_SERVER_URL: config.get('spServerUrl'),
    FIREBASE_URL: config.get('firebase.url'),
    FIREBASE_API_KEY: config.get('firebase.apiKey'),
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
    DAT_GUI_EDITOR_ENABLED: config.get('datGuiEditorEnabled'),
  };
}
const define = Object.fromEntries(
  Object.entries(ENV_VARS)
    .filter(([k]) => k !== 'DAT_GUI_EDITOR_ENABLED')
    .map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)]),
);
// anything else reading process.env at runtime gets an empty object
define['process.env'] = '{}';

function hbsPlugin() {
  return {
    name: 'duelyst:hbs',
    transform(code, id) {
      if (!id.endsWith('.hbs')) return null;
      const precompiled = Handlebars.precompile(code);
      // Handlebars 4.6 stopped resolving properties that live on an object's
      // PROTOTYPE (the prototype-pollution fix). This codebase keeps view data
      // on prototypes all over the place - it is the same pattern the SDK's
      // wire format depends on - so templates render blanks without this.
      // Upstream's answer was to pin handlebars at 4.5.3 and ignore the CVE;
      // restoring the behaviour explicitly lets us take the fixed version.
      // Tightening this means passing plain objects to templates instead.
      return {
        code: `var HandlebarsRuntime = require('handlebars/runtime').default;
var __tpl = HandlebarsRuntime.template(${precompiled});
module.exports = function (context, options) {
  return __tpl(context, Object.assign({ allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true }, options));
};
`,
        map: null,
      };
    },
  };
}

// Statically replace glslify('<relative path>') calls with the compiled
// shader source as a string literal. Runs with enforce:'pre' on the RAW
// source. The call syntax is identical in JS and TS
// and CoffeeScript, and a JSON string literal is valid in both.
function glslifyCallPlugin() {
  const CALL_RE = /glslify\((['"])([^'"]+)\1\)/g;
  return {
    name: 'duelyst:glslify-calls',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.(js|ts)$/.test(id) || !code.includes('glslify(')) return null;
      const out = code.replace(CALL_RE, (match, _q, rel) => {
        const file = path.resolve(path.dirname(id), rel);
        const source = glslify.file(file);
        if (source.includes('#{')) {
          throw new Error(
            `${id}: compiled shader ${rel} contains '#{' which would interpolate in CoffeeScript`,
          );
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
      let out = code.replace('})(this);', "})(typeof self !== 'undefined' ? self : {});");
      // its `typeof require === "function"` guard is false in the browser even
      // though the bundler statically rewires the require('moment') call
      out = out.replace('if (typeof require === "function") {', 'if (true) {');
      return out === code ? null : { code: out, map: null };
    },
  };
}

// the editor is a second entry point when
// datGuiEditorEnabled (development); both land in the single duelyst.js.
// A virtual entry reproduces that multi-entry-single-bundle behavior.
const VIRTUAL_ENTRY = '\0duelyst-entry';
function entryPlugin() {
  const entries = ['./apps/client/index.ts'];
  if (
    ENV_VARS.DAT_GUI_EDITOR_ENABLED != null
      ? ENV_VARS.DAT_GUI_EDITOR_ENABLED
      : config.get('datGuiEditorEnabled')
  )
    entries.push('./apps/client/tools/editor.ts');
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
      app: path.resolve(rootDir, 'apps/client'),
      apps: path.resolve(rootDir, 'apps'),
      test: path.resolve(rootDir, 'test'),
      // runtime glslify import is dead after static replacement; stub it
      glslify: path.resolve(rootDir, 'apps/client/tools/glslify-stub.js'),
      // node builtins used by client code (browserify shimmed these):
      // events -> apps/client/session2.ts, url -> packages/common/landing.ts
      events: path.resolve(rootDir, 'node_modules/events'),
      url: path.resolve(rootDir, 'node_modules/url'),
      os: path.resolve(rootDir, 'node_modules/os-browserify/browser.js'),
    },
    extensions: ['.ts', '.js', '.json'],
    // browserify parity: use the CJS builds of dependencies (browser/main),
    // never the ESM "module" entry - the CJS code in this repo expects
    // require() to return module.exports (e.g. i18next.use), not a namespace
    mainFields: ['browser', 'main'],
  },
  plugins: [entryPlugin(), glslifyCallPlugin(), hbsPlugin(), umdThisShimPlugin()],
  build: {
    outDir: 'dist/src',
    emptyOutDir: false, // dist/src is shared with the gulp outputs
    target: 'es2015',
    minify: false, // parity with the non-minified dev gulp build; enable later
    sourcemap: false,
    commonjsOptions: {
      // the entire app graph is CommonJS, not just node_modules
      include: [/node_modules/, /apps\//, /packages\//],
      extensions: ['.ts', '.js'],
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
        banner:
          "var process = { env: {}, browser: true, argv: [], cwd: function () { return '/'; }, nextTick: function (fn) { var args = [].slice.call(arguments, 1); setTimeout(function () { fn.apply(null, args); }, 0); } };",
      },
    },
  },
});
