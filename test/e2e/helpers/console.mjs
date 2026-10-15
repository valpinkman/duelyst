/*
 * Console capture shared by the e2e specs.
 *
 * The rule the screen tour exists to enforce (issue #2): **a missing asset is
 * a failure.** The client streams art and audio from `resources/`, and a
 * migration that drops a file, renames a path or loses a package entry shows
 * up as exactly one thing at runtime - a 404 for that URL. So 404s under
 * `resources/` are never allowlisted; every other dev-server 404 still is.
 *
 * Two independent paths enforce it, because neither alone is reliable:
 *  - the `response` listener sees every 404 under `resources/` by URL,
 *    whatever (if anything) the browser chooses to log for it;
 *  - the console filter refuses to drop a "Failed to load resource: 404" line
 *    whose location is under `resources/`, for the case where only the log
 *    line carries the URL.
 * A resource 404 caught by both is reported once per URL.
 */

const STATUS_404 = /Failed to load resource: the server responded with a status of 404/;

/** True when a URL points into the client's asset tree. */
export function isUnderResources(url) {
  if (!url) return false;
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    // not absolute: test it as a path
  }
  return /(^|\/)resources\//.test(pathname);
}

const CONSOLE_NOISE = [
  /*
   * 404s OUTSIDE resources/ only - the dev server answers a few optional
   * probes with 404 (and the vendored bootstrap @font-face points at
   * ../fonts/bootstrap/glyphicons-halflings-regular.*, which is not shipped).
   * A 404 under resources/ never reaches this list: see watchConsole.
   */
  STATUS_404,
  /*
   * `POST /session/username_available` answers "this username is taken" with
   * **401**, and the client handles that as a normal answer:
   *     // 401 result suggests username is bad or unavailable
   *     if (res.status === 401) { return false; }
   * The browser logs every 401 as a failed resource regardless, so a perfectly
   * healthy registration can emit one depending on when the availability check
   * lands relative to the account being created. That made this suite fail
   * intermittently.
   *
   * Allowlisting the line does NOT blind us to a real auth failure: if
   * authentication actually broke, the functional assertions - reaching the
   * welcome screen, starting a game, the AI taking its turn - would fail first
   * and far more loudly. The console check is here for uncaught JS errors, not
   * for HTTP statuses the client deliberately interprets.
   *
   * (401 for "already taken" is an upstream API wart; 409 Conflict is what it
   * means. Changing it would be an API contract change, not a test fix.)
   */
  /Failed to load resource: the server responded with a status of 401/,
];

/**
 * Decide whether one console error line is noise. Exported so the predicate
 * can be exercised without a browser.
 * @param {string} text the console message text
 * @param {string} [url] the message's source location URL
 */
export function isConsoleNoise(text, url) {
  if (STATUS_404.test(text) && isUnderResources(url)) return false;
  return CONSOLE_NOISE.some((re) => re.test(text));
}

/**
 * Collect page errors so a test can assert the client ran cleanly.
 * Returns a live array; `takeErrors` drains it, so a long test can attribute
 * errors to the step that produced them.
 */
export function watchConsole(page) {
  const errors = [];
  const reported404s = new Set();
  const report404 = (url, text) => {
    if (reported404s.has(url)) return;
    reported404s.add(url);
    errors.push(`missing asset (404): ${url}${text ? ` - ${text}` : ''}`);
  };

  page.on('response', (response) => {
    if (response.status() === 404 && isUnderResources(response.url())) {
      report404(response.url());
    }
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    const url = msg.location()?.url || '';
    if (STATUS_404.test(text) && isUnderResources(url)) {
      report404(url, text);
      return;
    }
    if (isConsoleNoise(text, url)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

/** Drain the errors collected so far. */
export function takeErrors(errors) {
  return errors.splice(0, errors.length);
}
