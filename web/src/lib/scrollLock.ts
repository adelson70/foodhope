const SCROLL_ROOT_ATTR = 'data-scroll-root';

type LockedEntry = {
  el: HTMLElement;
  overflow: string;
  overscrollBehavior: string;
};

const stack: LockedEntry[][] = [];

export function markScrollRoot(el: HTMLElement | null) {
  if (!el) return;
  el.setAttribute(SCROLL_ROOT_ATTR, '');
}

function collectScrollers(): HTMLElement[] {
  const roots = Array.from(
    document.querySelectorAll<HTMLElement>(`[${SCROLL_ROOT_ATTR}]`),
  );
  return roots.length > 0 ? roots : [document.body];
}

export function lockAppScroll() {
  const entries = collectScrollers().map((el) => {
    const previous = {
      el,
      overflow: el.style.overflow,
      overscrollBehavior: el.style.overscrollBehavior,
    };
    el.style.overflow = 'hidden';
    el.style.overscrollBehavior = 'none';
    return previous;
  });

  if (!entries.some((entry) => entry.el === document.body)) {
    entries.push({
      el: document.body,
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
    });
    document.body.style.overflow = 'hidden';
  }

  stack.push(entries);
}

export function unlockAppScroll() {
  const entries = stack.pop();
  if (!entries) return;
  for (const entry of entries) {
    entry.el.style.overflow = entry.overflow;
    entry.el.style.overscrollBehavior = entry.overscrollBehavior;
  }
}
