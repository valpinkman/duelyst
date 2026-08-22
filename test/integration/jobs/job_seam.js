/*
 * Integration tests for the job seam (server/redis/r-jobs), against a real redis.
 *
 * These exist because every bug in the kue -> BullMQ migration was found by hand
 * probing, not by a test, and two of them had been live for many commits:
 *
 *   - kue's builder `.delay(ms)` had been rewritten into a promise `.then(...)`,
 *     so every matchmaking re-queue threw and retry/backoff was dead;
 *   - `removeOnComplete: true` turned out to be incompatible with BullMQ's
 *     waitUntilFinished, which would have broken the post-game ratings path on
 *     every game.
 *
 * Both are pinned below. The suite needs redis and nothing else, so unlike the
 * other integration suites it can run in CI.
 *
 * Queue names are unique per test: a worker running against the same redis (the
 * compose stack, on a dev machine) would otherwise consume these jobs itself,
 * and the failure would look like a mysterious timeout.
 */

const { expect } = require('chai');
const Jobs = require('@duelyst/server/redis/r-jobs');

let counter = 0;
const uniqueQueue = (label) => {
  counter += 1;
  return `test-jobseam-${process.pid}-${counter}-${label}`;
};

// Every worker started by a test, closed in afterEach so a hung worker cannot
// leak into the next test.
let workers = [];
let queueNames = [];

const startWorker = function (name, concurrency, handler, opts) {
  const worker = Jobs.process(name, concurrency, handler, opts);
  workers.push(worker);
  queueNames.push(name);
  return worker;
};

const enqueue = function (name, data, opts) {
  if (!queueNames.includes(name)) queueNames.push(name);
  return Jobs.enqueue(name, data, opts);
};

describe('job seam (BullMQ)', () => {
  afterEach(async () => {
    await Promise.all(workers.map((w) => w.close()));
    workers = [];
    await Promise.all(
      queueNames.map((n) =>
        Jobs.queueFor(n)
          .obliterate({ force: true })
          .catch(() => {}),
      ),
    );
    queueNames = [];
  });

  afterAll(async () => {
    await Jobs.shutdown();
  });

  describe('enqueue and process', () => {
    it('runs an enqueued job and hands the handler its data', async () => {
      const name = uniqueQueue('basic');
      const seen = [];
      startWorker(name, 1, (job, done) => {
        seen.push(job.data);
        done();
      });

      const job = await enqueue(name, { hello: 'world', n: 7 });
      await Jobs.waitFor(job);

      expect(seen).to.deep.equal([{ hello: 'world', n: 7 }]);
    });

    it('keeps job types isolated - a worker only sees its own queue', async () => {
      const a = uniqueQueue('iso-a');
      const b = uniqueQueue('iso-b');
      const seenA = [];
      const seenB = [];
      startWorker(a, 1, (job, done) => {
        seenA.push(job.data.tag);
        done();
      });
      startWorker(b, 1, (job, done) => {
        seenB.push(job.data.tag);
        done();
      });

      await Jobs.waitFor(await enqueue(a, { tag: 'for-a' }));
      await Jobs.waitFor(await enqueue(b, { tag: 'for-b' }));

      expect(seenA).to.deep.equal(['for-a']);
      expect(seenB).to.deep.equal(['for-b']);
    });

    it('processes every job when several are queued', async () => {
      const name = uniqueQueue('many');
      const seen = [];
      startWorker(name, 1, (job, done) => {
        seen.push(job.data.i);
        done();
      });

      const jobs = await Promise.all([0, 1, 2, 3, 4].map((i) => enqueue(name, { i })));

      /*
       * Each waitFor is raced against a timeout so a hung waiter fails HERE,
       * naming the job, instead of stalling until vitest's 60s cap with no clue
       * which one hung. The race result is what is asserted -- asserting only
       * that the handler ran would pass even while every waiter hung, which is
       * exactly the bug this test exists to catch.
       */
      const settled = await Promise.all(
        jobs.map((j, idx) =>
          Promise.race([
            Jobs.waitFor(j).then(
              () => `#${idx}:ok`,
              (e) => `#${idx}:rejected ${e.message}`,
            ),
            new Promise((r) => {
              setTimeout(() => r(`#${idx}:HUNG`), 15000);
            }),
          ]),
        ),
      );

      expect(settled).to.deep.equal(['#0:ok', '#1:ok', '#2:ok', '#3:ok', '#4:ok']);
      expect(seen.slice().sort()).to.deep.equal([0, 1, 2, 3, 4]);
    });
  });

  describe('the kue-shaped (job, done) handler adapter', () => {
    it('resolves waitFor with the value passed to done(null, value)', async () => {
      const name = uniqueQueue('done-value');
      startWorker(name, 1, (job, done) => done(null, { ok: true, echo: job.data.x }));

      const result = await Jobs.waitFor(await enqueue(name, { x: 42 }));
      expect(result).to.deep.equal({ ok: true, echo: 42 });
    });

    it('rejects waitFor when the handler calls done(err)', async () => {
      const name = uniqueQueue('done-err');
      startWorker(name, 1, (job, done) => done(new Error('handler said no')));

      let err = null;
      await Jobs.waitFor(await enqueue(name, {})).catch((e) => {
        err = e;
      });
      expect(err && err.message).to.equal('handler said no');
    });

    it('rejects waitFor when the handler throws synchronously', async () => {
      const name = uniqueQueue('throw');
      startWorker(name, 1, () => {
        throw new Error('boom');
      });

      let err = null;
      await Jobs.waitFor(await enqueue(name, {})).catch((e) => {
        err = e;
      });
      expect(err && err.message).to.equal('boom');
    });
  });

  /*
   * The regression that would have broken ratings on every game: BullMQ reads
   * the job's key to resolve waitUntilFinished, so a job removed the instant it
   * completes fails the waiter with "Missing key for job ... isFinished".
   */
  describe('waitFor with removeOnComplete (the ratings-path regression)', () => {
    it('still resolves for a job enqueued with removeOnComplete', async () => {
      const name = uniqueQueue('roc');
      startWorker(name, 1, (job, done) => done(null, 'finished'));

      const job = await enqueue(name, {}, { removeOnComplete: true });
      expect(await Jobs.waitFor(job)).to.equal('finished');
    });

    it('still reports failure for a job enqueued with removeOnComplete', async () => {
      const name = uniqueQueue('roc-fail');
      startWorker(name, 1, (job, done) => done(new Error('failed anyway')));

      let err = null;
      await Jobs.waitFor(await enqueue(name, {}, { removeOnComplete: true })).catch((e) => {
        err = e;
      });
      expect(err && err.message).to.equal('failed anyway');
    });
  });

  /*
   * Replaces kue's .ttl(ms). BullMQ's stalled-job detection only covers a worker
   * that DIES; a handler that hangs forever is what a ttl actually guards, and
   * that is the case tested here.
   */
  describe('ttl', () => {
    it('fails a job whose handler never completes', async () => {
      const name = uniqueQueue('ttl-hang');
      startWorker(
        name,
        1,
        () => {
          /* never calls done */
        },
        { ttl: 300 },
      );

      let err = null;
      await Jobs.waitFor(await enqueue(name, {})).catch((e) => {
        err = e;
      });
      expect(err, 'a hanging handler must fail the job').to.not.equal(null);
      expect(err.message).to.match(/ttl|timed out/i);
    });

    it('leaves a job that finishes within the ttl alone', async () => {
      const name = uniqueQueue('ttl-ok');
      startWorker(name, 1, (job, done) => setTimeout(() => done(null, 'in time'), 20), {
        ttl: 2000,
      });

      expect(await Jobs.waitFor(await enqueue(name, {}))).to.equal('in time');
    });
  });

  /*
   * kue's builder .delay(ms), which a codemod had rewritten into a promise
   * .then() -- killing every matchmaking re-queue.
   */
  describe('delay', () => {
    it('does not run a delayed job before its delay has elapsed', async () => {
      const name = uniqueQueue('delay');
      let ranAt = null;
      const enqueuedAt = Date.now();
      startWorker(name, 1, (job, done) => {
        ranAt = Date.now();
        done();
      });

      await Jobs.waitFor(await enqueue(name, {}, { delay: 400 }));

      expect(ranAt, 'job ran before its delay').to.be.at.least(enqueuedAt + 350);
    });
  });

  describe('concurrency', () => {
    it('runs at most `concurrency` handlers at once', async () => {
      const name = uniqueQueue('concurrency');
      let inFlight = 0;
      let maxInFlight = 0;
      startWorker(name, 2, (job, done) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        setTimeout(() => {
          inFlight -= 1;
          done();
        }, 60);
      });

      const jobs = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => enqueue(name, { i })));
      await Promise.all(jobs.map((j) => Jobs.waitFor(j)));

      expect(maxInFlight).to.be.at.most(2);
      expect(maxInFlight, 'should actually use the available concurrency').to.equal(2);
    });
  });
});
