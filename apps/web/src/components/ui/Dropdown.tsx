import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { fieldClass } from './Form';

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  compactTrigger?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-brand-600"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DropdownMenu({
  listId,
  options,
  value,
  onChange,
  onClose,
  position,
}: {
  listId: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  position: MenuPosition;
}) {
  return createPortal(
    <div
      data-dropdown-menu
      className="fixed z-[9999] overflow-hidden rounded-2xl border border-white/80 bg-white/98 p-1.5 shadow-[0_16px_48px_rgba(26,37,96,0.18)] backdrop-blur-xl"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
    >
      <ul id={listId} role="listbox" className="max-h-full overflow-y-auto">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <li key={option.value || '__empty'} role="none">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  onClose();
                }}
                className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                  isSelected
                    ? 'bg-brand-50 text-brand-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="mt-0.5 w-4 shrink-0">
                  {isSelected ? <CheckIcon /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body,
  );
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  triggerClassName = '',
  align = 'left',
  size = 'md',
  fullWidth = false,
  compactTrigger = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 6;
    const estimatedMenuHeight = Math.min(options.length * 56 + 12, 288);
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp =
      spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

    const maxHeight = Math.min(
      288,
      openUp ? spaceAbove : spaceBelow,
    );

    const top = openUp
      ? Math.max(gap, rect.top - maxHeight - gap)
      : rect.bottom + gap;

    const viewportWidth = window.innerWidth - gap * 2;
    const width = Math.min(viewportWidth, Math.max(rect.width, 220));
    const left =
      align === 'right'
        ? Math.min(rect.right, window.innerWidth - gap) - width
        : Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap));

    setMenuPosition({ top, left, width, maxHeight });
  }, [open, align, options.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !(event.target as Element).closest('[data-dropdown-menu]')
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center justify-between gap-2 text-left ${fieldClass} ${size === 'sm' ? 'h-10 min-h-10' : ''} ${triggerClassName}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <span className="font-medium text-slate-800">
              {selected.label}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
          {!compactTrigger && selected?.description ? (
            <span className="block truncate text-xs text-slate-500">
              {selected.description}
            </span>
          ) : null}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && menuPosition ? (
        <DropdownMenu
          listId={listId}
          options={options}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
          position={menuPosition}
        />
      ) : null}
    </div>
  );
}
