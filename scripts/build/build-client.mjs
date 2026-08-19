/*
 * Gulp-free client build (MODERNIZATION_PLAN.md step 4.2).
 *
 * Orchestrates everything `gulp build` used to do, without gulp, in gulp's
 * order (generate_packages.js scans dist/src/duelyst.css, so css must come
 * before packages):
 *   vendor.js -> index.html -> duelyst.css -> locales
 *   -> resource packages (scripts/generate_packages.js -> app/data/packages.js)
 *   -> JS bundle (vite build) -> resource copy (non-cdn packages + web assets)
 *
 * Usage: FIREBASE_URL=... node scripts/build/build-client.mjs [--skip-packages] [--skip-resources]
 * The gulp pipeline remains available and untouched until plan step 4.5.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(rootDir);

// app/data/packages.js requires SDK modules with root-absolute paths, and the
// tree is mid-migration to TypeScript - give require() both abilities
require('app-module-path').addPath(rootDir);
require('tsx/cjs');

const config = require(path.join(rootDir, 'config/config'));
const env = config.get('env');
const development = env !== 'production' && env !== 'staging';
const args = new Set(process.argv.slice(2));

function log(step, message) {
  process.stdout.write(`[build-client] ${step}: ${message}\n`);
}

const PACKAGES_MANIFEST = path.join(rootDir, 'scripts/build/packages-manifest.json');

function step1Packages() {
  const flags = ['-d'];
  if (development) flags.push('-fa');
  // remove the previous output first: a crashed generator run would otherwise
  // leave a truncated packages.js that the manifest check below reads as a
  // (false) regression
  fs.rmSync(path.join(rootDir, 'app/data/packages.js'), { force: true });
  execFileSync('node', ['scripts/generate_packages.js', ...flags], { stdio: 'inherit' });
  log('packages', 'app/data/packages.js generated');

  // Guard: generate_packages.js TEXT-PARSES source files, so a CoffeeScript->
  // JS conversion (or any refactor) can silently drop asset packages while the
  // build still "succeeds" (this happened in plan step 5.2c: 325 packages
  // vanished). The committed manifest locks the exact package key set.
  // Regenerate deliberately with --update-packages-manifest and commit the
  // diff together with the change that caused it.
  delete require.cache[require.resolve(path.join(rootDir, 'app/data/packages'))];
  const pkgs = require(path.join(rootDir, 'app/data/packages'));
  const keys = Object.keys(pkgs).filter((k) => typeof pkgs[k] !== 'function').sort();
  if (args.has('--update-packages-manifest') || !fs.existsSync(PACKAGES_MANIFEST)) {
    fs.writeFileSync(PACKAGES_MANIFEST, `${JSON.stringify(keys, null, 1)}\n`);
    log('packages', `manifest updated (${keys.length} keys)`);
  } else {
    const golden = JSON.parse(fs.readFileSync(PACKAGES_MANIFEST, 'utf8'));
    const goldenSet = new Set(golden);
    const keySet = new Set(keys);
    const missing = golden.filter((k) => !keySet.has(k));
    const added = keys.filter((k) => !goldenSet.has(k));
    if (missing.length > 0 || added.length > 0) {
      throw new Error(`asset package set changed: ${missing.length} missing (${missing.slice(0, 5).join(', ')}...), ${added.length} added (${added.slice(0, 5).join(', ')}...). If intentional, rerun with --update-packages-manifest and commit the manifest.`);
    }
    log('packages', `manifest verified (${keys.length} keys)`);
  }
}

function step2Bundle() {
  // resolve the envify variable set HERE, under the real NODE_ENV - vite
  // build forces NODE_ENV=production before evaluating its config, which
  // would flip convict onto production.json (api: "")
  const { version } = require(path.join(rootDir, 'version.json'));
  const buildConfig = {
    NODE_ENV: env,
    VERSION: version,
    API_URL: config.get('api'),
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
  execFileSync('node', ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.client.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, DUELYST_BUILD_CONFIG: JSON.stringify(buildConfig) },
  });
  log('bundle', 'dist/src/duelyst.js built');
}

// same list and order as gulp/vendor.js / gulpfile watchPaths
const VENDOR_FILES = [
  'node_modules/jquery/dist/jquery.js',
  'node_modules/velocity-animate/velocity.js',
  'node_modules/bootstrap-sass/assets/javascripts/bootstrap.js',
  'node_modules/underscore/underscore.js',
  'node_modules/backbone/backbone.js',
  'app/vendor/backfire/backfire.min.js',
  'node_modules/backbone.marionette/lib/backbone.marionette.js',
  'app/vendor/jquery_ui/jquery-ui.min.js',
  'app/vendor/ccConfig.js',
  'app/vendor/cocos2d-html5/lib/cocos2d-js-v3.3-beta0.js',
  'app/vendor/aws/aws-sdk.min.js',
  'app/vendor/aws/aws-sdk-mobile-analytics.min.js',
];

function step3Vendor() {
  const out = VENDOR_FILES.map((f) => fs.readFileSync(f, 'utf8')).join('\n;');
  fs.mkdirSync('dist/src', { recursive: true });
  fs.writeFileSync('dist/src/vendor.js', out);
  log('vendor', `dist/src/vendor.js (${VENDOR_FILES.length} files)`);
}

function renderHbs(srcFile, outFile) {
  const Handlebars = require('handlebars');
  const { version } = require(path.join(rootDir, 'version.json'));
  const template = Handlebars.compile(fs.readFileSync(srcFile, 'utf8'));
  const html = template({
    version,
    development,
    zendeskEnabled: config.get('zendeskEnabled'),
    analyticsEnabled: config.get('analyticsEnabled'),
    gaId: config.get('gaId'),
    cdn: config.get('cdn'),
  });
  fs.writeFileSync(outFile, html);
}

function step4Html() {
  renderHbs('app/index.hbs', 'dist/src/index.html');
  log('html', 'dist/src/index.html rendered');
}

async function step5Css() {
  const sass = require('sass');
  const postcss = require('postcss');
  const autoprefixer = require('autoprefixer');
  const compiled = sass.compile('app/ui/styles/application.scss', {
    loadPaths: ['app/vendor', 'node_modules'],
    quietDeps: true,
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div', 'mixed-decls', 'abs-percent'],
  });
  const prefixed = await postcss([autoprefixer]).process(compiled.css, { from: undefined });
  fs.writeFileSync('dist/src/duelyst.css', prefixed.css);
  log('css', 'dist/src/duelyst.css compiled');
}

function step6Locales() {
  // consolidate the en locale parts into index.json (gulp used require-dir)
  const localeDir = 'app/localization/locales/en';
  const all = {};
  for (const file of fs.readdirSync(localeDir)) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    all[path.basename(file, '.json')] = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'));
  }
  fs.writeFileSync(path.join(localeDir, 'index.json'), JSON.stringify(all));
  // copy every locale's index.json into dist
  const localesRoot = 'app/localization/locales';
  for (const locale of fs.readdirSync(localesRoot)) {
    const idx = path.join(localesRoot, locale, 'index.json');
    if (!fs.existsSync(idx)) continue;
    const dest = path.join('dist/src/resources/locales', locale);
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(idx, path.join(dest, 'index.json'));
  }
  log('locales', 'dist/src/resources/locales updated');
}

const RSX_KEYS = ['img', 'imgPosX', 'imgNegX', 'imgPosY', 'imgNegY', 'imgPosZ', 'imgNegZ', 'audio', 'plist', 'font'];

function step7Resources() {
  // copy non-cdn package resources (gulp/rsx.js copy)
  const pkgsAll = require(path.join(rootDir, 'app/data/packages')).all;
  const paths = new Set();
  for (const rsx of pkgsAll) {
    if (rsx.cdn) continue;
    for (const key of RSX_KEYS) {
      if (rsx[key]) paths.add(rsx[key]);
    }
  }
  log('resources', `${paths.size} non-cdn resource paths to copy`);
  let copied = 0;
  for (const rel of paths) {
    const src = path.join('app', rel);
    const dest = path.join('dist/src', rel);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const srcStat = fs.statSync(src);
    if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= srcStat.mtimeMs) continue;
    fs.copyFileSync(src, dest);
    copied += 1;
  }
  // copy web assets (favicon etc., gulp/rsx.js copyWeb)
  for (const file of fs.readdirSync('app/resources/web')) {
    fs.copyFileSync(path.join('app/resources/web', file), path.join('dist/src', file));
  }
  log('resources', `${copied} files copied (rest unchanged)`);
}

const firebaseUrl = process.env.FIREBASE_URL;
if (!firebaseUrl || !firebaseUrl.endsWith('firebaseio.com/')) {
  throw new Error('FIREBASE_URL must be set and end in firebaseio.com/');
}

step3Vendor();
step4Html();
await step5Css();
step6Locales();
if (!args.has('--skip-packages')) step1Packages();
step2Bundle();
if (!args.has('--skip-resources')) step7Resources();
log('done', 'client build complete');
