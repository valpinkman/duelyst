/*
 * A very small `fetch` wrapper standing in for the direct `$.ajax` call sites
 * the client used to make (managers, a handful of views, application.ts).
 *
 * It is deliberately NOT a service layer. It takes the same option bag those
 * call sites already passed to `$.ajax` and reproduces jQuery 2.1.4's
 * *observable* behaviour for exactly the options they used -- `url`, `type`,
 * `data`, `contentType`, `dataType: 'json'` -- so converting a call site is a
 * rename plus a `.done()/.fail()` -> `.then(onDone, onFail)` merge, and the
 * error shape callers destructure (`err.responseJSON`) still arrives.
 *
 * What is reproduced, and why each line is there:
 *
 *   - **Global default headers.** `$.ajaxSetup({ headers })` is how the client
 *     attaches `Authorization` and `Client-Version` to every request. jQuery's
 *     ajaxSetup deep-extends, so login/logout merge into one map rather than
 *     replacing it; `setDefaultHeaders` does the same. It is still called
 *     alongside `$.ajaxSetup`, not instead of it: Backbone.sync goes through
 *     `Backbone.ajax` and keeps needing the jQuery-side defaults.
 *   - **304 is success.** jQuery resolves 3xx-not-modified; `fetch` reports
 *     `res.ok === false` for it. Two call sites branch on a 304 meaning
 *     "already done", so this distinction is load-bearing.
 *   - **204 / 304 / HEAD resolve with `undefined`** and are never parsed, which
 *     is what jQuery does (`statusText = "nocontent"`, `success` left unset).
 *   - **An empty body on any other 2xx is a failure**, because jQuery 2.1.4
 *     converts with `JSON.parse(data + "")` and lets the throw become
 *     `parsererror`. Resolving `null` there would silently turn some existing
 *     error paths into success paths.
 *   - **`responseJSON` is set even on failures**, as jQuery's converters run
 *     "no matter what". Most call sites read the server's message off it.
 *
 * What is deliberately NOT reproduced:
 *
 *   - `X-Requested-With: XMLHttpRequest`. jQuery only sends it same-origin, no
 *     server route in this repo reads it, and sending it cross-origin to
 *     `API_URL` would add a header to the CORS preflight for no gain.
 *   - `timeout`. `fetch` has none; no converted call site set one. (The one
 *     `$.ajax` that does is the JSONP call in stream_manager, which cannot
 *     become a `fetch` at all and was left alone.)
 *   - Anything for `dataType` other than `'json'`.
 *
 * Cookies: `credentials: 'same-origin'` is jQuery's behaviour exactly -- it
 * sends cookies to the same origin and does not set `withCredentials`, so
 * cross-origin calls to `API_URL` stay anonymous and rely on the bearer token.
 */

interface RequestOptions {
  url: string;
  /** HTTP verb. jQuery's option name; defaults to GET as jQuery does. */
  type?: string;
  /** Already-serialised request body. Every call site passes JSON.stringify(...). */
  data?: string | null;
  contentType?: string;
  dataType?: string;
}

interface RequestResponse {
  /** Parsed body, or `undefined` for 204/304/HEAD -- jQuery's `done(data)` value. */
  data: any;
  status: number;
  statusText: string;
}

/** The jQuery-shaped rejection value. Call sites read `responseJSON`. */
interface RequestError extends Error {
  status: number;
  statusText: string;
  responseText: string;
  responseJSON?: any;
}

const NO_BODY_METHODS = ['GET', 'HEAD'];

let defaultHeaders: Record<string, string> = {};

/**
 * Mirror of `$.ajaxSetup({ headers })` for requests that no longer go through
 * jQuery. Merges, because jQuery's ajaxSetup deep-extends its settings.
 */
function setDefaultHeaders(headers: Record<string, string>): void {
  defaultHeaders = { ...defaultHeaders, ...headers };
}

function getDefaultHeaders(): Record<string, string> {
  return { ...defaultHeaders };
}

function buildError(
  status: number,
  statusText: string,
  responseText: string,
  responseJSON: any,
): RequestError {
  const error = new Error(statusText || `Request failed with status ${status}`) as RequestError;
  error.status = status;
  error.statusText = statusText;
  error.responseText = responseText;
  if (responseJSON !== undefined) {
    error.responseJSON = responseJSON;
  }
  return error;
}

/**
 * Like {@link requestJson}, but resolves with the status alongside the parsed
 * body. Only for the call sites that used to read `request.status` off the
 * jqXHR to tell "changed" from "already up to date".
 */
function requestJsonWithStatus(options: RequestOptions): Promise<RequestResponse> {
  const method = (options.type || 'GET').toUpperCase();
  const headers: Record<string, string> = { ...defaultHeaders };

  if (options.dataType === 'json') {
    // jQuery's `accepts.json`, verbatim -- routes may content-negotiate on it.
    headers.Accept = 'application/json, text/javascript, */*; q=0.01';
  }
  if (options.contentType != null) {
    // jQuery sets this whenever the caller passed contentType, body or not.
    headers['Content-Type'] = options.contentType;
  }

  const init: RequestInit = {
    method,
    headers,
    credentials: 'same-origin',
  };
  if (options.data != null && !NO_BODY_METHODS.includes(method)) {
    init.body = options.data;
  }

  return fetch(options.url, init).then((response) =>
    response.text().then((responseText) => {
      const { status } = response;
      const statusText = response.statusText || '';
      const isSuccess = response.ok || status === 304;
      const hasBody = status !== 204 && status !== 304 && method !== 'HEAD';

      let responseJSON;
      let parseFailed = false;
      if (options.dataType === 'json' && hasBody) {
        try {
          responseJSON = JSON.parse(responseText);
        } catch (e) {
          parseFailed = true;
        }
      }

      if (!isSuccess) {
        throw buildError(status, statusText, responseText, responseJSON);
      }
      if (parseFailed) {
        // jQuery's `parsererror`: a 2xx whose body is not the promised JSON
        // (an empty body included) rejects rather than resolving.
        throw buildError(status, 'parsererror', responseText, undefined);
      }
      return { data: responseJSON, status, statusText };
    }),
  );
}

/**
 * Drop-in for `$.ajax({ dataType: 'json', ... })`: resolves with the parsed
 * body, rejects with a jQuery-shaped error carrying `responseJSON`.
 */
function requestJson(options: RequestOptions): Promise<any> {
  return requestJsonWithStatus(options).then((response) => response.data);
}

module.exports = {
  requestJson,
  requestJsonWithStatus,
  setDefaultHeaders,
  getDefaultHeaders,
};
