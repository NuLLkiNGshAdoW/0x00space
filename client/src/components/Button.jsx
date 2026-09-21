import { cn } from "../lib/utils.js";

export default function Button({ variant = "primary", className, ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm transition-colors focus-visible:outline-offset-2 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-emerald font-semibold text-void hover:bg-emerald/90 disabled:bg-panel2 disabled:text-mute",
        variant === "secondary" &&
          "border border-line bg-panel/90 font-medium text-ink hover:border-emerald/50 hover:text-emerald disabled:text-mute",
        variant === "ghost" && "px-3 py-2 text-mute hover:bg-panel2 hover:text-ink",
        className,
      )}
    />
  );
}
