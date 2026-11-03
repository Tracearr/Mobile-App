import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertsTarget, tabTreeTarget } from './tabTree.ts';

const tabs = {
  name: '(tabs)',
  state: {
    index: 2,
    routes: [{ name: '(dashboard)' }, { name: '(activity)' }, { name: '(users)' }],
  },
};
const root = (top, index) => ({
  routes: [{ name: '__root', state: { index, routes: [tabs, ...(top ? [top] : [])] } }],
});

test('from a tab it pushes, as before', () => {
  assert.deepEqual(tabTreeTarget(root(null, 0), '/user/u1'), { method: 'push', href: '/user/u1' });
  assert.deepEqual(tabTreeTarget(undefined, '/user/u1'), { method: 'push', href: '/user/u1' });
});

test('above the tabs it dismisses to them, in the tab that was left', () => {
  assert.deepEqual(tabTreeTarget(root({ name: 'alerts' }, 1), '/user/u1'), {
    method: 'dismissTo',
    href: '/(tabs)/(users)/user/u1',
  });
  assert.deepEqual(tabTreeTarget(root({ name: 'settings' }, 1), '/activity'), {
    method: 'dismissTo',
    href: '/activity',
  });
});

// R36: a violation notification while Alerts is showing opens inside Alerts.
test('a violation while alerts is showing pushes inside alerts', () => {
  const list = { name: 'alerts', state: { routes: [{ name: 'index' }] } };
  assert.deepEqual(tabTreeTarget(root(list, 1), '/violation/v1'), {
    method: 'push',
    href: '/alerts/violation/v1',
  });
  assert.deepEqual(tabTreeTarget(root(list, 1), '/user/u1'), {
    method: 'dismissTo',
    href: '/(tabs)/(users)/user/u1',
  });
  assert.deepEqual(tabTreeTarget(root({ name: 'settings' }, 1), '/violation/v1'), {
    method: 'dismissTo',
    href: '/(tabs)/(users)/violation/v1',
  });
});

test('with no tab tree yet it pushes the first one', () => {
  const alertsOnly = { routes: [{ name: '__root', state: { routes: [{ name: 'alerts' }] } }] };
  assert.deepEqual(tabTreeTarget(alertsOnly, '/user/u1'), { method: 'push', href: '/user/u1' });
});

test('alerts opens with a push unless it is already showing', () => {
  assert.deepEqual(alertsTarget(root(null, 0)), { method: 'push' });
  assert.deepEqual(alertsTarget(root({ name: 'settings' }, 1)), { method: 'push' });
  assert.deepEqual(alertsTarget(undefined), { method: 'push' });
});

test('alerts showing, at its list or with a violation open, dismisses to it', () => {
  const list = { name: 'alerts', state: { routes: [{ name: 'index' }] } };
  const violation = {
    name: 'alerts',
    state: { index: 1, routes: [{ name: 'index' }, { name: 'violation/[id]' }] },
  };
  assert.deepEqual(alertsTarget(root(list, 1)), { method: 'dismissTo' });
  assert.deepEqual(alertsTarget(root(violation, 1)), { method: 'dismissTo' });
  assert.deepEqual(alertsTarget(root({ name: 'alerts' }, 1)), { method: 'dismissTo' });
});

test('alerts under the tabs in the stack but not focused is a push', () => {
  assert.deepEqual(alertsTarget(root({ name: 'alerts' }, 0)), { method: 'push' });
});
