import * as Popover from "@radix-ui/react-popover";
import * as React from "react";
import { MoreVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  /** Stable key; also used as the accessible label fallback. */
  key: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Renders the row in destructive colours (delete and the like). */
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Accessible name for the trigger, e.g. "Group actions". */
  label: string;
  className?: string;
  contentClassName?: string;
}

/**
 * A "⋮" trigger that opens a short list of actions.
 *
 * Built for cards whose whole surface is already one click target: the trigger
 * stops propagation so opening the menu never fires the card's own action.
 */
export function ActionMenu({
  items,
  label,
  className,
  contentClassName,
}: ActionMenuProps) {
  const [open, setOpen] = React.useState(false);

  if (items.length === 0) return null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className,
          )}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "z-[10030] min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
            contentClassName,
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-50",
                item.destructive &&
                  "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20",
              )}
            >
              {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
