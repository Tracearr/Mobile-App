export type UserTab = 'overview' | 'sessions' | 'requests' | 'violations';

export function userTabs(requestsConfigured: boolean): UserTab[] {
  return requestsConfigured
    ? ['overview', 'sessions', 'requests', 'violations']
    : ['overview', 'sessions', 'violations'];
}

export function parseUserTab(
  param: string | string[] | undefined,
  available: readonly UserTab[]
): UserTab {
  const value = Array.isArray(param) ? param[0] : param;
  return available.find((tab) => tab === value) ?? 'overview';
}
