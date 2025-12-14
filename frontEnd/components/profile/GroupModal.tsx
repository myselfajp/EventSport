"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Loader, Check, Search as SearchIcon, Layers } from "lucide-react";
import { getClubs } from "@/app/lib/club-api";

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clubId: string, formData: FormData) => Promise<any> | any;
  initialData?: GroupFormData | null;
  userId?: string;
}

interface GroupFormData {
  _id?: string;
  club: string;
  clubName?: string;
  name: string;
  description: string;
  photo: string;
}

interface ClubSearchResult {
  _id: string;
  name: string;
  vision?: string;
  photo?: {
    path: string;
  };
}

const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  userId,
}) => {
  const [formData, setFormData] = useState<GroupFormData>({
    club: "",
    name: "",
    description: "",
    photo: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const initialFormState = useRef<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Club search states
  const [clubSearch, setClubSearch] = useState("");
  const [clubResults, setClubResults] = useState<ClubSearchResult[]>([]);
  const [isSearchingClubs, setIsSearchingClubs] = useState(false);
  const [showClubDropdown, setShowClubDropdown] = useState(false);

  const searchClubs = async (query: string) => {
    if (query.trim().length < 2) {
      setClubResults([]);
      return;
    }

    setIsSearchingClubs(true);

    try {
      const response = await getClubs(query.trim(), 1, 10, userId);

      if (response?.success && response?.data) {
        setClubResults(response.data);
      }
    } catch (err) {
      console.error("Error searching clubs:", err);
    } finally {
      setIsSearchingClubs(false);
    }
  };

  // Debounce club search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showClubDropdown && clubSearch) {
        searchClubs(clubSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clubSearch, showClubDropdown]);

  useEffect(() => {
    if (initialData) {
      const initialForm = { ...initialData };
      setFormData(initialForm);
      initialFormState.current = JSON.stringify(initialForm);

      // Set club search to show club name
      if (initialData.clubName) {
        setClubSearch(initialData.clubName);
      }

      if (initialData.photo) {
        setPhotoPreview(initialData.photo);
      }
      setPhotoFile(null);
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    const emptyForm = {
      club: "",
      name: "",
      description: "",
      photo: "",
    };
    setFormData(emptyForm);
    initialFormState.current = JSON.stringify(emptyForm);
    setPhotoPreview(null);
    setPhotoFile(null);
    setErrors({});
    setGeneralError("");
    setClubSearch("");
    setClubResults([]);
  };

  const handleInputChange = (
    field: keyof GroupFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setGeneralError("");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPhotoPreview(result);
        handleInputChange("photo", result);
      };
      reader.readAsDataURL(file);
      setPhotoFile(file);
    }
  };

  const selectClub = (club: ClubSearchResult) => {
    handleInputChange("club", club._id);
    setClubSearch(club.name);
    setShowClubDropdown(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!initialData) {
      if (!formData.club) newErrors.club = "Club is required";
      if (!formData.name) newErrors.name = "Group Name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setErrors({});

    if (!validateForm()) {
      setGeneralError("Please fix the errors below.");
      return;
    }

    setIsLoading(true);

    try {
      const submitData = new FormData();
      
      const groupData: any = {
        name: formData.name,
      };
      
      if (formData.description) groupData.description = formData.description;

      submitData.append("data", JSON.stringify(groupData));
      
      if (photoFile) {
        submitData.append("group-photo", photoFile);
      }

      await onSubmit(formData.club, submitData);

      setIsSuccess(true);
      
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        resetForm();
      }, 1500);
    } catch (err: any) {
      console.error("Error submitting group:", err);
      setGeneralError(err.message || "Failed to save group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
    setIsLoading(false);
    setIsSuccess(false);
  };

  if (!isOpen) return null;

  const hasExistingPhoto = initialData && initialData.photo;
  const isEditing = !!initialData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Edit Group" : "Add Group"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 dark:bg-gray-800">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center text-center h-full py-12">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Success!
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Group saved successfully.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {!isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Club <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="relative">
                          <input
                            type="text"
                            value={clubSearch}
                            onChange={(e) => setClubSearch(e.target.value)}
                            onFocus={() => setShowClubDropdown(true)}
                            onBlur={() => setTimeout(() => setShowClubDropdown(false), 200)}
                            placeholder="Search for club..."
                            className={`w-full px-3 py-2.5 pl-10 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                              errors.club ? "border-red-300 focus:ring-red-200 dark:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                            }`}
                          />
                          <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        
                        {showClubDropdown && (clubResults.length > 0 || isSearchingClubs || clubSearch.length >= 2) && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {isSearchingClubs ? (
                              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">Searching...</div>
                            ) : clubResults.length > 0 ? (
                              clubResults.map(club => (
                                <button
                                  key={club._id}
                                  type="button"
                                  onClick={() => selectClub(club)}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors dark:text-white"
                                >
                                  <div className="font-medium">{club.name}</div>
                                  {club.vision && <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{club.vision}</div>}
                                </button>
                              ))
                            ) : clubSearch.length >= 2 ? (
                              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">No clubs found</div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      {errors.club && <p className="mt-1 text-xs text-red-500">{errors.club}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Group Name {!initialData && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter group name"
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                        errors.name ? "border-red-300 focus:ring-red-200 dark:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                      }`}
                      disabled={isLoading}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Enter group description"
                      rows={5}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Right Column - Photo */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Photo
                  </label>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full">
                      <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors cursor-pointer">
                        {photoPreview ? (
                          <div className="flex flex-col items-center space-y-3">
                            <img
                              src={photoPreview}
                              alt="Group preview"
                              className="h-48 w-full object-cover rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                {hasExistingPhoto ? "Change photo" : "Add photo"}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                PNG, JPG, JPEG up to 10MB
                              </p>
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/png,image/jpg,image/jpeg"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {generalError && (
          <div className="px-6 pb-4">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
              {generalError}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {!isSuccess && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupModal;
