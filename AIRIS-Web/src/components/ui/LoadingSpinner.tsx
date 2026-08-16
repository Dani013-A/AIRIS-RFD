import React from "react";

export function LoadingSpinner({ size = "md", color = "primary" }: { size?: "sm" | "md" | "lg"; color?: "primary" | "white" | "orange" }) {
  const sizeClasses = {
    sm: "h-5 w-5 border-2",
    md: "h-10 w-10 border-4",
    lg: "h-16 w-16 border-4",
  };

  const colorClasses = {
    primary: "border-brand-primary/20 border-t-brand-primary",
    white: "border-white/20 border-t-white",
    orange: "border-brand-orange/20 border-t-brand-orange",
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`} />
    </div>
  );
}
