import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planUploads, releaseName } from './upload-sourcemaps.mjs';

const appJson = {
  expo: {
    ios: { bundleIdentifier: 'com.tracearr.app' },
    android: { package: 'com.tracearr.mobile' },
  },
};

const updates = [
  { platform: 'ios', runtimeVersion: 'abc', group: 'g1' },
  { platform: 'android', runtimeVersion: 'def', group: 'g1' },
];

test('releaseName is the platform application id the SDK reports', () => {
  assert.equal(releaseName(appJson, 'ios'), 'com.tracearr.app');
  assert.equal(releaseName(appJson, 'android'), 'com.tracearr.mobile');
});

test('planUploads makes one upload per platform and store version on the runtime', () => {
  const builds = (platform, runtime) =>
    platform === 'ios' && runtime === 'abc'
      ? [{ appVersion: '2.4.5' }, { appVersion: '2.4.4' }, { appVersion: '2.4.5' }]
      : [{ appVersion: '2.4.3' }];
  assert.deepEqual(planUploads(updates, appJson, builds), [
    { directory: 'dist/_expo/static/js/ios', name: 'com.tracearr.app', version: '2.4.5' },
    { directory: 'dist/_expo/static/js/ios', name: 'com.tracearr.app', version: '2.4.4' },
    { directory: 'dist/_expo/static/js/android', name: 'com.tracearr.mobile', version: '2.4.3' },
  ]);
});

test('planUploads skips a platform with no finished build on the runtime', () => {
  const builds = (platform) => (platform === 'ios' ? [{ appVersion: '2.4.5' }] : []);
  assert.deepEqual(planUploads(updates, appJson, builds), [
    { directory: 'dist/_expo/static/js/ios', name: 'com.tracearr.app', version: '2.4.5' },
  ]);
});

test('planUploads asks once per platform and runtime', () => {
  const asked = [];
  const builds = (platform, runtime) => {
    asked.push(`${platform}:${runtime}`);
    return [{ appVersion: '1.0.0' }];
  };
  planUploads([...updates, updates[0]], appJson, builds);
  assert.deepEqual(asked, ['ios:abc', 'android:def']);
});
