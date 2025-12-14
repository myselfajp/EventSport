"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import FavoritesContent from "./FavoritesContent";

interface FavoritesViewProps {
  onBack: () => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ onBack }) => {
  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Back to Events"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Favorites</h2>
      </div>

      <div className="flex-1">
        <FavoritesContent />
      </div>
    </div>
  );
};

export default FavoritesView;

