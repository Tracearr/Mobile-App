import { useCallback, useEffect, useRef, useState, type ComponentProps, type Ref } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  forgetDetail,
  isQuietScroll,
  newToken,
  QUIET_SCROLL_MS,
  recallScroll,
  rememberScroll,
  restoreStep,
  startOffset,
  type Size,
} from '@/lib/detailMemory';

type ScrollViewHandle = ComponentProps<typeof ScrollView>['ref'] extends Ref<infer I> | undefined
  ? I
  : never;

/**
 * `pinnedOffset` is the offset at which a sticky header pins. A key with no
 * remembered offset then keeps the current scroll up to it, instead of
 * jumping to the top and unpinning the header.
 */
export function useScrollMemory(key: string, pinnedOffset?: number) {
  const node = useRef<ScrollViewHandle | null>(null);
  const restored = useRef(recallScroll(key) === 0);
  const target = useRef(recallScroll(key));
  const content = useRef<Size>({ width: 0, height: 0 });
  const viewport = useRef<Size>({ width: 0, height: 0 });
  const offset = useRef(0);
  const dragging = useRef(false);
  const momentum = useRef(false);
  const quietSave = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingScroll = useRef(0);
  const lastLayoutAt = useRef(0);
  const pinned = useRef(pinnedOffset);

  // A ScrollView that mounts starts at the top, whatever the last one reported.
  const ref = useCallback((instance: ScrollViewHandle | null) => {
    node.current = instance;
    if (instance) offset.current = 0;
  }, []);

  useEffect(() => {
    pinned.current = pinnedOffset;
  }, [pinnedOffset]);

  // Layout events mark a window in which scroll events are the platform's,
  // and drop a quiet save scheduled before them.
  const settle = useCallback(() => {
    lastLayoutAt.current = Date.now();
    clearTimeout(quietSave.current);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(quietSave.current);
      cancelAnimationFrame(pendingScroll.current);
    },
    []
  );

  // A target above 0 is applied by restore() once the layout allows it.
  useEffect(() => {
    settle();
    cancelAnimationFrame(pendingScroll.current);
    const remembered = recallScroll(key);
    target.current =
      remembered === 0 ? startOffset(key, offset.current, pinned.current) : remembered;
    restored.current = target.current === 0;
    // Issued even for a remembered target: a section of the same height sends
    // no size event, and restore() still corrects a target past the maximum.
    node.current?.scrollTo({ y: target.current, animated: false });
  }, [key, settle]);

  // Only offsets the user scrolled to are remembered. Layout clamps, and the
  // offset Android moves a mounted scroll view to when a fold resizes it, also
  // arrive as scroll events and would otherwise replace the user's place.
  const onScrollBeginDrag = useCallback(() => {
    restored.current = true;
    dragging.current = true;
    clearTimeout(quietSave.current);
  }, []);

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      dragging.current = false;
      rememberScroll(key, e.nativeEvent.contentOffset.y);
    },
    [key]
  );

  const onMomentumScrollBegin = useCallback(() => {
    momentum.current = true;
    clearTimeout(quietSave.current);
  }, []);

  // iOS also ends a programmatic scrollTo with a momentum end event.
  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (momentum.current) rememberScroll(key, e.nativeEvent.contentOffset.y);
      momentum.current = false;
    },
    [key]
  );

  const onScrollToTop = useCallback(() => rememberScroll(key, 0), [key]);

  // TalkBack scroll actions and keyboard moves scroll without drag or momentum
  // events; they are saved once the offset has been quiet for a moment.
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = e.nativeEvent.contentOffset.y;
      if (!restored.current || dragging.current || momentum.current) return;
      if (!isQuietScroll(Date.now(), lastLayoutAt.current)) return;
      clearTimeout(quietSave.current);
      quietSave.current = setTimeout(() => rememberScroll(key, offset.current), QUIET_SCROLL_MS);
    },
    [key]
  );

  // Content and viewport sizes arrive in either order, so both try the restore.
  const restore = useCallback(() => {
    if (restored.current) return;
    const step = restoreStep(target.current, content.current, viewport.current);
    if (!step) return;
    restored.current = step.done;
    if (step.done && step.y !== recallScroll(key)) rememberScroll(key, step.y);
    // Layout events come from the shadow tree before the native view takes the
    // new size, and Android runs view commands ahead of the mount items queued
    // with them, so a scrollTo issued now is clamped at the old viewport. The
    // next frame runs after that mount.
    cancelAnimationFrame(pendingScroll.current);
    pendingScroll.current = requestAnimationFrame(() => {
      node.current?.scrollTo({ y: step.y, animated: false });
    });
  }, [key]);

  // A fold or unfold resizes a scroll view that stays mounted, so the
  // remembered offset is applied again at the new width.
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      settle();
      const { width, height } = e.nativeEvent.layout;
      if (viewport.current.width > 0 && width !== viewport.current.width) {
        if (restored.current) target.current = recallScroll(key);
        restored.current = false;
      }
      viewport.current = { width, height };
      restore();
    },
    [key, restore, settle]
  );

  const onContentSizeChange = useCallback(
    (width: number, height: number) => {
      settle();
      content.current = { width, height };
      restore();
    },
    [restore, settle]
  );

  return {
    ref,
    onScroll,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
    onScrollToTop,
    onContentSizeChange,
    onLayout,
    scrollEventThrottle: 64,
  };
}

/**
 * Memory token of a pushed detail route. A list that pushed it passes its own
 * token as the `mem` param and owns that token's lifetime; a route opened from
 * anywhere else (a deep link, a link on another screen) mints one for itself
 * and forgets it when it closes.
 */
export function useRouteMem(): string {
  const { mem } = useLocalSearchParams<{ mem?: string }>();
  const [token] = useState(() => mem ?? newToken());
  const own = mem === undefined;
  useEffect(() => {
    if (own) return () => forgetDetail(token);
  }, [own, token]);
  return token;
}
