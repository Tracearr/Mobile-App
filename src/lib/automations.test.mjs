import { test } from 'node:test';
import assert from 'node:assert/strict';
import pages from '../../node_modules/@tracearr/translations/src/locales/en/pages.json' with { type: 'json' };
import {
  triggerSummary,
  conditionCount,
  actionTypes,
  actionLabel,
  runSummary,
  runWho,
  runWhere,
  latestRunByAutomation,
} from './automations.ts';

// English through the installed strings, so a key web renames fails here.
function t(key, options = {}) {
  const path = key.replace(/^pages:/, '').split('.');
  const last = path.pop();
  const parent = path.reduce((node, part) => node?.[part], pages);
  const plural = options.count === 1 ? '_one' : '_other';
  const text = parent?.[last] ?? parent?.[`${last}${plural}`];
  assert.equal(typeof text, 'string', `missing key ${key}`);
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name]));
}

const trigger = (type, extra = {}) => ({ id: type, enabled: true, type, ...extra });

test('session triggers', () => {
  assert.equal(triggerSummary([trigger('session.started')], t), 'When a stream starts');
  assert.equal(
    triggerSummary([trigger('session.transcode_changed')], t),
    'When transcoding starts or stops'
  );
});

test('a pause threshold names its duration and its measure', () => {
  const held = (minutes, measure) => [
    trigger('session.held_for', { params: { minutes, measure } }),
  ];
  assert.equal(triggerSummary(held(1, 'current'), t), 'When a stream has been paused for 1 minute');
  assert.equal(
    triggerSummary(held(30, 'total'), t),
    'When a stream has been paused for 30 minutes in total'
  );
});

test('account triggers', () => {
  assert.equal(
    triggerSummary([trigger('account.inactive_for', { params: { days: 90 } })], t),
    'When an account has been inactive for 90 days'
  );
  assert.equal(
    triggerSummary([trigger('account.new_device')], t),
    'When an account plays from a new device'
  );
});

test('library triggers', () => {
  assert.equal(triggerSummary([trigger('media.added')], t), 'When media is added');
});

test('server triggers join with or', () => {
  assert.equal(
    triggerSummary([trigger('server.down'), trigger('server.up')], t),
    'When a server goes down or a server comes back up'
  );
});

test('update triggers', () => {
  assert.equal(
    triggerSummary([trigger('tracearr.update_available')], t),
    'When a Tracearr update is available'
  );
  assert.equal(
    triggerSummary([trigger('plugin.update_available')], t),
    'When a plugin update is available'
  );
});

test('newsletter triggers', () => {
  assert.equal(triggerSummary([trigger('newsletter.failed')], t), 'When a newsletter send fails');
});

test('disabled triggers are left out, and none at all says so', () => {
  const off = { ...trigger('session.stopped'), enabled: false };
  assert.equal(triggerSummary([off, trigger('session.paused')], t), 'When a stream is paused');
  assert.equal(triggerSummary([off], t), 'When nothing yet');
});

test('a trigger this build does not know prints its type', () => {
  assert.equal(triggerSummary([trigger('library.scanned')], t), 'When library.scanned');
});

test('action types are listed once and include the ones inside an if', () => {
  const automation = {
    actions: {
      actions: [
        { type: 'send', to: ['a'] },
        {
          type: 'if',
          conditions: { groups: [] },
          // oxlint-disable-next-line unicorn/no-thenable -- `then` is the if node's stored field
          then: [{ type: 'kill_stream' }, { type: 'send', to: ['b'] }],
          else: [{ type: 'trust', mode: 'reset', enabled: false }],
        },
        { type: 'message_client', message: 'hi', enabled: false },
      ],
    },
  };
  assert.deepEqual(actionTypes(automation), ['send', 'kill_stream']);
  assert.equal(actionLabel('kill_stream', t), 'Kill Stream');
  assert.equal(actionLabel('reboot', t), 'reboot');
});

test('only enabled conditions in enabled groups are counted', () => {
  const conditions = {
    groups: [
      { conditions: [{ field: 'trust_score' }, { field: 'country', enabled: false }] },
      { enabled: false, conditions: [{ field: 'platform' }] },
    ],
  };
  assert.equal(conditionCount({ conditions }), 1);
});

test('a completed run says what it did', () => {
  const run = { outcome: 'completed', kind: 'policy', ranActions: ['send', 'kill_stream'] };
  assert.equal(
    runSummary({ ...run, humanSummary: null }, t),
    'Recorded a violation · Sent a notification · Stopped the stream'
  );
  assert.equal(
    runSummary({ ...run, kind: 'notification', ranActions: [], humanSummary: null }, t),
    'No notes'
  );
});

test('a stopped or failed run shows the reason the server recorded', () => {
  const run = { kind: 'policy', ranActions: [], humanSummary: 'trust_score 80 is not below 50.' };
  assert.equal(
    runSummary({ ...run, outcome: 'stopped_by_condition' }, t),
    'trust_score 80 is not below 50.'
  );
  assert.equal(runSummary({ ...run, outcome: 'error', humanSummary: null }, t), 'No notes');
});

test('who and where follow the subject kind', () => {
  const subject = {
    kind: 'session',
    name: 'jdoe',
    personName: 'Jane',
    thumbUrl: null,
    serverName: 'Plex',
    libraryName: null,
    mediaType: null,
  };
  assert.equal(runWho(subject), 'Jane');
  assert.equal(runWho({ ...subject, personName: null }), 'jdoe');
  assert.equal(runWho({ ...subject, kind: 'server' }), null);
  assert.equal(runWhere(subject), 'Plex');
  const media = { ...subject, kind: 'media', name: 'Dune', libraryName: 'Movies' };
  assert.equal(runWho(media), 'Dune');
  assert.equal(runWhere(media), 'Movies');
});

test('the first run seen for an automation is its latest', () => {
  const runs = [
    { id: '3', automationId: 'a' },
    { id: '2', automationId: 'b' },
    { id: '1', automationId: 'a' },
  ];
  const latest = latestRunByAutomation(runs);
  assert.equal(latest.get('a').id, '3');
  assert.equal(latest.get('b').id, '2');
  assert.equal(latest.get('c'), undefined);
});
