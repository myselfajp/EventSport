"use client";

import React from "react";
import { X, ShieldCheck, Calendar, Users, FileText } from "lucide-react";
import { EP } from "@/app/lib/endpoints";

interface ClubViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: {
    _id: string;
    name: string;
    vision?: string;
    conditions?: string;
    president?: string;
    coaches?: string[];
    photo?: {
      path: string;
    };
    isApproved: boolean;
    createdAt: string;
  } | null;
}

const ClubViewModal: React.FC<ClubViewModalProps> = ({
  isOpen,
  onClose,
  club,
}) => {
  if (!isOpen || !club) return null;

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    return `${EP.API_ASSETS_BASE}/${path}`.replace(/\\/g, "/");
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(isoString));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Club Details</h2>
            {club.isApproved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                Approved
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Club Photo */}
          {club.photo?.path && (
            <div className="flex justify-center">
              <img
                src={getImageUrl(club.photo.path)!}
                alt={club.name}
                className="h-48 w-full max-w-md object-cover rounded-lg border border-gray-200 dark:border-slate-700"
              />
            </div>
          )}

          {/* Club Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Club Name
              </label>
              <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                {club.name}
              </div>
            </div>

            {club.vision && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Vision
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                  {club.vision}
                </div>
              </div>
            )}

            {club.conditions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Conditions
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                  {club.conditions}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  President
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                  {club.president || "Not assigned"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Coaches
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                  {club.coaches && club.coaches.length > 0
                    ? `${club.coaches.length} coach(es)`
                    : "No coaches assigned"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Created Date
              </label>
              <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                {formatDate(club.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClubViewModal;
