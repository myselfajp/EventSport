"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Loader, Check, Search as SearchIcon } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

interface ClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<any> | any;
  initialData?: ClubFormData | null;
}

interface ClubFormData {
  _id?: string;
  name: string;
  vision: string;
  conditions: string;
  president: string;
  coaches: string[];
  photo: string;
}

interface CoachSearchResult {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  coach: {
    _id: string;
    membershipLevel?: string;
    isVerified?: boolean;
  };
}

const ClubModal: React.FC<ClubModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
}) => {
  const [formData, setFormData] = useState<ClubFormData>({
    name: "",
    vision: "",
    conditions: "",
    president: "",
    coaches: [],
    photo: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const initialFormState = useRef<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Search states
  const [presidentSearch, setPresidentSearch] = useState("");
  const [coachesSearch, setCoachesSearch] = useState("");
  const [presidentResults, setPresidentResults] = useState<CoachSearchResult[]>([]);
  const [coachesResults, setCoachesResults] = useState<CoachSearchResult[]>([]);
  const [isSearchingPresident, setIsSearchingPresident] = useState(false);
  const [isSearchingCoaches, setIsSearchingCoaches] = useState(false);
  const [showPresidentDropdown, setShowPresidentDropdown] = useState(false);
  const [showCoachesDropdown, setShowCoachesDropdown] = useState(false);
  const [selectedCoachesData, setSelectedCoachesData] = useState<CoachSearchResult[]>([]);

  const searchCoaches = async (query: string, isForPresident: boolean) => {
    if (query.trim().length < 2) {
      if (isForPresident) {
        setPresidentResults([]);
      } else {
        setCoachesResults([]);
      }
      return;
    }

    if (isForPresident) {
      setIsSearchingPresident(true);
    } else {
      setIsSearchingCoaches(true);
    }

    try {
      const response = await fetchJSON(EP.COACH.getCoachList, {
        method: "POST",
        body: {
          search: query.trim(),
          pageNumber: 1,
          perPage: 10,
          isVerified: true,
        },
      });

      if (response?.success && response?.data) {
        if (isForPresident) {
          setPresidentResults(response.data);
        } else {
          setCoachesResults(response.data);
        }
      }
    } catch (err) {
      console.error("Error searching coaches:", err);
    } finally {
      if (isForPresident) {
        setIsSearchingPresident(false);
      } else {
        setIsSearchingCoaches(false);
      }
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showPresidentDropdown && presidentSearch) {
        searchCoaches(presidentSearch, true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [presidentSearch, showPresidentDropdown]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCoachesDropdown && coachesSearch) {
        searchCoaches(coachesSearch, false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [coachesSearch, showCoachesDropdown]);

  useEffect(() => {
    if (initialData) {
      const initialForm = { ...initialData };
      setFormData(initialForm);
      initialFormState.current = JSON.stringify(initialForm);

      if (initialData.photo) {
        setPhotoPreview(initialData.photo);
      }
      setPhotoFile(null);
      
      // Load selected coaches data if editing
      if (initialData.coaches && initialData.coaches.length > 0) {
        loadCoachesData(initialData.coaches);
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const loadCoachesData = async (coachIds: string[]) => {
    try {
      const promises = coachIds.map(id =>
        fetchJSON(EP.COACH.getCoachById(id), { method: "GET" })
      );
      const results = await Promise.all(promises);
      const coachesData = results
        .filter(r => r?.success && r?.data)
        .map(r => r.data);
      setSelectedCoachesData(coachesData);
    } catch (err) {
      console.error("Error loading coaches data:", err);
    }
  };

  const resetForm = () => {
    const emptyForm = {
      name: "",
      vision: "",
      conditions: "",
      president: "",
      coaches: [],
      photo: "",
    };
    setFormData(emptyForm);
    initialFormState.current = JSON.stringify(emptyForm);
    setPhotoPreview(null);
    setPhotoFile(null);
    setErrors({});
    setGeneralError("");
    setPresidentSearch("");
    setCoachesSearch("");
    setPresidentResults([]);
    setCoachesResults([]);
    setSelectedCoachesData([]);
  };

  const handleInputChange = (
    field: keyof ClubFormData,
    value: string | string[]
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

  const selectPresident = (coach: CoachSearchResult) => {
    handleInputChange("president", coach.coach._id);
    setPresidentSearch(`${coach.firstName} ${coach.lastName}`);
    setShowPresidentDropdown(false);
  };

  const toggleCoach = (coach: CoachSearchResult) => {
    const currentCoaches = formData.coaches || [];
    const coachId = coach.coach._id;
    
    if (currentCoaches.includes(coachId)) {
      handleInputChange("coaches", currentCoaches.filter(id => id !== coachId));
      setSelectedCoachesData(prev => prev.filter(c => c.coach._id !== coachId));
    } else {
      handleInputChange("coaches", [...currentCoaches, coachId]);
      setSelectedCoachesData(prev => [...prev, coach]);
    }
  };

  const removeCoach = (coachId: string) => {
    handleInputChange("coaches", formData.coaches.filter(id => id !== coachId));
    setSelectedCoachesData(prev => prev.filter(c => c.coach._id !== coachId));
  };

  const getCoachName = (coachId: string) => {
    const coach = selectedCoachesData.find(c => c.coach._id === coachId);
    return coach ? `${coach.firstName} ${coach.lastName}` : coachId;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!initialData) {
      if (!formData.name) newErrors.name = "Club Name is required";
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
      
      const clubData: any = {
        name: formData.name,
      };
      
      if (formData.vision) clubData.vision = formData.vision;
      if (formData.conditions) clubData.conditions = formData.conditions;
      if (formData.president) clubData.president = formData.president;
      if (formData.coaches && formData.coaches.length > 0) {
        clubData.coaches = formData.coaches;
      }

      submitData.append("data", JSON.stringify(clubData));
      
      if (photoFile) {
        submitData.append("club-photo", photoFile);
      }

      await onSubmit(submitData);

      setIsSuccess(true);
      
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        resetForm();
      }, 1500);
    } catch (err: any) {
      console.error("Error submitting club:", err);
      setGeneralError(err.message || "Failed to save club. Please try again.");
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Edit Club" : "Add Club"}
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
                Club saved successfully.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Club Name {!initialData && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter club name"
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                        errors.name ? "border-red-300 focus:ring-red-200 dark:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                      }`}
                      disabled={isLoading}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vision
                    </label>
                    <textarea
                      value={formData.vision}
                      onChange={(e) => handleInputChange("vision", e.target.value)}
                      placeholder="Enter club vision"
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Conditions
                    </label>
                    <textarea
                      value={formData.conditions}
                      onChange={(e) => handleInputChange("conditions", e.target.value)}
                      placeholder="Enter membership conditions"
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      President
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={presidentSearch}
                          onChange={(e) => setPresidentSearch(e.target.value)}
                          onFocus={() => setShowPresidentDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPresidentDropdown(false), 200)}
                          placeholder="Search for president..."
                          className="w-full px-3 py-2.5 pl-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                      
                      { showPresidentDropdown && (presidentResults.length > 0 || isSearchingPresident) && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {isSearchingPresident ? (
                            <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">Searching...</div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleInputChange("president", "");
                                  setPresidentSearch("");
                                  setShowPresidentDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-400 dark:text-gray-500"
                              >
                                None
                              </button>
                              {presidentResults.map(coach => (
                                <button
                                  key={coach._id}
                                  type="button"
                                  onClick={() => selectPresident(coach)}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors dark:text-white"
                                >
                                  <div className="font-medium">{coach.firstName} {coach.lastName}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{coach.email}</div>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Coaches
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={coachesSearch}
                          onChange={(e) => setCoachesSearch(e.target.value)}
                          onFocus={() => setShowCoachesDropdown(true)}
                          onBlur={() => setTimeout(() => setShowCoachesDropdown(false), 200)}
                          placeholder="Search for coaches..."
                          className="w-full px-3 py-2.5 pl-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                      
                      {showCoachesDropdown && (coachesResults.length > 0 || isSearchingCoaches) && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {isSearchingCoaches ? (
                            <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">Searching...</div>
                          ) : (
                            coachesResults.map(coach => (
                              <button
                                key={coach._id}
                                type="button"
                                onClick={() => toggleCoach(coach)}
                                className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 ${
                                  formData.coaches.includes(coach.coach._id) ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' : 'dark:text-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.coaches.includes(coach.coach._id)}
                                  readOnly
                                  className="w-4 h-4 text-cyan-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{coach.firstName} {coach.lastName}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{coach.email}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {formData.coaches.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {formData.coaches.map(coachId => (
                          <span
                            key={coachId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs rounded"
                          >
                            {getCoachName(coachId)}
                            <button
                              type="button"
                              onClick={() => removeCoach(coachId)}
                              className="hover:text-cyan-900 dark:hover:text-cyan-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Photo */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Club Photo
                  </label>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full">
                      <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors cursor-pointer">
                        {photoPreview ? (
                          <div className="flex flex-col items-center space-y-3">
                            <img
                              src={photoPreview}
                              alt="Club preview"
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

export default ClubModal;
