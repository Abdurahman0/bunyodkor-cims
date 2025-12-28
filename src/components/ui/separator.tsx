import * as React from "react";
import { cn } from "@/lib/utils"; // "cn" funksiyasi manzili sizda boshqacha bo'lsa to'g'irlang

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "shrink-0 bg-border", // Agar sizda ranglar o'rnatilmagan bo'lsa 'bg-gray-200 dark:bg-gray-800' deb o'zgartiring
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
