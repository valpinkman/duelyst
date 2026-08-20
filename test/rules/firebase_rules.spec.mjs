/*
 * Security-rules tests (plan 9.2).
 *
 * These exist because of a specific hazard. Moving the client off firebase@2
 * means the rules stop reading `auth.id` (where Firebase 2.x put every field
 * of the token's `d` payload) and start reading `auth.uid` + `auth.token.*`,
 * which is what a real custom token produces. That is 86 substitutions across
 * a file guarding live player data.
 *
 * The integration suite CANNOT catch a mistake here: it connects with a
 * service account, and admin credentials bypass security rules entirely. So it
 * would stay green with the rules completely broken.
 *
 * The emulator is the only thing that can assert a DENIAL, so it is what we
 * test against - also meaning these run offline, need no cloud project, and
 * cost nothing.
 *
 * Run: pnpm test:rules   (wraps this in `firebase emulators:exec`)
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { ref, get, set } from 'firebase/database';
import { beforeAll, afterAll, describe, it } from 'vitest';

const ME = '-MyUserId000000000001';
const OTHER = '-OtherUserId00000002';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'duelyst-rules-test',
    database: {
      rules: readFileSync('firebaseRules.json', 'utf8'),
      host: '127.0.0.1',
      port: 9000,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

/** A database handle authenticated as `uid`, exactly as a real client would be. */
function asUser(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).database();
}

describe('firebase security rules', () => {
  describe('auth.uid identifies the user (replaces auth.id)', () => {
    it('expect a user to read their own chat/users node', async () => {
      await assertSucceeds(get(ref(asUser(ME), `chat/users/${ME}`)));
    });

    // the assertion that actually proves the rewrite works: if `auth.uid` were
    // wrong (or still `auth.id`, which is now always undefined) this READ would
    // be denied too, but this DENIAL is what proves the rule is discriminating
    // rather than just open
    it("expect a user NOT to read another user's chat/users node", async () => {
      await assertFails(get(ref(asUser(ME), `chat/users/${OTHER}`)));
    });

    it('expect a user to write their own portrait_id', async () => {
      await assertSucceeds(set(ref(asUser(ME), `chat/users/${ME}/portrait_id`), 42));
    });

    it("expect a user NOT to write another user's portrait_id", async () => {
      await assertFails(set(ref(asUser(ME), `chat/users/${OTHER}/portrait_id`), 42));
    });
  });

  describe('unauthenticated access', () => {
    it('expect an unauthenticated client to be denied', async () => {
      const anon = testEnv.unauthenticatedContext().database();
      await assertFails(get(ref(anon, `chat/users/${ME}`)));
    });
  });
});
