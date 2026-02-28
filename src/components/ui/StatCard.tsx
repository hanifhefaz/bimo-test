import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export const StatCard = ({ label, value, icon, trend, className }: StatCardProps) => {
  return (
    <div
      className={cn(
        "glass rounded-xl p-4 flex items-center gap-4 transition-all duration-200 hover:scale-105",
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground">
          {icon}
        </div>
      )}
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      </div>
      {trend && (
        <div
          className={cn(
            "ml-auto text-sm font-medium",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            trend === "neutral" && "text-muted-foreground"
          )}
        >
          {trend === "up" && "↑"}
          {trend === "down" && "↓"}
          {trend === "neutral" && "−"}
        </div>
      )}
    </div>
  );
};
