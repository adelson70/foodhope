import { type RefObject, useEffect } from 'react';

function isFocusableField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function useScrollFocusedIntoView(
  scrollRootRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;

    let focused: HTMLElement | null = null;
    let frame = 0;

    function scrollFocused() {
      if (!focused || !root.contains(focused)) return;
      focused.scrollIntoView({ block: 'center', inline: 'nearest' });
    }

    function scheduleScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(scrollFocused);
      });
    }

    function onFocusIn(event: FocusEvent) {
      if (!isFocusableField(event.target)) return;
      if (!root.contains(event.target)) return;
      focused = event.target;
      scheduleScroll();
    }

    function onFocusOut(event: FocusEvent) {
      if (event.target === focused) {
        focused = null;
      }
    }

    const vv = window.visualViewport;
    vv?.addEventListener('resize', scheduleScroll);
    vv?.addEventListener('scroll', scheduleScroll);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);

    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', scheduleScroll);
      vv?.removeEventListener('scroll', scheduleScroll);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, [scrollRootRef]);
}
