"use client";

import React, { useState } from "react";
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

  const toggleVisibility = () => {
    setVisible((current) => !current);
  };

  return (
    <div
      className={`flex items-center rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:border-cyan-500 dark:focus-within:border-cyan-400 transition-colors ${className}`}
    >
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="flex-1 min-w-0 px-3 py-2.5 pr-1 text-sm bg-transparent text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={toggleVisibility}
        className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
      >
        {visible ? (
          <EyeOff className="h-4 w-4 shrink-0" strokeWidth={2} />
        ) : (
          <Eye className="h-4 w-4 shrink-0" strokeWidth={2} />
        )}
      </button>
    </div>
  );
}
