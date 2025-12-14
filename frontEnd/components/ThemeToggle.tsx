"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/app/context/ThemeContext";

interface ThemeToggleProps {
  variant?: "icon" | "switch" | "dropdown";
  showLabel?: boolean;
  className?: string;
}

/**
 * Theme Toggle Component
 * 
 * Variants:
 * - icon: Simple icon button that toggles between light/dark
 * - switch: iOS-style toggle switch
 * - dropdown: Full dropdown with light/dark/system options
 */
export function ThemeToggle({
  variant = "icon",
  showLabel = false,
  className = "",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".theme-dropdown")) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 ${className}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  // Icon variant - simple toggle button
  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className={`
          relative p-2 rounded-lg
          bg-gray-100 hover:bg-gray-200 
          dark:bg-slate-800 dark:hover:bg-slate-700
          text-gray-700 dark:text-slate-300
          transition-all duration-300 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 
          dark:focus:ring-offset-slate-900
          group
          ${className}
        `}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {/* Sun icon - visible in dark mode */}
        <Sun
          className={`
            w-5 h-5 absolute inset-0 m-auto
            transition-all duration-300
            ${isDark 
              ? "opacity-100 rotate-0 scale-100" 
              : "opacity-0 -rotate-90 scale-50"
            }
          `}
        />
        {/* Moon icon - visible in light mode */}
        <Moon
          className={`
            w-5 h-5 absolute inset-0 m-auto
            transition-all duration-300
            ${isDark 
              ? "opacity-0 rotate-90 scale-50" 
              : "opacity-100 rotate-0 scale-100"
            }
          `}
        />
        <span className="sr-only">
          {isDark ? "Switch to light mode" : "Switch to dark mode"}
        </span>
      </button>
    );
  }

  // Switch variant - iOS-style toggle
  if (variant === "switch") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {isDark ? "Dark" : "Light"} Mode
          </span>
        )}
        <button
          onClick={toggleTheme}
          className={`
            relative inline-flex h-7 w-14 items-center rounded-full
            transition-colors duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2
            dark:focus:ring-offset-slate-900
            ${isDark 
              ? "bg-cyan-500" 
              : "bg-gray-300 dark:bg-slate-600"
            }
          `}
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
        >
          {/* Sliding thumb with icons */}
          <span
            className={`
              inline-flex h-5 w-5 items-center justify-center
              transform rounded-full bg-white shadow-md
              transition-all duration-300 ease-in-out
              ${isDark ? "translate-x-8" : "translate-x-1"}
            `}
          >
            {isDark ? (
              <Moon className="w-3 h-3 text-cyan-600" />
            ) : (
              <Sun className="w-3 h-3 text-amber-500" />
            )}
          </span>
          
          {/* Background icons */}
          <Sun className={`
            absolute left-1.5 w-3.5 h-3.5 text-amber-400
            transition-opacity duration-200
            ${isDark ? "opacity-50" : "opacity-0"}
          `} />
          <Moon className={`
            absolute right-1.5 w-3.5 h-3.5 text-slate-400
            transition-opacity duration-200
            ${isDark ? "opacity-0" : "opacity-50"}
          `} />
        </button>
      </div>
    );
  }

  // Dropdown variant - full options
  if (variant === "dropdown") {
    const options = [
      { value: "light" as const, label: "Light", icon: Sun },
      { value: "dark" as const, label: "Dark", icon: Moon },
      { value: "system" as const, label: "System", icon: Monitor },
    ];

    return (
      <div className={`relative theme-dropdown ${className}`}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-gray-100 hover:bg-gray-200 
            dark:bg-slate-800 dark:hover:bg-slate-700
            text-gray-700 dark:text-slate-300
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50
          `}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
        >
          {isDark ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
          {showLabel && (
            <span className="text-sm font-medium">
              {theme === "system" 
                ? "System" 
                : isDark ? "Dark" : "Light"
              }
            </span>
          )}
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div 
            className="
              absolute right-0 mt-2 w-36 py-1
              bg-white dark:bg-slate-800
              border border-gray-200 dark:border-slate-700
              rounded-lg shadow-lg
              z-50
            "
            role="listbox"
          >
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm
                    transition-colors duration-150
                    ${isSelected 
                      ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400" 
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }
                  `}
                  role="option"
                  aria-selected={isSelected}
                >
                  <Icon className="w-4 h-4" />
                  <span>{option.label}</span>
                  {isSelected && (
                    <span className="ml-auto text-cyan-500">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default ThemeToggle;

