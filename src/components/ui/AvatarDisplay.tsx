import { cn } from "@/lib/utils";

interface AvatarDisplayProps {
  src: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  online?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-20 h-20",
};

export const AvatarDisplay = ({
  src,
  alt = "Avatar",
  size = "md",
  className,
  online,
}: AvatarDisplayProps) => {
  return (
    <div className={cn("relative", className)}>
      <img
        src={src}
        alt={alt}
        className={cn(
          "rounded-full border-2 border-border object-cover",
          sizeClasses[size]
        )}
      />
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
            online ? "bg-success" : "bg-muted-foreground"
          )}
        />
      )}
    </div>
  );
};
