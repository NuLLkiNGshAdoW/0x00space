import { cn } from "../lib/utils.js";

export default function Card({ as: Component = "div", interactive = false, className, ...props }) {
  return <Component {...props} className={cn("glass overflow-hidden rounded-xl", interactive && "glass-hover", className)} />;
}
