import { cn } from "@/lib/utils";

function Box({ as = "div", children, className, ...props }) {
  const Tag = as;

  return (
    <Tag className={cn(className)} {...props}>
      {children}
    </Tag>
  );
}

export default Box;
