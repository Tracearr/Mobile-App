// Web builds these sentences in apps/web/src/lib/automations (describe.ts, runs.ts,
// actionDefinitions.ts), which @tracearr/shared does not export. The translation keys
// are web's, so both clients read the same.
import type {
  Automation,
  AutomationRunSummary,
  RunSubject,
  TriggerNode,
  TriggerType,
} from '@tracearr/shared';

export type Translate = (key: string, options?: Record<string, unknown>) => string;

const TRIGGER_KEYS: Record<TriggerType, string> = {
  'session.started': 'sessionStarted',
  'session.first_seen': 'sessionFirstSeen',
  'session.stopped': 'sessionStopped',
  'session.transcode_changed': 'sessionTranscodeChanged',
  'session.paused': 'sessionPaused',
  'session.held_for': 'sessionHeldFor',
  'account.inactive_for': 'accountInactiveFor',
  'account.new_device': 'accountNewDevice',
  'account.trust_changed': 'accountTrustChanged',
  'media.added': 'mediaAdded',
  'media.upgraded': 'mediaUpgraded',
  'server.down': 'serverDown',
  'server.up': 'serverUp',
  'plugin.update_available': 'pluginUpdateAvailable',
  'server.update_available': 'serverUpdateAvailable',
  'tracearr.update_available': 'tracearrUpdateAvailable',
  'newsletter.sent': 'newsletterSent',
  'newsletter.failed': 'newsletterFailed',
};

const LEAF_ACTIONS = ['send', 'trust', 'kill_stream', 'message_client'];

const isEnabled = (node: { enabled?: boolean }) => node.enabled !== false;

function describeTrigger(trigger: TriggerNode, t: Translate): string {
  if (trigger.type === 'session.held_for') {
    const duration = t('pages:automations.describe.duration.minutes', {
      count: trigger.params.minutes,
    });
    return trigger.params.measure === 'total'
      ? t('pages:automations.describe.triggers.sessionHeldForTotal', { duration })
      : t('pages:automations.describe.triggers.sessionHeldFor', { duration });
  }
  if (trigger.type === 'account.inactive_for') {
    const duration = t('pages:automations.describe.duration.days', { count: trigger.params.days });
    return t('pages:automations.describe.triggers.accountInactiveFor', { duration });
  }
  // A newer server can store a trigger this build has no words for.
  const key = (TRIGGER_KEYS as Record<string, string | undefined>)[trigger.type];
  return key ? t(`pages:automations.describe.triggers.${key}`) : trigger.type;
}

/** "When a stream starts or a stream stops", the opening clause of web's sentence. */
export function triggerSummary(triggers: readonly TriggerNode[], t: Translate): string {
  const enabled = triggers.filter(isEnabled);
  if (enabled.length === 0) {
    return t('pages:automations.describe.when', { text: t('pages:automations.describe.nothing') });
  }
  return enabled
    .map((trigger, index) =>
      t(index === 0 ? 'pages:automations.describe.when' : 'pages:automations.describe.or', {
        text: describeTrigger(trigger, t),
      })
    )
    .join(' ');
}

export function conditionCount(automation: Pick<Automation, 'conditions'>): number {
  return automation.conditions.groups
    .filter(isEnabled)
    .reduce((sum, group) => sum + group.conditions.filter(isEnabled).length, 0);
}

/** Every effect the automation can have, once each, including the ones inside an `if`. */
export function actionTypes(automation: Pick<Automation, 'actions'>): string[] {
  const types = new Set<string>();
  for (const action of automation.actions.actions.filter(isEnabled)) {
    const leaves = action.type === 'if' ? [...action.then, ...action.else] : [action];
    for (const leaf of leaves.filter(isEnabled)) types.add(leaf.type);
  }
  return [...types];
}

export function actionLabel(type: string, t: Translate): string {
  return LEAF_ACTIONS.includes(type) ? t(`pages:automations.actions.${type}.label`) : type;
}

/** What a run did if it did anything, and what stopped it if it did not. */
export function runSummary(
  run: Pick<AutomationRunSummary, 'outcome' | 'kind' | 'ranActions' | 'humanSummary'>,
  t: Translate
): string {
  if (run.outcome === 'completed') {
    const parts = run.kind === 'policy' ? [t('pages:automations.activity.recordedViolation')] : [];
    for (const action of run.ranActions) {
      if (LEAF_ACTIONS.includes(action)) parts.push(t(`pages:automations.actions.${action}.ran`));
    }
    if (parts.length > 0) return parts.join(' · ');
  }
  return run.humanSummary ?? t('pages:automations.activity.noSummary');
}

export function runWho(subject: RunSubject): string | null {
  if (subject.kind === 'media') return subject.name;
  if (subject.kind === 'server' || subject.kind === 'install') return null;
  return subject.personName ?? subject.name;
}

export function runWhere(subject: RunSubject): string | null {
  if (subject.kind === 'media') return subject.libraryName ?? subject.serverName;
  return subject.serverName;
}

/** `runs` must be newest first, which is the order GET /runs returns. */
export function latestRunByAutomation<T extends Pick<AutomationRunSummary, 'automationId'>>(
  runs: readonly T[]
): Map<string, T> {
  const latest = new Map<string, T>();
  for (const run of runs) {
    if (!latest.has(run.automationId)) latest.set(run.automationId, run);
  }
  return latest;
}
