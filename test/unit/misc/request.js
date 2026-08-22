/*
 * Contract tests for packages/common/request, the fetch helper that replaced the
 * direct $.ajax call sites (#8).
 *
 * The risk in that conversion is entirely in the edges, not the happy path:
 * $.ajax rejects on a 4xx/5xx and fetch does not, jQuery treats 304 as success
 * and fetch does not, and jQuery 2.1.4 turns an empty body into a parsererror
 * rather than a null. Each of those is a place where a converted call site's
 * error path would silently become a success path (or the reverse), so each
 * gets a test that fails if the helper is "simplified" back to a bare fetch.
 *
 * The default-header registry is here for the same reason: it is what stands in
 * for `$.ajaxSetup({ headers })`, which is how every authenticated request in
 * the client gets its bearer token.
 */
const { expect } = require('chai');

const request = require('@duelyst/common/request');

/** Minimal stand-in for the parts of `Response` the helper reads. */
function fakeResponse(status, body, statusText) {
  return {
    status,
    statusText: statusText === undefined ? 'STATUS ' + status : statusText,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(body),
  };
}

describe('packages/common/request', () => {
  let calls;
  let nextResponse;
  const realFetch = global.fetch;

  beforeEach(() => {
    calls = [];
    nextResponse = fakeResponse(200, '{"ok":true}');
    global.fetch = (url, init) => {
      calls.push({ url, init });
      return nextResponse instanceof Error
        ? Promise.reject(nextResponse)
        : Promise.resolve(nextResponse);
    };
    // the registry is module state; clear whatever a previous test left
    request.setDefaultHeaders({ Authorization: '', 'Client-Version': '' });
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  describe('the request it builds', () => {
    it('resolves with the parsed body, as $.ajax dataType json did', async () => {
      const data = await request.requestJson({ url: '/x', dataType: 'json' });
      expect(data).to.deep.equal({ ok: true });
    });

    it('defaults to GET and sends no body for GET', async () => {
      await request.requestJson({ url: '/x', data: '{"a":1}', dataType: 'json' });
      expect(calls[0].init.method).to.equal('GET');
      expect(calls[0].init.body).to.equal(undefined);
    });

    it('sends the serialised body for verbs that carry one', async () => {
      await request.requestJson({
        url: '/x',
        type: 'PUT',
        data: '{"a":1}',
        contentType: 'application/json',
        dataType: 'json',
      });
      expect(calls[0].init.method).to.equal('PUT');
      expect(calls[0].init.body).to.equal('{"a":1}');
      expect(calls[0].init.headers['Content-Type']).to.equal('application/json');
    });

    it("sends cookies like jQuery did -- same-origin, never 'include'", async () => {
      await request.requestJson({ url: '/x', dataType: 'json' });
      expect(calls[0].init.credentials).to.equal('same-origin');
    });

    it('sets the json Accept header jQuery sent', async () => {
      await request.requestJson({ url: '/x', dataType: 'json' });
      expect(calls[0].init.headers.Accept).to.equal(
        'application/json, text/javascript, */*; q=0.01',
      );
    });
  });

  describe('default headers (the $.ajaxSetup stand-in)', () => {
    it('applies registered defaults to every request', async () => {
      request.setDefaultHeaders({ Authorization: 'Bearer t', 'Client-Version': '1.2.3' });
      await request.requestJson({ url: '/x', dataType: 'json' });
      expect(calls[0].init.headers.Authorization).to.equal('Bearer t');
      expect(calls[0].init.headers['Client-Version']).to.equal('1.2.3');
    });

    it('merges rather than replaces, because $.ajaxSetup deep-extends', async () => {
      request.setDefaultHeaders({ 'Client-Version': '1.2.3' });
      request.setDefaultHeaders({ Authorization: 'Bearer t' });
      expect(request.getDefaultHeaders()).to.deep.equal({
        Authorization: 'Bearer t',
        'Client-Version': '1.2.3',
      });
    });

    it('lets logout blank the token without dropping the version', async () => {
      request.setDefaultHeaders({ Authorization: 'Bearer t', 'Client-Version': '1.2.3' });
      request.setDefaultHeaders({ Authorization: '' });
      await request.requestJson({ url: '/x', dataType: 'json' });
      expect(calls[0].init.headers.Authorization).to.equal('');
      expect(calls[0].init.headers['Client-Version']).to.equal('1.2.3');
    });
  });

  describe('errors -- where fetch and $.ajax disagree', () => {
    it('rejects on 4xx instead of resolving, which bare fetch does not', async () => {
      nextResponse = fakeResponse(500, '{"message":"boom"}');
      let err = null;
      await request.requestJson({ url: '/x', dataType: 'json' }).catch((e) => {
        err = e;
      });
      expect(err).to.be.an('error');
      expect(err.status).to.equal(500);
    });

    it('carries responseJSON, which is the field the call sites read', async () => {
      nextResponse = fakeResponse(400, '{"message":"nope","error":"bad"}');
      let err = null;
      await request.requestJson({ url: '/x', dataType: 'json' }).catch((e) => {
        err = e;
      });
      expect(err.responseJSON).to.deep.equal({ message: 'nope', error: 'bad' });
      expect(err.responseText).to.equal('{"message":"nope","error":"bad"}');
      expect(err.statusText).to.equal('STATUS 400');
    });

    it("preserves the registration flow's 401, distinguishable by status", async () => {
      nextResponse = fakeResponse(401, '{"message":"username taken"}');
      let err = null;
      await request.requestJson({ url: '/x', type: 'POST', dataType: 'json' }).catch((e) => {
        err = e;
      });
      expect(err.status).to.equal(401);
      expect(err.responseJSON.message).to.equal('username taken');
    });

    it('leaves responseJSON unset when the error body is not JSON', async () => {
      nextResponse = fakeResponse(502, '<html>bad gateway</html>');
      let err = null;
      await request.requestJson({ url: '/x', dataType: 'json' }).catch((e) => {
        err = e;
      });
      expect(err.responseJSON).to.equal(undefined);
      expect(err.responseText).to.equal('<html>bad gateway</html>');
    });

    it('rejects on a network failure', async () => {
      nextResponse = new TypeError('Failed to fetch');
      let err = null;
      await request.requestJson({ url: '/x', dataType: 'json' }).catch((e) => {
        err = e;
      });
      expect(err).to.be.an('error');
    });
  });

  describe('the statuses jQuery treated specially', () => {
    it('treats 304 as success, though fetch reports ok === false', async () => {
      nextResponse = fakeResponse(304, '');
      const result = await request.requestJsonWithStatus({
        url: '/x',
        type: 'PUT',
        dataType: 'json',
      });
      expect(result.status).to.equal(304);
      expect(result.data).to.equal(undefined);
    });

    it('resolves 204 with no data and never parses it', async () => {
      nextResponse = fakeResponse(204, '');
      const data = await request.requestJson({ url: '/x', type: 'DELETE', dataType: 'json' });
      expect(data).to.equal(undefined);
    });

    it('fails an empty 200 body, as jQuery 2.1.4 parsererror did', async () => {
      nextResponse = fakeResponse(200, '');
      let err = null;
      await request.requestJson({ url: '/x', dataType: 'json' }).catch((e) => {
        err = e;
      });
      expect(err).to.be.an('error');
      expect(err.statusText).to.equal('parsererror');
      expect(err.status).to.equal(200);
    });

    it('exposes the status to call sites that branch on it', async () => {
      nextResponse = fakeResponse(200, '{"challenge":{}}');
      const result = await request.requestJsonWithStatus({
        url: '/x',
        type: 'PUT',
        dataType: 'json',
      });
      expect(result.status).to.equal(200);
      expect(result.data).to.deep.equal({ challenge: {} });
    });
  });
});
