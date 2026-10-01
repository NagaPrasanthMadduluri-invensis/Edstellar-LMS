import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * The KPI strip — a row of flat, hairline-bordered tiles.
 *
 * Six across on a wide screen, wrapping down to two on a phone. The tile is a
 * plain `Box`, not a shadcn `Card`: `card.jsx` carries `py-4` and `gap-4` of
 * its own (TASTE §10.4) and these tiles are deliberately tighter than that,
 * so using one would mean cancelling its padding on every instance.
 *
 * **`tone` now says HOW THE FIGURE IS DOING, not which KPI it is.** It used
 * to be decorative — a green tile meant "completion", not "completion is
 * good" — which spent the reader's only colour budget on a label they could
 * already read. A strip of six tiles has to be scannable: the one that needs
 * somebody today should be the one the eye lands on.
 *
 * Tones come from `metricTone()` in `lib/brand.js`, so the dashboard,
 * analytics and reports cannot disagree about what green means. Pass none
 * and the tile stays accent, which is the right answer for a figure with no
 * good direction — a learner count is neither good nor bad.
 *
 * The VALUE takes the tone too, not only the icon. A red tile beside a
 * black number reads as a category; the number is what somebody is actually
 * looking at.
 *
 * Server Component.
 */
/**
 * Column count follows the ITEM count, spelled out rather than built by
 * concatenation — Tailwind cannot see a class name it did not read in the
 * source. Six was hardcoded, so dropping a tile left an empty grey cell
 * where the sixth used to be.
 */
const COLUMNS = {
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

export function KpiStrip({ items }) {
  return (
    <Box
      className={cn(
        "grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3",
        COLUMNS[items.length] ?? "xl:grid-cols-6",
      )}
    >
      {items.map((item) => (
        <Box key={item.label} className="bg-surface px-3.5 py-3">
          {item.icon && (
            <Box
              className={cn(
                "mb-2 flex size-7 items-center justify-center",
                item.tone?.tile ?? item.tone ?? "tile-accent",
              )}
            >
              <item.icon className="size-[15px]" />
            </Box>
          )}
          <Text
            as="p"
            className={cn(
              "text-xl font-bold leading-none",
              item.tone?.text ?? "text-ink",
            )}
          >
            {item.value}
          </Text>
          <Text as="p" className="mt-1 text-[10.5px] font-medium text-text-2">
            {item.label}
          </Text>
          {item.hint && (
            <Text as="p" className="mt-0.5 text-[10px] text-text-3">
              {item.hint}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

/**
 * A labelled statistic inside a panel — the Engagement Snapshot tiles.
 *
 * Distinct from `KpiStrip` because the eyebrow reads above the number here and
 * the number takes the accent. Two components rather than one with a `variant`
 * flag: they share no layout, only a purpose.
 */
export function StatTile({ label, value, hint, icon: Icon, tone }) {
  const text = tone?.text ?? "text-accent-blue";
  return (
    <Box className="border border-line bg-surface-2 px-3 py-2.5">
      <Box className="flex items-center gap-1.5">
        {/* The icon takes the same tone as the number it labels. Two
            colours on one tile would make the reader pick which to
            believe. */}
        {Icon && <Icon className={cn("size-3.5", text)} />}
        <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
          {label}
        </Text>
      </Box>
      <Text as="p" className={cn("mt-1.5 text-lg font-bold leading-none", text)}>
        {value}
      </Text>
      {hint && (
        <Text as="p" className="mt-1 text-[10.5px] text-text-3">
          {hint}
        </Text>
      )}
    </Box>
  );
}
