import React from "react";

export function OwlMascot({ size = 70 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <img
        src="/airis-app-new.png"
        alt="AIRIS Logo"
        style={{ width: `${size}px`, height: `${size}px` }}
        className="object-contain rounded-2xl shadow-xs"
      />
    </div>
  );
}
