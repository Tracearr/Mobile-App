import { useCallback } from 'react';
import { useNavigation, useNavigationContainerRef, useRouter, type Href } from 'expo-router';
import { alertsTarget, tabTreeTarget } from '@/lib/tabTree';
import { ROUTES } from '@/lib/routes';

export function useOpenInTabs() {
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();

  return useCallback(
    (href: Href) => {
      if (typeof href !== 'string') return router.push(href);
      const root = navigationRef.isReady() ? navigationRef.getRootState() : undefined;
      const target =
        href === ROUTES.ALERTS ? { ...alertsTarget(root), href } : tabTreeTarget(root, href);
      const to = target.href as Href;
      if (target.method === 'push') router.push(to);
      else router.dismissTo(to);
    },
    [router, navigationRef]
  );
}

const ALERTS_STACK = '/alerts';

/**
 * Detail hrefs that push within the stack the calling screen is in, so Back
 * returns to that screen: the Alerts copies inside Alerts, the shared tab ones
 * anywhere else. The stack is read from the screen's own navigator, whose id is
 * its layout's context key (expo-router's Navigator passes `id: contextKey`),
 * rather than from the global segments, which name the focused route and not
 * the stack a screen was rendered into.
 */
export function useStackRoutes() {
  const inAlerts = useNavigation().getId() === ALERTS_STACK;
  return inAlerts
    ? { user: ROUTES.ALERTS_USER, session: ROUTES.ALERTS_SESSION }
    : { user: ROUTES.USER, session: ROUTES.SESSION };
}

/**
 * Leaves a screen above the tabs. With history it pops. Without, it dismisses
 * to the tabs: that reuses a tab tree already on the stack, which the root
 * anchor puts under a cold deep link, and replaces the screen when there is
 * none. Decided at press time, because canGoBack() can still be false while
 * the screen first renders.
 */
export function useReturnToTabs() {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.dismissTo(ROUTES.TABS);
  }, [router]);
}
