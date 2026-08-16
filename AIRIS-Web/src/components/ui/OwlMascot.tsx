import React from "react";

export function OwlMascot({ size = 70 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <img
        src="/OWL-STANDING-OPEN.svg"
        alt="AIRIS Owl Mascot"
        style={{ width: `${size}px`, height: `${size}px` }}
        className="object-contain"
      />
      <span className="text-xl font-black tracking-wider text-[#F59E73] drop-shadow-[1.5px_1.5px_0px_#1E3E6B] mt-1 uppercase select-none">
        AIRIS
      </span>
    </div>
  );
}
