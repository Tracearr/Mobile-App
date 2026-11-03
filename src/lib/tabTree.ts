interface NavRoute {
  name: string;
  state?: NavState;
}

export interface NavState {
  index?: number;
  routes: NavRoute[];
}

const TABS = '(tabs)';
const ALERTS = 'alerts';
const SHARED_DETAIL = /^\/(user|session|violation)\//;
const VIOLATION = /^\/violation\//;

function focusedRoute(state: NavState): NavRoute | undefined {
  return state.routes[state.index ?? state.routes.length - 1];
}

function alertsShowing(root: NavState | undefined): boolean {
  for (let level = root; level; level = focusedRoute(level)?.state) {
    if (focusedRoute(level)?.name === ALERTS) return true;
  }
  return false;
}

/**
 * How to open a path in the tab tree. From a tab it is a push. From a root
 * screen above the tabs (Alerts, Settings) a push would stack a second tab tree
 * on the root stack, so it dismisses to the existing one instead, and a shared
 * detail opens in the tab that was left, not the router's default group. A
 * violation while Alerts is showing stays inside Alerts, where its list is.
 */
export function tabTreeTarget(
  root: NavState | undefined,
  path: string
): { method: 'push' | 'dismissTo'; href: string } {
  if (VIOLATION.test(path) && alertsShowing(root))
    return { method: 'push', href: `/${ALERTS}${path}` };
  let level = root;
  while (level && !level.routes.some((route) => route.name === TABS)) {
    level = focusedRoute(level)?.state;
  }
  if (!level || focusedRoute(level)?.name === TABS) return { method: 'push', href: path };
  const tabs = level.routes.findLast((route) => route.name === TABS)?.state;
  const group = tabs && focusedRoute(tabs)?.name;
  return {
    method: 'dismissTo',
    href: group && SHARED_DETAIL.test(path) ? `/${TABS}/${group}${path}` : path,
  };
}

/**
 * How to open Alerts. A push while Alerts is already showing stacks a second
 * list in its nested stack, so it dismisses to the existing list instead, which
 * also pops a violation opened above it. Otherwise it is a push, as from a tab
 * or from Settings.
 */
export function alertsTarget(root: NavState | undefined): { method: 'push' | 'dismissTo' } {
  return { method: alertsShowing(root) ? 'dismissTo' : 'push' };
}
