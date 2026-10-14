/*
 * A NEGATIVE test for the model attribute types in
 * apps/client/types/backbone_models.d.ts.
 *
 * There is no runtime here on purpose: what is being asserted is that certain
 * expressions DO NOT COMPILE, and the assertion mechanism is
 * `@ts-expect-error`. TypeScript reports an unused `@ts-expect-error` as an
 * error of its own (TS2578), so if any line below ever starts compiling,
 * `pnpm typecheck` fails -- which is what makes this a gate rather than a
 * comment. The positive lines next to each one keep it honest: they prove the
 * expression is rejected for the key, not because the whole thing is broken.
 *
 * It lives under `test/types/` and not `test/unit/` because vitest's include
 * is `test/unit/**` -- this file is checked by `tsc`, never executed.
 *
 * Types here are all global (see the header of apps/client/types/backbone_models.d.ts
 * for why), so this file requires nothing and declares its models instead of
 * building them: `declare` emits no code, and constructing a real
 * DuelystFirebase model would need a live firebase.
 */

declare const wallet: WalletModel;
declare const profile: ProfileModel;
declare const quest: QuestModel;
declare const factionProgression: FactionProgressionModel;
declare const cards: DuelystFirebaseCollection<InventoryCardModel>;

/* region a key that does not exist is a compile error */

// @ts-expect-error -- the attribute is 'gold_amount'; 'gold' is not a wallet key
wallet.get('gold');
wallet.get('gold_amount');

// @ts-expect-error -- 'spirit' is the column name on `users`, not the firebase key
wallet.get('spirit');
wallet.get('spirit_amount');

// @ts-expect-error -- profile settings are camelCase; there is no 'game_speed'
profile.get('game_speed');
profile.get('gameSpeed');

// @ts-expect-error -- quests carry 'quest_type_id', not 'quest_id'
quest.get('quest_id');
quest.get('quest_type_id');

// @ts-expect-error -- faction progression has 'xp', not 'experience'
factionProgression.get('experience');
factionProgression.get('xp');

// @ts-expect-error -- the collection's models are card inventory rows, which have no 'gold'
cards.at(0).get('gold');
cards.at(0).get('count');

/* endregion a key that does not exist is a compile error */

/* region attribute VALUES are typed too, not just the keys */

// @ts-expect-error -- gold_amount is a number
wallet.set('gold_amount', 'a lot');
wallet.set('gold_amount', 100);

// @ts-expect-error -- doNotDisturb is a boolean
profile.set('doNotDisturb', 'yes');
profile.set('doNotDisturb', true);

/* endregion attribute VALUES are typed too, not just the keys */

/* region the type parameter propagates through the wrappers */

declare const DuelystFirebase: DuelystFirebaseStatic;
declare const DuelystBackbone: DuelystBackboneStatic;

// this is the shape every manager builds its models with
const constructedWallet = new DuelystFirebase.Model<WalletAttributes>(null, { firebase: null });
// @ts-expect-error -- the parameter survived the constructor
constructedWallet.get('gold');
constructedWallet.get('gold_amount');

const constructedQuests = new DuelystFirebase.Collection<QuestModel>(null, { firebase: null });
// @ts-expect-error -- and through a collection to its member models
constructedQuests.at(0).get('quest_id');
constructedQuests.at(0).get('quest_type_id');

const constructedChallenge = new DuelystBackbone.Model<DailyChallengeCompletedAtAttributes>();
// @ts-expect-error -- the non-firebase wrapper propagates it as well
constructedChallenge.get('completed_at');
constructedChallenge.get('daily_challenge_last_completed_at');

/* endregion the type parameter propagates through the wrappers */

/*
 * Left deliberately unchecked: a model built WITHOUT a type parameter still
 * behaves exactly as it does today, so no existing call site is affected by
 * this change.
 */
const untypedModel = new DuelystFirebase.Model(null, { firebase: null });
untypedModel.get('anything at all');
