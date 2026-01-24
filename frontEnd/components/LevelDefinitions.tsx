"use client";

import React from "react";
import { LEVEL_DEFINITIONS } from "@/app/lib/level-definitions";

export const LevelDefinitions: React.FC = () => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4">
    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
      Level Definitions
    </h4>
    <ul className="space-y-2 text-sm">
      {LEVEL_DEFINITIONS.map(({ level, label, description }) => (
        <li
          key={level}
          className="flex gap-2 text-gray-700 dark:text-gray-300"
        >
          <span className="font-medium text-cyan-600 dark:text-cyan-400 shrink-0">
            {level}.
          </span>
          <span>
            <span className="font-medium">{label}</span>
            {" — "}
            <span className="text-gray-600 dark:text-gray-400">
              {description}
            </span>
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default LevelDefinitions;
