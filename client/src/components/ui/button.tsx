import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-amber-500/30 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-amber-500 text-gray-950 hover:bg-amber-400 shadow-md shadow-amber-500/20",
        destructive:
          "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:text-red-200",
        outline:
          "border border-white/15 bg-white/5 text-gray-200 shadow-sm hover:bg-white/10 hover:border-white/25 hover:text-white",
        secondary:
          "bg-white/10 text-gray-200 border border-white/10 hover:bg-white/15 hover:text-white",
        ghost:
          "text-gray-300 hover:bg-white/10 hover:text-white",
        link: "text-amber-400 underline-offset-4 hover:underline hover:text-amber-300",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
