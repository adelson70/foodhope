import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/cn';
import { filterSelectOptions, type SelectOption } from './select.utils';

type SelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  className?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione…',
  searchPlaceholder = 'Buscar…',
  emptyMessage = 'Nenhum resultado',
  error = false,
  disabled = false,
  clearable = true,
  fullWidth = true,
  className,
}: SelectProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [highlight, setHighlight] = useState(0);

  const selected = options.find((option) => option.value === value);
  const filtered = filterSelectOptions(options, query);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 8;
      const preferredMax = 280;
      const vv = window.visualViewport;
      const viewportHeight = vv?.height ?? window.innerHeight;
      const viewportOffsetTop = vv?.offsetTop ?? 0;
      const spaceBelow =
        viewportOffsetTop + viewportHeight - rect.bottom - gap - 16;
      const spaceAbove = rect.top - viewportOffsetTop - gap - 16;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.min(
        preferredMax,
        Math.max(140, openUp ? spaceAbove : spaceBelow),
      );

      setPosition({
        top: openUp ? rect.top - gap - maxHeight : rect.bottom + gap,
        left: rect.left,
        width: Math.max(rect.width, fullWidth ? rect.width : 280),
        maxHeight,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', updatePosition);
    vv?.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      vv?.removeEventListener('resize', updatePosition);
      vv?.removeEventListener('scroll', updatePosition);
    };
  }, [open, fullWidth]);

  useEffect(() => {
    if (!open) return;

    setQuery('');
    setHighlight(0);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function choose(next: string) {
    if (clearable && next === value) {
      onChange('');
    } else {
      onChange(next);
    }
    setOpen(false);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((atual) =>
        filtered.length === 0 ? 0 : (atual + 1) % filtered.length,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((atual) =>
        filtered.length === 0
          ? 0
          : (atual - 1 + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) choose(option.value);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (!disabled) setOpen((atual) => !atual);
        }}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'input-focus-ring flex items-center gap-2 rounded-xl border bg-operator-bg px-4 py-3 text-left transition-all duration-200',
          fullWidth ? 'w-full' : 'w-auto',
          error ? 'border-danger' : 'border-operator-border',
          disabled && 'cursor-not-allowed opacity-50',
          open && !error && 'border-primary-container',
          className,
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-body-md',
            selected ? 'text-on-surface' : 'text-outline/50',
          )}
        >
          {selected ? (
            <span className="flex min-w-0 flex-col">
              <span className="truncate">
                {selected.triggerLabel ?? selected.label}
              </span>
              {selected.description && !selected.triggerLabel ? (
                <span className="truncate text-caption text-on-surface-variant">
                  {selected.description}
                </span>
              ) : null}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={cn(
            'shrink-0 text-on-surface-variant transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              tabIndex={-1}
              onKeyDown={onMenuKeyDown}
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              className={cn(
                'fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-operator-border',
                'bg-operator-card shadow-card select-enter',
              )}
            >
              <div className="border-b border-operator-border p-2">
                <div className="flex items-center gap-2 rounded-xl border border-operator-border bg-operator-bg px-3 py-2">
                  <Search
                    size={16}
                    strokeWidth={1.75}
                    className="shrink-0 text-on-surface-variant"
                  />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline/50"
                    aria-label={searchPlaceholder}
                  />
                </div>
              </div>

              <ul className="min-h-0 flex-1 overflow-y-auto p-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-caption text-on-surface-variant">
                    {emptyMessage}
                  </li>
                ) : (
                  filtered.map((option, index) => {
                    const isSelected = option.value === value;
                    const isHighlighted = index === highlight;

                    return (
                      <li key={option.value} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                            isHighlighted && 'bg-on-surface/5',
                            isSelected && 'bg-primary-container/15',
                          )}
                          onMouseEnter={() => setHighlight(index)}
                          onClick={() => choose(option.value)}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-md text-on-surface">
                              {option.label}
                            </span>
                            {option.description ? (
                              <span className="block truncate text-caption text-on-surface-variant">
                                {option.description}
                              </span>
                            ) : null}
                          </span>
                          {isSelected ? (
                            <Check
                              size={16}
                              strokeWidth={2}
                              className="shrink-0 text-primary-container"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
