import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * The KPI stat-card from the Harbor reference: a soft tinted tile with a white
 * icon chip, a mono value, a label and a small sub-line. One component so the
 * Catalogue and My Progress KPI rows read identically.
 *
 * `tone` maps to the four Spectra hues — accent / success / warning / rust
 * (§10.1). The tint is a light wash of the hue; the icon chip is a pale white
 * square carrying the hue as its glyph colour, exactly as the reference G6
 * tiles do.
 */
const TONES = {
  accent:  { tile: "bg-accent-tint",        icon: "text-accent-blue", ring: "ring-accent-blue/15" },
  success: { tile: "bg-success/[0.10]",     icon: "text-success",     ring: "ring-success/15" },
  warning: { tile: "bg-warning/[0.10]",     icon: "text-warning",     ring: "ring-warning/15" },
  rust:    { tile: "bg-rust/[0.10]",        icon: "text-rust",        ring: "ring-rust/15" },
};

export function KpiStatCard({ icon: Icon, tone = "accent", value, label, sub }) {
  const t = TONES[tone] ?? TONES.accent;
  return (
    <Box
      className={cn(
        "rounded-xl border border-line p-4 transition-transform hover:-translate-y-0.5",
        t.tile,
      )}
    >
      <Box
        className={cn(
          "mb-3 flex size-8 items-center justify-center rounded-lg bg-white/70 ring-1",
          t.ring,
          t.icon,
        )}
      >
        {Icon ? <Icon className="size-4" /> : null}
      </Box>
      <Text as="p" className="font-mono text-2xl font-bold leading-none text-ink">
        {value}
      </Text>
      <Text as="p" className="mt-1.5 text-[11px] font-medium text-text-2">
        {label}
      </Text>
      {sub ? (
        <Text as="p" className="mt-1 text-[10px] text-text-3">
          {sub}
        </Text>
      ) : null}
    </Box>
  );
}
