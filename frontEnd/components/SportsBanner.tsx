"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

interface Sport {
  _id: string;
  name: string;
  icon?: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null;
  group: string;
  groupName: string;
}

const getImageUrl = (path: string) => {
  if (!path) return "";
  // Use API_ASSETS_BASE with the path from database
  // If path starts with /, use it directly, otherwise add /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${EP.API_ASSETS_BASE}${normalizedPath}`.replace(/\\/g, "/");
};

interface SportsBannerProps {
  selectedSportId?: string | null;
  onSportClick: (sportId: string | null) => void;
}

const SportsBanner: React.FC<SportsBannerProps> = ({
  selectedSportId,
  onSportClick,
}) => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSports = async () => {
      try {
        setIsLoading(true);
        const response = await fetchJSON(
          EP.REFERENCE.sport.get,
          {
            method: "POST",
            body: {
              perPage: 100,
              pageNumber: 1,
            },
          },
          { skipAuth: true }
        );

        if (response?.success && response?.data) {
          setSports(response.data);
        }
      } catch (error) {
        console.error("Error fetching sports:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSports();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 py-2">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <div className="animate-pulse flex gap-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 dark:bg-slate-700 rounded"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sports.length === 0) return null;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 py-2">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={() => onSportClick(null)}
            className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all duration-200 flex-shrink-0 ${
              selectedSportId === null
                ? "bg-cyan-500 dark:bg-cyan-600 scale-110"
                : "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
            title="All Sports"
          >
            <span
              className={`text-xs sm:text-sm font-semibold ${
                selectedSportId === null
                  ? "text-white"
                  : "text-gray-600 dark:text-slate-400"
              }`}
            >
              All
            </span>
          </button>
          {sports.map((sport) => (
            <button
              key={sport._id}
              onClick={() => onSportClick(sport._id)}
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 hover:scale-110 transition-transform duration-200 flex-shrink-0 rounded-lg ${
                selectedSportId === sport._id
                  ? "bg-cyan-500 dark:bg-cyan-600 scale-110 ring-2 ring-cyan-400 dark:ring-cyan-500"
                  : "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
              title={sport.name}
            >
              {sport.icon?.path ? (
                <Image
                  src={getImageUrl(sport.icon.path)}
                  alt={sport.name}
                  width={32}
                  height={32}
                  className={`object-contain w-full h-full p-1 transition-all duration-200 ${
                    selectedSportId === sport._id
                      ? "brightness-0 invert"
                      : "brightness-0 dark:brightness-0 dark:invert opacity-70"
                  }`}
                  unoptimized
                />
              ) : (
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    selectedSportId === sport._id
                      ? "text-white"
                      : "text-gray-600 dark:text-slate-400"
                  }`}
                >
                  {sport.name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SportsBanner;

