import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import { describeApiError } from './apiError.ts';

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
  const error = describeApiError('Push token registration failed', axiosFailure(400, {
    message: 'Invalid mobile token: missing deviceId. Please re-pair the device.',
  }));
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
