import { cn } from "@/lib/utils";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LevelBadge = ({ level, size = "md", className }: LevelBadgeProps) => {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-display font-semibold rounded-full gradient-gold text-warning-foreground",
        sizeClasses[size],
        className
      )}
    >
      <span>⭐</span>
      <span>Lv.{level}</span>
    </span>
  );
};
