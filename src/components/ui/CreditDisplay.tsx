import { cn, formatWithCommas } from "@/lib/utils";

interface CreditDisplayProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const CreditDisplay = ({ amount, size = "md", className }: CreditDisplayProps) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-display font-semibold text-gradient-gold",
        sizeClasses[size],
        className
      )}
    >
      <span>💰</span>
      <span>{formatWithCommas(amount)}</span>
    </span>
  );
};
