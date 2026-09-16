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
 * `tone` picks one of the four tinted icon tiles from globals.css. It says
 * which KPI this is, not how it is doing — a green tile is "completion", not
 * "completion is good".
 *
 * Server Component.
 */
export function KpiStrip({ items }) {
  return (
    <Box className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <Box key={item.label} className="bg-surface px-3.5 py-3">
          {item.icon && (
            <Box
              className={cn(
                "mb-2 flex size-7 items-center justify-center",
                item.tone ?? "tile-accent",
              )}
            >
              <item.icon className="size-[15px]" />
            </Box>
          )}
          <Text as="p" className="text-xl font-bold leading-none text-ink">
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
export function StatTile({ label, value, hint, icon: Icon }) {
  return (
    <Box className="border border-line bg-surface-2 px-3 py-2.5">
      <Box className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-accent-blue" />}
        <Text as="p" className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
          {label}
        </Text>
      </Box>
      <Text as="p" className="mt-1.5 text-lg font-bold leading-none text-accent-blue">
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
