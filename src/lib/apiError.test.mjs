import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import {
  classifyRefreshFailure,
  describeApiError,
  isNetworkFailure,
  isTransientReply,
} from './apiError.ts';

function axiosFailure(status, data, statusText = '') {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText,
    data,
    headers: {},
    config: {},
  });
}

test('puts the status and the server message in the error text', () => {
  const error = describeApiError(
    'Push token registration failed',
    axiosFailure(400, {
      message: 'Invalid mobile token: missing deviceId. Please re-pair the device.',
    })
  );
  assert.equal(
    error.message,
    'Push token registration failed: 400 Invalid mobile token: missing deviceId. Please re-pair the device.'
  );
  assert.ok(error.cause instanceof AxiosError);
});

test('falls back to the status text, then the axios code', () => {
  assert.equal(
    describeApiError('Push', axiosFailure(530, '<html>', 'Origin Unreachable')).message,
    'Push: 530 Origin Unreachable'
  );
  const offline = new AxiosError('Network Error', 'ERR_NETWORK');
  assert.equal(describeApiError('Push', offline).message, 'Push: no response ERR_NETWORK');
});

test('passes plain errors through untouched', () => {
  const plain = new Error('Session expired');
  assert.equal(describeApiError('Push', plain), plain);
  assert.equal(describeApiError('Push', 'boom').message, 'Push: boom');
});

test('a request that got no answer is a network failure, a server reply is not', () => {
  assert.equal(isNetworkFailure(new AxiosError('Network Error', 'ERR_NETWORK')), true);
  assert.equal(
    isNetworkFailure(new AxiosError('timeout of 30000ms exceeded', 'ECONNABORTED')),
    true
  );
  assert.equal(isNetworkFailure(axiosFailure(400, {})), false);
  assert.equal(isNetworkFailure(new AxiosError('bad option', 'ERR_BAD_OPTION_VALUE')), false);
  const expoOffline = Object.assign(new Error('Error encountered while fetching Expo token'), {
    code: 'ERR_NOTIFICATIONS_NETWORK_ERROR',
  });
  assert.equal(isNetworkFailure(expoOffline), true);
  assert.equal(isNetworkFailure(new Error('Session expired')), false);
});

function tracearr(statusCode, message, code) {
  return { statusCode, error: 'Error', message, ...(code ? { code } : {}) };
}

test('a refresh that got no answer or not a Tracearr verdict is transient', () => {
  const transient = { kind: 'transient' };
  assert.deepEqual(
    classifyRefreshFailure(new AxiosError('Network Error', 'ERR_NETWORK')),
    transient
  );
  assert.deepEqual(classifyRefreshFailure(new Error('Token refresh timed out')), transient);
  assert.deepEqual(classifyRefreshFailure(axiosFailure(401, '<html>401</html>')), transient);
  assert.deepEqual(
    classifyRefreshFailure(axiosFailure(429, tracearr(429, 'Rate limit'))),
    transient
  );
  assert.deepEqual(
    classifyRefreshFailure(axiosFailure(503, tracearr(503, 'Unavailable', 'SRV_002'))),
    transient
  );
});

test('a Tracearr 400, 401 or 403 signs out with the code when there is one', () => {
  assert.deepEqual(
    classifyRefreshFailure(
      axiosFailure(401, tracearr(401, 'Session has been revoked', 'AUTH_005'))
    ),
    { kind: 'signedOut', code: 'AUTH_005' }
  );
  assert.deepEqual(
    classifyRefreshFailure(axiosFailure(401, tracearr(401, 'Invalid or expired refresh token'))),
    { kind: 'signedOut', code: null }
  );
  assert.deepEqual(classifyRefreshFailure(axiosFailure(400, tracearr(400, 'Bad Request'))), {
    kind: 'signedOut',
    code: null,
  });
});

test('a Tracearr 426 with AUTH_008 means the app is too old', () => {
  assert.deepEqual(
    classifyRefreshFailure(axiosFailure(426, tracearr(426, 'Update the app', 'AUTH_008'))),
    { kind: 'clientTooOld' }
  );
});

test('a proxy reply, a 429 or a 5xx is a transient reply, a Tracearr verdict or no reply is not', () => {
  assert.equal(isTransientReply(new AxiosError('Network Error', 'ERR_NETWORK')), false);
  assert.equal(isTransientReply(axiosFailure(502, '<html>Bad Gateway</html>')), true);
  assert.equal(isTransientReply(axiosFailure(400, tracearr(400, 'Bad Request'))), false);
  assert.equal(isTransientReply(axiosFailure(429, tracearr(429, 'Rate limit'))), true);
  assert.equal(isTransientReply(axiosFailure(503, tracearr(503, 'Unavailable', 'SRV_002'))), true);
});
