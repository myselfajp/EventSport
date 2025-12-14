"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Home,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Star,
  Award,
} from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { Facility, SportResponse } from "@/app/lib/types";

interface FacilityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: Facility | null;
}

const FacilityDetailsModal: React.FC<FacilityDetailsModalProps> = ({
  isOpen,
  onClose,
  facility,
}) => {
  const [sportName, setSportName] = useState<string>("");
  const [isLoadingSport, setIsLoadingSport] = useState(false);

  useEffect(() => {
    if (isOpen && facility?.mainSport) {
      fetchSportName(facility.mainSport);
    }
  }, [isOpen, facility?.mainSport]);

  const fetchSportName = async (sportId: string | any) => {
    setIsLoadingSport(true);
    try {
      // Handle both string ID and object with _id
      const actualSportId =
        typeof sportId === "string" ? sportId : sportId?._id || sportId;

      const response: SportResponse = await fetchJSON(EP.REFERENCE.sport, {
        method: "POST",
        body: { sport: actualSportId },
      });

      if (response?.success && response?.data && response.data.length > 0) {
        setSportName(response.data[0].name);
      } else {
        setSportName(actualSportId); // fallback to ID if not found
      }
    } catch (err) {
      console.error("Error loading sport:", err);
      const actualSportId =
        typeof sportId === "string" ? sportId : sportId?._id || sportId;
      setSportName(actualSportId); // fallback to ID
    } finally {
      setIsLoadingSport(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Facility Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 dark:bg-gray-800">
          {facility ? (
            <div className="space-y-6">
              {/* Facility Photo and Basic Info */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                  {facility.photo ? (
                    <img
                      src={
                        typeof facility.photo === "string"
                          ? facility.photo
                          : `${EP.API_ASSETS_BASE}${
                              (facility.photo as any).path
                            }`
                      }
                      alt={facility.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <Home className="w-10 h-10 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {facility.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">Sports Facility</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Added {formatDate(facility.createdAt)}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium dark:text-white">{facility.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium dark:text-white">{facility.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg md:col-span-2">
                  <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                    <p className="font-medium dark:text-white">{facility.address}</p>
                  </div>
                </div>
              </div>

              {/* Facility Details */}
              <div className="border-t dark:border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Facility Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Main Sport</p>
                      <p className="font-medium dark:text-white">
                        {isLoadingSport
                          ? "Loading..."
                          : sportName || facility.mainSport}
                      </p>
                    </div>
                  </div>
                  {facility.membershipLevel && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Membership Level
                        </p>
                        <p className="font-medium dark:text-white">
                          {facility.membershipLevel}
                        </p>
                      </div>
                    </div>
                  )}
                  {facility.point !== null && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Rating</p>
                        <p className="font-medium dark:text-white">{facility.point}/10</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                      <p className="font-medium dark:text-white">
                        {facility.private ? "Private" : "Public"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacilityDetailsModal;
