import { cn } from "cn"

// A placeholder shape. It pulses only when the user allows motion.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("motion-safe:animate-pulse rounded-md bg-stone-raised", className)}
      {...props}
    />
  )
}

export { Skeleton }
