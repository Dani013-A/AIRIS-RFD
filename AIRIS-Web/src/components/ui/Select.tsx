"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options?: SelectOption[];
  children?: React.ReactNode;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      children,
      icon,
      value,
      onChange,
      disabled,
      className = "",
      containerClassName = "",
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`relative inline-flex items-center ${containerClassName}`}>
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F7E97] z-10">
            {icon}
          </span>
        )}
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`h-9 ${
            icon ? "pl-9" : "pl-3.5"
          } pr-10 bg-white border border-[#DCE6EE] text-xs font-bold text-[#1E3E6B] rounded-lg appearance-none outline-none transition-colors cursor-pointer hover:border-[#5F7E97] focus:border-[#1E3E6B] focus:ring-1 focus:ring-[#1E3E6B] disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5F7E97]">
          <ChevronDown size={14} className="stroke-[2.2]" />
        </span>
      </div>
    );
  }
);

Select.displayName = "Select";
