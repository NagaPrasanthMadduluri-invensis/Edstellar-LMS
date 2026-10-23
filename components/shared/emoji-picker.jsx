"use client";

import { useMemo, useState } from "react";
import { Smile } from "lucide-react";

import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EMOJI_CATEGORIES, ALL_EMOJIS } from "@/lib/emoji-data";
import { cn } from "@/lib/utils";

/**
 * A keyboard-style emoji picker. A Smile button opens a popover with a search
 * box, category tabs and a scrollable grid; clicking a glyph calls
 * `onSelect(emoji)` and leaves the popover open so several can be added.
 *
 * Native Unicode only — `onSelect` hands back the character to insert into a
 * plain text field. Pair it with `insertEmoji` below to drop it at the caret.
 */
export function EmojiPicker({ onSelect, disabled = false, className }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState(EMOJI_CATEGORIES[0].id);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (q) return ALL_EMOJIS.filter(([, kw]) => kw.includes(q));
    return EMOJI_CATEGORIES.find((c) => c.id === cat)?.emojis ?? [];
  }, [q, cat]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Add emoji"
          title="Add emoji"
          className={cn("shrink-0 text-text-2 hover:text-ink", className)}
        >
          <Smile className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[320px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Box className="border-b border-line p-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji…"
            className="w-full rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent-blue"
          />
        </Box>

        {!q && (
          <Box className="flex items-center gap-0.5 border-b border-line px-1.5 py-1">
            {EMOJI_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-label={c.label}
                title={c.label}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-surface-2",
                  cat === c.id && "bg-accent-tint",
                )}
              >
                {c.tab}
              </button>
            ))}
          </Box>
        )}

        <Box className="max-h-[220px] overflow-y-auto p-1.5">
          {shown.length === 0 ? (
            <Text as="p" className="px-2 py-6 text-center text-[12px] text-text-3">
              No emoji match &ldquo;{query}&rdquo;
            </Text>
          ) : (
            <Box className="grid grid-cols-8 gap-0.5">
              {shown.map(([char, kw]) => (
                <button
                  key={char + kw}
                  type="button"
                  onClick={() => onSelect(char)}
                  aria-label={kw}
                  title={kw}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none transition-colors hover:bg-surface-2"
                >
                  {char}
                </button>
              ))}
            </Box>
          )}
        </Box>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Insert `emoji` at the caret of a controlled input/textarea and update its
 * React state. `ref` is the element ref; `setValue` is its state setter. Falls
 * back to appending when the element is not reachable. Caret is restored after
 * React re-renders.
 */
export function insertEmoji(ref, setValue, emoji) {
  const el = ref?.current;
  if (!el || typeof el.selectionStart !== "number") {
    setValue((v) => (v ?? "") + emoji);
    return;
  }
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  setValue(before + emoji + after);
  const caret = start + emoji.length;
  requestAnimationFrame(() => {
    try {
      el.focus();
      el.setSelectionRange(caret, caret);
    } catch {
      /* element may have unmounted */
    }
  });
}
