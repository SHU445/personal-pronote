import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/60",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/5 before:to-transparent",
        "before:animate-[shimmer_2s_infinite]",
        "before:-translate-x-full",
        className
      )}
      style={{
        // @ts-ignore
        "--tw-animate-shimmer": "shimmer 2s infinite",
      }}
      {...props}
    />
  )
}

export { Skeleton }
