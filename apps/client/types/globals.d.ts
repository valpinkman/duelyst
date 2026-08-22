/*
 * Ambient declarations for the vendor libraries that are concatenated into
 * dist/src/vendor.js and consumed as globals rather than imported
 * (see tools/build/build-client.mjs VENDOR_FILES).
 *
 * They are `any` on purpose: typing cocos2d-html5 3.3-beta0, Backbone 1.1 and
 * Marionette 2.2 is not the point of the migration. Narrow them if a
 * particular API becomes worth type-checking.
 */
declare const cc: any;
declare const gl: any;
declare const Backbone: any;
declare const Marionette: any;
declare const Handlebars: any;
declare const Firebase: any;
declare const AWS: any;
declare const ga: any;
declare const $: any;
declare const jQuery: any;
declare const _: any;
declare const ccui: any;

/*
 * Singletons that app/application.ts publishes on `window` at boot and that
 * other modules then reference bare. Declaring them keeps the migration
 * honest about what is actually global at runtime; converting these to real
 * imports is follow-up work (they exist to survive circular requires).
 */
declare const SDK: any;
declare const CONFIG: any;
declare const RSX: any;
declare const PKGS: any;
declare const EventBus: any;
declare const Analytics: any;
declare const Session: any;
declare const Logger: any;
declare const NavigationManager: any;
declare const ProfileManager: any;
declare const GamesManager: any;
declare const InventoryManager: any;
declare const ProgressionManager: any;
declare const NotificationsManager: any;
declare const ChatManager: any;
declare const QuestsManager: any;
declare const ShopManager: any;
declare const GameDataManager: any;
declare const achievementsManager: any;
declare const audio_engine: any;

interface Window {
  [key: string]: any;
}

// the `colors` package monkey-patches String.prototype with ANSI helpers
interface String {
  red: string;
  green: string;
  blue: string;
  yellow: string;
  cyan: string;
  magenta: string;
  gray: string;
  grey: string;
  white: string;
  black: string;
  bold: string;
  italic: string;
  underline: string;
  inverse: string;
  rainbow: string;
}

/*
 * Managers and views that application.ts / register.ts publish onto `window`
 * (`window.TelemetryManager = require(...)`) and that other modules then read
 * as bare globals. These are NOT missing requires: they resolve at runtime
 * because the boot files assign them before any of these modules run.
 *
 * They are declared rather than "fixed" precisely so that a real undefined
 * identifier -- which is a ReferenceError waiting to happen, and which eslint
 * cannot see because no-undef is off for .ts -- still shows up as TS2304
 * instead of being lost in the noise.
 */
declare const TelemetryManager: any;
declare const NewPlayerManager: any;

/*
 * Third-party globals injected by <script> tags rather than bundled:
 * the Kongregate host API and Google reCAPTCHA.
 */
declare const kongregate: any;
declare const grecaptcha: any;

/*
 * AI-vs-AI debugging hooks, assigned as `window.ai_*` in application.ts and
 * read bare. Only present when AI_TOOLS_ENABLED.
 */
declare const ai_gamePromise: any;
declare const ai_stopAIvAIGame: any;
