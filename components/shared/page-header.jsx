import Text from "@/components/ui/text";
import Box from "@/components/ui/box";

/**
 * The one page header for both portals.
 *
 * It encodes the editorial rule so no page has to remember it:
 *   eyebrow   → DM Mono, uppercase, wide tracking — the section marker
 *   title     → Sora, sentence case, large and confident
 *   emphasis  → ONE phrase in Cormorant italic, the only decorative moment
 *   summary   → DM Sans, quiet supporting line
 *
 * Type classes are spelled out rather than leaning on the .eyebrow/.editorial
 * component classes: Tailwind's utilities layer outranks the components layer,
 * so a base `text-sm` from <Text> would otherwise win the size.
 *
 * Server Component — it renders text and nothing else.
 */
export function PageHeader({ eyebrow, title, emphasis, summary }) {
  return (
    <Box as="header" className="mb-1">
      {eyebrow && (
        <Text
          as="p"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          {eyebrow}
        </Text>
      )}

      <Text
        as="h1"
        className="mt-2.5 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-ink sm:text-4xl"
      >
        {title}
        {emphasis && (
          <>
            {" "}
            <Text
              as="span"
              className="font-editorial text-3xl font-normal italic tracking-normal text-ink sm:text-4xl"
            >
              {emphasis}
            </Text>
          </>
        )}
      </Text>

      {summary && (
        <Text as="p" className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {summary}
        </Text>
      )}
    </Box>
  );
}
