import { cn } from "@/lib/utils";

const componentMap = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  p: "p",
  span: "span",
  div: "div",
};

/**
 * Base classes per element.
 *
 * Headings deliberately set no font-family — `globals.css` gives every h1–h6
 * Sora with the display tracking, so it stays in one place.
 *
 * `break-words` only: the previous `break-all` broke words at arbitrary
 * characters, which reads as broken typography rather than wrapping.
 */
const tailwindClasses = {
  h1: "font-semibold text-foreground leading-snug text-xl md:leading-snug break-words hyphens-auto",
  h2: "font-semibold text-foreground leading-snug text-lg md:leading-snug break-words hyphens-auto",
  h3: "font-semibold text-foreground leading-snug text-base md:leading-snug break-words hyphens-auto",
  h4: "font-semibold text-foreground leading-snug text-lg md:leading-snug break-words hyphens-auto",
  h5: "font-semibold text-foreground leading-snug text-md md:leading-snug break-words hyphens-auto",
  p: "text-sm text-foreground leading-relaxed break-words hyphens-auto",
  span: "text-sm text-muted-foreground break-words hyphens-auto",
  div: "font-medium text-md text-muted-foreground break-words hyphens-auto",
};

function Text({ as = "p", children, className, ...props }) {
  const Tag = componentMap[as] || "p";

  return (
    <Tag className={cn(tailwindClasses[as], className)} {...props}>
      {children}
    </Tag>
  );
}

export default Text;
