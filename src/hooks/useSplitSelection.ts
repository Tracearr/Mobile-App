import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused, useNavigation, useRoute } from 'expo-router';
import { CommonActions, StackActions } from 'expo-router/react-navigation';
import { forgetDetail, newToken, type DetailKind } from '@/lib/detailMemory';
import { flipCopy, splitFlip } from '@/lib/splitLayout';

export interface Selection {
  id: string;
  /** Memory token of this opened detail; see detailMemory. */
  mem: string;
}

interface SplitSelectionOptions {
  isSplit: boolean;
  detail: DetailKind;
  push: (id: string, mem: string) => void;
  /** Params of the detail route; id and mem alone unless given. */
  params?: (id: string, mem: string) => object;
}

const idAndMem = (id: string, mem: string) => ({ id, mem });

/**
 * Selection for a list that shows its detail beside it when split and pushes it
 * otherwise. Crossing the split width carries an open detail across: a pushed
 * detail becomes the selection, and a selection becomes a pushed detail. The
 * list mints a memory token per opened detail and forgets it when the detail
 * closes; a flip hands the same token to the other copy.
 */
export function useSplitSelection({
  isSplit,
  detail,
  push,
  params = idAndMem,
}: SplitSelectionOptions) {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const [selection, setSelection] = useState<Selection | null>(null);
  const pushed = useRef<Selection | null>(null);
  const wasSplit = useRef(isSplit);
  const selectionRef = useRef(selection);
  const pushRef = useRef(push);
  const paramsRef = useRef(params);
  const detailRoute = `${detail}/[id]` as const;

  useEffect(() => {
    selectionRef.current = selection;
    pushRef.current = push;
    paramsRef.current = params;
  });

  const pushDetail = useCallback((next: Selection) => {
    pushed.current = next;
    pushRef.current(next.id, next.mem);
  }, []);

  const open = useCallback(
    (id: string) => {
      if (!isSplit) return pushDetail({ id, mem: newToken() });
      if (selection?.id === id) return;
      if (selection) forgetDetail(selection.mem);
      setSelection({ id, mem: newToken() });
    },
    [isSplit, selection, pushDetail]
  );

  const clear = useCallback(() => {
    if (selection) forgetDetail(selection.mem);
    setSelection(null);
  }, [selection]);

  // Focus comes back once a detail pushed from here has been popped.
  useFocusEffect(
    useCallback(() => {
      const copy = pushed.current;
      if (!copy || flipCopy(navigation.getState()?.routes ?? [], copy.mem)) return;
      pushed.current = null;
      forgetDetail(copy.mem);
    }, [navigation])
  );

  // The list itself closing (Alerts popped) closes both copies with it.
  useEffect(
    () => () => {
      if (pushed.current) forgetDetail(pushed.current.mem);
      if (selectionRef.current) forgetDetail(selectionRef.current.mem);
    },
    []
  );

  // Both navigation actions name this stack, so a flip while another tab or
  // screen is focused changes only this stack. An unfocused list gets a RESET
  // that puts the detail right above it: a PUSH would also focus this stack's
  // tab (see shouldActionChangeFocus in expo-router's BaseRouter), and a screen
  // already pushed over the list stays on top. So an unfold looks the fold's
  // copy up by its token, not by position, and pops that route.
  useEffect(() => {
    const state = navigation.getState();
    const copy = state && flipCopy(state.routes, pushed.current?.mem ?? null);
    const flip = splitFlip({
      wasSplit: wasSplit.current,
      isSplit,
      selectedId: selection?.id ?? null,
      pushedId: pushed.current?.id ?? null,
      copy: copy ? { name: copy.name, id: (copy.params as { id?: string } | undefined)?.id } : null,
      detailRoute,
    });
    wasSplit.current = isSplit;
    if (flip.type === 'embed' && state && copy && pushed.current) {
      setSelection(pushed.current);
      pushed.current = null;
      navigation.dispatch({ ...StackActions.pop(), source: copy.key, target: state.key });
    } else if (flip.type === 'push' && state && selection) {
      setSelection(null);
      if (isFocused) {
        pushDetail(selection);
      } else {
        pushed.current = selection;
        const list = state.routes.findIndex((r) => r.key === route.key);
        const above = list === -1 ? state.routes.length : list + 1;
        navigation.dispatch({
          ...CommonActions.reset({
            ...state,
            routes: [
              ...state.routes.slice(0, above),
              { name: detailRoute, params: paramsRef.current(selection.id, selection.mem) },
              ...state.routes.slice(above),
            ],
            index: state.routes.length,
          }),
          target: state.key,
        });
      }
    }
  }, [isSplit, selection, isFocused, detailRoute, navigation, route.key, pushDetail]);

  return { selection, open, clear };
}

/**
 * For detail routes. A detail pushed into a stack the user isn't looking at
 * should already be on top when they come back. react-native-screens can hold a
 * hidden stack's update until the stack is shown, which would play the push
 * transition over the list right then.
 */
export function useNoTransitionWhileHidden() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  useLayoutEffect(() => {
    navigation.setOptions({ animation: isFocused ? undefined : 'none' });
  }, [navigation, isFocused]);
}
