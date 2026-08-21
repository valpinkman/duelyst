/*
 * Deterministic `Math.random` for tests that sample rather than assert.
 *
 * Several data_access suites are Monte Carlo simulations: they run a few
 * hundred simulated players through the crate logic, or let the rift module
 * pick random card choices, and then assert on a mean or a percentile. With an
 * unseeded generator those assertions sit near their tolerance and flip
 * verdict between runs -- three consecutive runs of an unchanged tree gave
 * 70 / 70 / 71 failures. A gate that fails randomly gets ignored, so the suites
 * cannot enter CI in that state.
 *
 * Seeding fixes the sequence without weakening the assertion: the same code
 * still has to produce the same statistics, they just stop depending on which
 * numbers the machine happened to hand out.
 *
 * The seed is a fixed arbitrary constant, deliberately NOT chosen by trying
 * values until the suite went green -- that would fit the seed to the
 * assertions and hide exactly the disagreements these tests exist to surface.
 */

const REAL_MATH_RANDOM = Math.random;

/** mulberry32: small, fast, well-distributed enough for simulation tests. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function seededRandom() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFAULT_SEED = 20260821;

/** Replace Math.random for the current test scope. Pair with restoreRandom(). */
function installSeededRandom(seed = DEFAULT_SEED) {
  Math.random = mulberry32(seed);
}

/** Put the real Math.random back. Always call this in an afterAll/afterEach. */
function restoreRandom() {
  Math.random = REAL_MATH_RANDOM;
}

module.exports = { installSeededRandom, restoreRandom, mulberry32, DEFAULT_SEED };
