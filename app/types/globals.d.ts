/*
 * Ambient declarations for the vendor libraries that are concatenated into
 * dist/src/vendor.js and consumed as globals rather than imported
 * (see scripts/build/build-client.mjs VENDOR_FILES).
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
declare const Velocity: any;
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
