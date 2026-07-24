"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password" | "off";
  required?: boolean;
  className?: string;
};

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  required,
  className = "",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [useTextSecurityMask, setUseTextSecurityMask] = useState(false);

  useEffect(() => {
    setUseTextSecurityMask(
      typeof CSS !== "undefined" && CSS.supports("-webkit-text-security", "disc")
    );
  }, []);

  const inputType = useTextSecurityMask ? "text" : visible ? "text" : "password";

  return (
    <div className="relative">
      <input
        id={id}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        style={
          useTextSecurityMask
            ? ({ WebkitTextSecurity: visible ? "none" : "disc" } as React.CSSProperties)
            : undefined
        }
        className={`w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
          bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
          placeholder:text-gray-400 dark:placeholder:text-slate-500
          focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
          transition-colors ${className}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
