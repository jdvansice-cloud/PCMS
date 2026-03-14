import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: { icon: "h-5 w-5", text: "text-lg" },
    default: { icon: "h-7 w-7", text: "text-xl" },
    lg: { icon: "h-10 w-10", text: "text-3xl" },
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center justify-center rounded-xl bg-primary/10 p-1.5">
        <PawPrint className={cn(sizes[size].icon, "text-primary")} />
      </div>
      <span className={cn(sizes[size].text, "font-bold tracking-tight")}>
        PCMS
      </span>
    </div>
  );
}

export function LogoLight({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: { icon: "h-5 w-5", text: "text-lg" },
    default: { icon: "h-7 w-7", text: "text-xl" },
    lg: { icon: "h-10 w-10", text: "text-3xl" },
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex items-center justify-center rounded-xl bg-white/15 p-1.5">
        <PawPrint className={cn(sizes[size].icon, "text-white")} />
      </div>
      <span className={cn(sizes[size].text, "font-bold tracking-tight text-white")}>
        PCMS
      </span>
    </div>
  );
}
