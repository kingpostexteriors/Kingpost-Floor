import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-[0.7rem] font-medium tracking-[0.12em] uppercase transition-[opacity,transform,background-color] duration-150 min-h-11 px-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-cta text-charcoal",
        ghost: "bg-transparent text-fg border border-border hover:bg-raised",
        outline: "bg-surface text-fg border border-border hover:bg-raised",
        danger: "bg-danger text-cream",
        quiet: "bg-raised text-fg hover:bg-surface",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-3",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
