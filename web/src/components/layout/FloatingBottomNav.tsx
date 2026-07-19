import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '../../lib/cn';

export type FloatingNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: ReactNode;
};

type FloatingBottomNavProps = {
  items: readonly FloatingNavItem[];
  'aria-label': string;
};

const BAR_H = 48;
const BUBBLE = 48;
const CUTOUT_R = BUBBLE / 2 + 6;
const CORNER = 20;

function matchPath(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function barPath(w: number, h: number, cx: number) {
  const r = CUTOUT_R;
  const x = Math.min(Math.max(cx, r + CORNER + 4), w - r - CORNER - 4);

  return [
    `M 0 ${CORNER}`,
    `Q 0 0 ${CORNER} 0`,
    `L ${x - r} 0`,
    `A ${r} ${r} 0 0 0 ${x + r} 0`,
    `L ${w - CORNER} 0`,
    `Q ${w} 0 ${w} ${CORNER}`,
    `L ${w} ${h - CORNER}`,
    `Q ${w} ${h} ${w - CORNER} ${h}`,
    `L ${CORNER} ${h}`,
    `Q 0 ${h} 0 ${h - CORNER}`,
    `Z`,
  ].join(' ');
}

export function FloatingBottomNav({
  items,
  'aria-label': ariaLabel,
}: FloatingBottomNavProps) {
  const { pathname } = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => matchPath(pathname, item.to, item.end)),
  );
  const count = items.length;
  const cx = ((activeIndex + 0.5) / count) * width;
  const pathCx = Math.min(
    Math.max(cx, CUTOUT_R + CORNER + 4),
    width - CUTOUT_R - CORNER - 4,
  );
  const shellH = BAR_H + BUBBLE / 2;
  const bubbleTop = shellH - BAR_H - BUBBLE / 2;

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    const sync = () => setWidth(el.getBoundingClientRect().width);
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label={ariaLabel}
    >
      <div
        ref={shellRef}
        className="pointer-events-auto relative"
        style={{ height: shellH }}
      >
        <svg
          aria-hidden
          className="nav-float-svg absolute inset-x-0 bottom-0 w-full"
          style={{ height: BAR_H }}
          viewBox={`0 0 ${width} ${BAR_H}`}
          preserveAspectRatio="none"
        >
          <path
            d={barPath(width, BAR_H, pathCx)}
            fill="var(--color-nav-bar)"
          />
        </svg>

        <span
          aria-hidden
          className="absolute z-10 rounded-full bg-primary-container shadow-nav-bubble transition-[left] duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
          style={{
            width: BUBBLE,
            height: BUBBLE,
            left: pathCx,
            top: bubbleTop,
            transform: 'translateX(-50%)',
          }}
        />

        <ul
          className="absolute inset-x-0 bottom-0 z-20 grid"
          style={{
            height: BAR_H,
            gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          }}
        >
          {items.map(({ to, label, icon: Icon, end, badge }, index) => {
            const isItemActive = index === activeIndex;

            return (
              <li key={to} className="flex">
                <NavLink
                  to={to}
                  end={end}
                  aria-label={label}
                  className={({ isActive }) =>
                    cn(
                      'relative flex flex-1 items-center justify-center transition-colors duration-200',
                      isActive
                        ? 'text-customer-bg'
                        : 'text-customer-text-primary hover:text-customer-text-secondary',
                    )
                  }
                >
                  <span
                    className={cn(
                      'relative flex size-10 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)]',
                      isItemActive && 'invisible',
                    )}
                  >
                    <Icon size={17} strokeWidth={1.75} aria-hidden />
                    {badge}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        {items.map(({ icon: Icon, badge }, index) => {
          if (index !== activeIndex) return null;

          return (
            <span
              key="active-icon"
              aria-hidden
              className="pointer-events-none absolute z-30 flex items-center justify-center text-customer-bg transition-[left] duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
              style={{
                width: BUBBLE,
                height: BUBBLE,
                left: pathCx,
                top: bubbleTop,
                transform: 'translateX(-50%)',
              }}
            >
              <span className="relative flex size-10 items-center justify-center">
                <Icon size={17} strokeWidth={2.25} />
                {badge}
              </span>
            </span>
          );
        })}
      </div>
    </nav>
  );
}
