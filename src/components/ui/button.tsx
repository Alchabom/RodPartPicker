import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,scale] duration-150 ease-(--ease-shop) outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-belly-ink",
        secondary:
          "border-hairline bg-stone-raised text-ink hover:bg-[color-mix(in_oklab,var(--stone-raised),var(--ink)_5%)] aria-expanded:bg-[color-mix(in_oklab,var(--stone-raised),var(--ink)_5%)]",
        quiet:
          "text-ink-2 hover:bg-stone-raised hover:text-ink aria-expanded:bg-stone-raised aria-expanded:text-ink",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink",
      },
      size: {
        sm: "h-8 gap-1 px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-11 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        icon: "size-9",
        "icon-sm": "size-8 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11",
      },
    },
    compoundVariants: [
      // A link has no box: size sets its type, never its height or padding.
      {
        variant: "link",
        size: ["sm", "md", "lg"],
        className:
          "h-auto px-0 has-data-[icon=inline-end]:pr-0 has-data-[icon=inline-start]:pl-0",
      },
      {
        variant: "link",
        size: "lg",
        className: "text-[15px]",
      },
      {
        variant: "primary",
        size: "sm",
        className:
          "pl-[calc(--spacing(3)+6px)] has-data-[icon=inline-start]:pl-[calc(--spacing(2)+6px)]",
      },
      {
        variant: "primary",
        size: "md",
        className:
          "pl-[calc(--spacing(3.5)+6px)] has-data-[icon=inline-start]:pl-[calc(--spacing(2.5)+6px)]",
      },
      {
        variant: "primary",
        size: "lg",
        className:
          "pl-[calc(--spacing(5)+6px)] has-data-[icon=inline-start]:pl-[calc(--spacing(3.5)+6px)]",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
