/*
 * Attribute types for the Backbone models the manager singletons own, plus the
 * generic shape of the two wrappers in `apps/client/ui/extensions/`.
 *
 * WHY THIS FILE IS A GLOBAL `.d.ts` AND NOT A MODULE
 * --------------------------------------------------
 * `apps/client/ui` is 100% CommonJS: every consumer of a model is a `.ts` file that
 * pulls its dependencies through `require('apps/client/ui/...')`. In a `.ts` file
 * `require()` is `NodeRequire`, which returns `any` -- so nothing a module
 * exports can reach a call site by itself, no matter how well typed it is.
 * Declaring these types globally lets a call site opt in with an annotation
 * (`var walletModel: WalletModel = ...`) without an `import`, which would turn
 * a CommonJS file into an ES module and change what the bundler emits.
 *
 * `import('backbone')` is used for the base types instead of a global
 * reference on purpose: `@types/backbone` is a UMD package, and pulling its
 * global in would collide with `declare const Backbone: any` in globals.d.ts
 * (Backbone reaches the client through `vendor.js`, not through npm).
 *
 * `@types/backbone` itself is patched -- `patches/@types__backbone.patch`,
 * which drops the two `/// <reference types>` directives it opens with. The
 * patch header says why; the short version is that they would replace this
 * repo's `$` and `_` globals with descriptions of library versions it does not
 * ship.
 *
 * ATTRIBUTES ARE `type`, NOT `interface`, ON PURPOSE
 * -------------------------------------------------
 * `Backbone.Model<T>` constrains `T extends Record<string, any>`. An interface
 * has no implicit index signature and does not satisfy that constraint; a type
 * alias does. Declaring one of these as an `interface` fails to compile.
 *
 * WHERE THE SHAPES COME FROM
 * --------------------------
 * Every field below is evidenced by a server write or a migration -- the
 * firebase payloads in `apps/server/lib/data_access/{sync,inventory,users}.ts` and
 * the tables in `apps/server/migrations/`. Nothing here is inferred from a call
 * site alone. Deliberately NOT typed, because their shape is dynamic rather
 * than a record:
 *   - `QuestsManager#dailyQuestsGeneratedAtModel` -- points at a firebase
 *     LEAF, and the manager reads `_.keys(model.attributes)[0]`.
 *   - `ProgressionManager#gameCounterRewardsCollection` -- no server writer in
 *     this tree and no `.get()` reader.
 */

/* region BACKBONE BASE TYPES */

type DuelystAttributes = Record<string, any>;

type BackboneModelOf<A extends DuelystAttributes> = import('backbone').Model<A>;

type BackboneCollectionOf<M extends import('backbone').Model<any>> =
  import('backbone').Collection<M>;

/* endregion BACKBONE BASE TYPES */

/* region apps/client/ui/extensions/duelyst_backbone.ts */

/** The `isSynced` / `onSyncOrReady` pair both wrappers add. */
interface DuelystSyncable {
  isSynced: boolean;
  onSyncOrReady(callback?: (error: Error | null, result?: any) => void): Promise<this>;
}

interface DuelystModel<A extends DuelystAttributes = any>
  extends BackboneModelOf<A>, DuelystSyncable {
  onReadyError(model: any, resp: any, options?: any): void;
  /*
   * `@types/backbone` declares `Model#url` as `() => string`, which is wrong:
   * `Backbone.sync` reads it with `_.result`, so a plain string works, and
   * several managers assign one (`model.url = API_URL + '/api/...'`).
   * `Collection#url` is already `_Result<string>` upstream. It has to be
   * `any` rather than `string | (() => string)`, because an interface member
   * must stay assignable to the one it inherits.
   */
  url: any;
}

interface DuelystCollection<M extends import('backbone').Model<any> = DuelystModel>
  extends BackboneCollectionOf<M>, DuelystSyncable {
  onReadyError(model: any, resp: any, options?: any): void;
}

interface DuelystModelConstructor {
  new <A extends DuelystAttributes = any>(
    attributes?: Partial<A> | null,
    options?: any,
  ): DuelystModel<A>;
  /*
   * `extend` stays `any`: Backbone's `extend` returns a constructor carrying
   * whatever the prototype literal declared, which TypeScript cannot recover
   * from an untyped object literal. Subclass definition sites are no worse
   * off than they are today, and direct construction -- which is how every
   * manager builds its models -- is fully typed.
   */
  extend(protoProps?: any, staticProps?: any): any;
}

interface DuelystCollectionConstructor {
  new <M extends import('backbone').Model<any> = DuelystModel>(
    models?: M[] | DuelystAttributes[] | null,
    options?: any,
  ): DuelystCollection<M>;
  extend(protoProps?: any, staticProps?: any): any;
}

/** The value `require('apps/client/ui/extensions/duelyst_backbone')` returns. */
interface DuelystBackboneStatic {
  Model: DuelystModelConstructor;
  Collection: DuelystCollectionConstructor;
}

/* endregion apps/client/ui/extensions/duelyst_backbone.ts */

/* region apps/client/ui/extensions/duelyst_firebase.ts */

interface DuelystFirebaseModel<A extends DuelystAttributes = any> extends DuelystModel<A> {
  /** the `Firebase` reference backfire binds the model to */
  firebase: any;
}

interface DuelystFirebaseCollection<
  M extends import('backbone').Model<any> = DuelystFirebaseModel,
> extends DuelystCollection<M> {
  firebase: any;
}

interface DuelystFirebaseModelConstructor {
  new <A extends DuelystAttributes = any>(
    attributes?: Partial<A> | null,
    options?: any,
  ): DuelystFirebaseModel<A>;
  extend(protoProps?: any, staticProps?: any): any;
}

interface DuelystFirebaseCollectionConstructor {
  new <M extends import('backbone').Model<any> = DuelystFirebaseModel>(
    models?: M[] | DuelystAttributes[] | null,
    options?: any,
  ): DuelystFirebaseCollection<M>;
  extend(protoProps?: any, staticProps?: any): any;
}

/**
 * The value `require('apps/client/ui/extensions/duelyst_firebase')` returns.
 *
 * The two helpers are hung off the exported object rather than assigned to
 * `exports`, because the module ends with `module.exports = ...`, which
 * replaces the exports object wholesale — an `exports.toRef = ...` earlier in
 * the file never reached a caller. `ensureCallableRef` is exercised by
 * test/unit/firebase/backfire_derived_ref.js.
 */
interface DuelystFirebaseStatic {
  Model: DuelystFirebaseModelConstructor;
  Collection: DuelystFirebaseCollectionConstructor;
  /** accepts either firebase 2.x's `.ref()` method or v3+'s `.ref` property */
  toRef(target: any): any;
  /** gives a derived ref a callable `.ref()` so backfire can use it */
  ensureCallableRef(target: any): any;
}

/* endregion apps/client/ui/extensions/duelyst_firebase.ts */

/* region InventoryManager */

/** `user-inventory/<id>/wallet` */
type WalletAttributes = {
  gold_amount: number;
  spirit_amount: number;
  premium_amount: number;
  card_last_four_digits: string;
  updated_at: number;
};

/** `user-inventory/<id>/spirit-orbs/<orb id>` (`user_spirit_orbs`) */
type SpiritOrbAttributes = {
  id: string;
  card_set: number;
  transaction_type: string;
  transaction_id: string;
  params: Record<string, any>;
  created_at: number;
  is_unread: boolean;
};

/**
 * `user-inventory/<id>/spirit-orb-total` -- a map of card set id to the number
 * of orbs opened for that set, so the keys really are open-ended.
 */
type SpiritOrbTotalAttributes = {
  [cardSetId: string]: number;
};

/** `user-inventory/<id>/card-collection/<card id>` (`user_cards`) */
type InventoryCardAttributes = {
  id: string;
  count: number;
  is_unread: boolean;
  is_new: boolean;
};

/** `user-inventory/<id>/card-lore/<card id>` */
type CardLoreAttributes = {
  id: string;
  card_id: number;
  is_unread: boolean;
};

/**
 * `user-inventory/<id>/gauntlet-tickets/<ticket id>` and `.../rift-tickets`
 * (`user_gauntlet_tickets`).
 */
type InventoryTicketAttributes = {
  id: string;
  transaction_type: string;
  transaction_id: string;
  created_at: number;
  is_unread: boolean;
};

/** `user-inventory/<id>/cosmetic-inventory/<cosmetic id>` */
type CosmeticInventoryAttributes = {
  id: string;
  cosmetic_id: number;
  created_at: number;
};

/** `user-inventory/<id>/codex/<chapter id>` */
type CodexChapterAttributes = {
  id: string;
  chapter_id: number;
  is_unread: boolean;
  created_at: number;
  updated_at: number;
};

type WalletModel = DuelystFirebaseModel<WalletAttributes>;
type SpiritOrbTotalModel = DuelystFirebaseModel<SpiritOrbTotalAttributes>;
type SpiritOrbModel = DuelystFirebaseModel<SpiritOrbAttributes>;
type InventoryCardModel = DuelystFirebaseModel<InventoryCardAttributes>;
type CardLoreModel = DuelystFirebaseModel<CardLoreAttributes>;
type InventoryTicketModel = DuelystFirebaseModel<InventoryTicketAttributes>;
type CosmeticInventoryModel = DuelystFirebaseModel<CosmeticInventoryAttributes>;
type CodexChapterModel = DuelystFirebaseModel<CodexChapterAttributes>;

/* endregion InventoryManager */

/* region ProfileManager */

/**
 * `users/<id>`. Two halves that live in the same firebase node: the account
 * fields the server writes (`apps/server/lib/data_access/{users,sync,shop}.ts`) and
 * the client settings `apps/client/ui/models/profile.ts` declares in `defaults` and
 * writes back from the settings menu. The `_`-prefixed ones are local only --
 * `DuelystFirebase.Model#_updateModel` strips them before every write.
 */
type ProfileAttributes = {
  /* account, written by the server */
  id: number;
  username: string;
  created_at: number;
  presence: Record<string, any>;
  tx_counter: { count: number };
  buddies: Record<string, { createdAt: number }>;
  hasAcceptedEula: boolean;
  has_purchased_starter_bundle: boolean;
  rift_stored_upgrade_count: number;
  free_card_of_the_day_claimed_at: number;
  battle_map_id: number;
  ltv: number;
  referred_by_user_id: string;
  referral_rewards_updated_at: number;
  referral_rewards_claimed_at: number;

  /* settings, owned by the client */
  gameSpeed: number;
  lightingQuality: number;
  shadowQuality: number;
  boardQuality: number;
  bloom: number;
  doNotDisturb: boolean;
  showLoreNotifications: boolean;
  alwaysShowStats: boolean;
  selectedScene: string;
  showBattleLog: boolean;
  showPlayerDetails: boolean;
  stickyTargeting: boolean;
  showInGameTips: boolean;
  razerChromaEnabled: boolean;
  showPrismaticsInCollection: boolean;
  showPrismaticsWhileCrafting: boolean;
  showSkinsInCollection: boolean;
  filterCollectionCardSet: number;
  blockSpectators: boolean;
  masterVolume: number;
  musicVolume: number;
  voiceVolume: number;
  effectsVolume: number;
  _resolutionsThatFit: any[];
  _resolutionsThatDontFit: any[];
};

type ProfileModel = DuelystFirebaseModel<ProfileAttributes>;

/** The value `require('apps/client/ui/models/profile')` returns. */
interface ProfileModelConstructor {
  new (attributes?: Partial<ProfileAttributes> | null, options?: any): ProfileModel;
}

/* endregion ProfileManager */

/* region ProgressionManager */

/** `user-progression/<id>/game-counter` (`user_progression`) */
type GameCounterAttributes = {
  game_count: number;
  win_count: number;
  win_streak: number;
  loss_count: number;
  loss_streak: number;
  draw_count: number;
  unscored_count: number;
  last_awarded_game_count: number;
  last_awarded_win_count: number;
  last_awarded_win_count_at: number;
  last_daily_win_at: number;
  last_win_at: number;
  play_awards_last_maxed_at: number;
  win_awards_last_maxed_at: number;
  updated_at: number;
  last_game_id: string;
  last_opponent_id: string;
  last_crate_awarded_at: number;
  last_crate_awarded_game_count: number;
  last_crate_awarded_win_count: number;
};

/**
 * `user-faction-progression/<id>/<faction id>/stats`
 * (`user_faction_progression`)
 */
type FactionProgressionAttributes = {
  faction_id: number;
  xp: number;
  xp_earned: number;
  level: number;
  game_count: number;
  win_count: number;
  loss_count: number;
  draw_count: number;
  unscored_count: number;
  single_player_win_count: number;
  friendly_win_count: number;
  created_at: number;
  updated_at: number;
  last_game_id: string;
};

/** `boss-events/<event id>` */
type BossEventAttributes = {
  id: string;
  event_id: string;
  boss_id: number;
  event_start: number;
  event_end: number;
  valid_end: number;
};

/** `user-bosses-defeated/<id>/<boss id>` */
type BossDefeatedAttributes = {
  id: string;
  boss_id: number;
  boss_event_id: string;
  defeated_at: number;
};

type GameCounterModel = DuelystFirebaseModel<GameCounterAttributes>;
type FactionProgressionModel = DuelystFirebaseModel<FactionProgressionAttributes>;
type BossEventModel = DuelystFirebaseModel<BossEventAttributes>;
type BossDefeatedModel = DuelystFirebaseModel<BossDefeatedAttributes>;

/* endregion ProgressionManager */

/* region QuestsManager */

/** `user-quests/<id>/daily/current/quests/<slot index>` (`user_quests`) */
type QuestAttributes = {
  id: string;
  quest_type_id: number;
  gold: number;
  progress: number;
  progressed_by_game_ids: string[];
  params: Record<string, any>;
  begin_at: number;
  created_at: number;
  updated_at: number;
  mulliganed_at: number;
  is_unread: boolean;
  read_at: number;
};

/**
 * `GET /api/me/challenges/daily/completed_at`
 * (`apps/server/routes/api/me/challenges.ts`) -- fetched over the API, not
 * firebase, so this one is a plain `DuelystBackbone.Model`.
 */
type DailyChallengeCompletedAtAttributes = {
  daily_challenge_last_completed_at: string;
};

type QuestModel = DuelystFirebaseModel<QuestAttributes>;
type DailyChallengeCompletedAtModel = DuelystModel<DailyChallengeCompletedAtAttributes>;

/* endregion QuestsManager */
