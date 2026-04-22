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

const tailwindClasses = {
  h1: "font-inter font-bold text-secondary-foreground leading-snug text-xl md:leading-snug break-words break-all whitespace-normal hyphens-auto",
  h2: "font-inter font-bold text-secondary-foreground leading-snug text-lg md:leading-snug break-words break-all whitespace-normal hyphens-auto",
  h3: "font-inter font-bold text-secondary-foreground leading-snug text-base md:leading-snug break-words break-all whitespace-normal hyphens-auto",
  h4: "font-inter font-bold text-secondary-foreground leading-snug text-lg md:leading-snug break-words break-all whitespace-normal hyphens-auto",
  h5: "font-inter font-bold text-secondary-foreground leading-snug text-md md:leading-snug break-words break-all whitespace-normal hyphens-auto",
  p: "font-inter text-sm text-secondary-foreground leading-relaxed break-words break-all whitespace-normal hyphens-auto",
  span: "text-sm text-muted-foreground break-words break-all whitespace-normal hyphens-auto",
  div: "font-inter font-bold text-md text-muted-foreground break-words break-all whitespace-normal hyphens-auto",
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
