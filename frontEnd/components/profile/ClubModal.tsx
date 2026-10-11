"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Loader, Check, Search as SearchIcon } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import CascadingLocationFields, {
  normalizeCountry,
} from "@/components/location/CascadingLocationFields";
import { emptyLocationValue, type LocationValue } from "@/app/lib/location-api";
import { useMe } from "@/app/hooks/useAuth";

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
  coaches: string[];
  photo: string;
  mainSport?: string;
  district?: string;
  location?: LocationValue;
  country?: string;
  city?: string;
  state?: string;
  districtName?: string;
  addressLine?: string;
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
  const { data: user } = useMe();
  const [formData, setFormData] = useState<ClubFormData>({
    name: "",
    vision: "",
    conditions: "",
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
  const [coachesSearch, setCoachesSearch] = useState("");
  const [coachesResults, setCoachesResults] = useState<CoachSearchResult[]>([]);
  const [isSearchingCoaches, setIsSearchingCoaches] = useState(false);
  const [showCoachesDropdown, setShowCoachesDropdown] = useState(false);
  const [selectedCoachesData, setSelectedCoachesData] = useState<CoachSearchResult[]>([]);
  const [locationValue, setLocationValue] = useState<LocationValue>(
    emptyLocationValue()
  );
  const [mainSport, setMainSport] = useState("");
  const [sports, setSports] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetchJSON(EP.REFERENCE.sport.get, {
          method: "POST",
          body: { perPage: 100, pageNumber: 1 },
        });
        if (res?.success && Array.isArray(res.data)) setSports(res.data);
      } catch {
        setSports([]);
      }
    })();
  }, [isOpen]);

  const searchCoaches = async (query: string = "") => {
    setIsSearchingCoaches(true);

    try {
      const trimmed = query.trim();
      const body: any = {
        pageNumber: 1,
        perPage: 20,
      };
      if (trimmed.length > 0) {
        body.search = trimmed;
      }

      const response = await fetchJSON(EP.COACH.getCoachList, {
        method: "POST",
        body,
      });

      if (response?.success && response?.data) {
        setCoachesResults(response.data);
      }
    } catch (err) {
      console.error("Error searching coaches:", err);
    } finally {
      setIsSearchingCoaches(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCoachesDropdown) {
        searchCoaches(coachesSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [coachesSearch, showCoachesDropdown]);

  useEffect(() => {
    if (initialData) {
      const initialForm = { ...initialData };
      
      // Normalize coaches: could be string[] or populated objects[]
      const rawCoaches = initialData.coaches || [];
      const coachIds: string[] = rawCoaches.map((c: any) =>
        typeof c === "object" && c !== null ? String(c._id) : String(c)
      );
      initialForm.coaches = coachIds;
      setFormData(initialForm);
      initialFormState.current = JSON.stringify(initialForm);

      if (initialData.mainSport) {
        setMainSport(
          typeof initialData.mainSport === "object"
            ? (initialData.mainSport as any)?._id || ""
            : String(initialData.mainSport)
        );
      }

      if (initialData.location) {
        setLocationValue({
          country: initialData.location.country || "TR",
          state: initialData.location.state || "",
          stateCode: initialData.location.stateCode || "",
          city: initialData.location.city || "",
          provinceSlug: initialData.location.provinceSlug || "",
          district: initialData.location.district || "",
          districtName: initialData.location.districtName || "",
          postalCode: initialData.location.postalCode || "",
          addressLine: initialData.location.addressLine || "",
        });
      } else if (
        initialData.country ||
        initialData.city ||
        initialData.districtName ||
        initialData.district
      ) {
        setLocationValue({
          country: initialData.country || "TR",
          state: initialData.state || "",
          stateCode: "",
          city: initialData.city || "",
          provinceSlug: "",
          district: initialData.district || "",
          districtName: initialData.districtName || "",
          postalCode: "",
          addressLine: initialData.addressLine || "",
        });
      } else {
        setLocationValue(emptyLocationValue());
      }

      if (initialData.photo) {
        setPhotoPreview(initialData.photo);
      }
      setPhotoFile(null);
      
      // Pre-seed already populated coaches, and fetch any remaining IDs
      const populated = rawCoaches.filter(
        (c: any) => typeof c === "object" && c !== null && c._id && c.firstName
      );
      if (populated.length > 0) {
        setSelectedCoachesData(populated as unknown as CoachSearchResult[]);
      }
      const unpopulatedIds = coachIds.filter(
        (id) => !populated.some((p: any) => String(p._id) === id)
      );
      if (unpopulatedIds.length > 0) {
        loadCoachesData(unpopulatedIds);
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const loadCoachesData = async (userIds: string[]) => {
    try {
      const promises = userIds.map(id =>
        fetchJSON(EP.AUTH.getUserById(id), { method: "GET" })
      );
      const results = await Promise.all(promises);
      const coachesData = results
        .filter(r => r?.success && r?.data)
        .map(r => {
          const user = r.data;
          const coachId = user.coach?._id || "";
          return {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            coach: {
              _id: coachId,
              membershipLevel: user.coach?.membershipLevel,
              isVerified: user.coach?.isVerified,
            }
          };
        });
      setSelectedCoachesData(prev => [...prev, ...coachesData]);
    } catch (err) {
      console.error("Error loading coaches data:", err);
    }
  };

  const resetForm = () => {
    const emptyForm = {
      name: "",
      vision: "",
      conditions: "",
      coaches: [],
      photo: "",
    };
    setFormData(emptyForm);
    initialFormState.current = JSON.stringify(emptyForm);
    setPhotoPreview(null);
    setPhotoFile(null);
    setErrors({});
    setGeneralError("");
    setCoachesSearch("");
    setCoachesResults([]);
    setSelectedCoachesData([]);
    setMainSport("");
    const userCountry = user?.location?.country ? normalizeCountry(user.location.country) : "TR";
    setLocationValue({ ...emptyLocationValue(), country: userCountry });
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

  const toggleCoach = (coach: CoachSearchResult) => {
    const currentCoaches = formData.coaches || [];
    const userId = String(coach._id);
    
    if (currentCoaches.includes(userId)) {
      handleInputChange("coaches", currentCoaches.filter(id => id !== userId));
      setSelectedCoachesData(prev => prev.filter(c => String(c._id) !== userId));
    } else {
      handleInputChange("coaches", [...currentCoaches, userId]);
      setSelectedCoachesData(prev => [...prev, coach]);
    }
  };

  const removeCoach = (userId: string) => {
    handleInputChange("coaches", formData.coaches.filter(id => id !== userId));
    setSelectedCoachesData(prev => prev.filter(c => String(c._id) !== userId));
  };

  const getCoachName = (id: any) => {
    const coachId = typeof id === "object" && id !== null ? String(id._id) : String(id);
    const coach = selectedCoachesData.find(c => String(c._id) === coachId);
    if (coach) return `${coach.firstName} ${coach.lastName}`;
    if (typeof id === "object" && id !== null && (id.firstName || id.lastName)) {
      return `${id.firstName || ""} ${id.lastName || ""}`.trim();
    }
    return coachId;
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

      if (mainSport) clubData.mainSport = mainSport;

      const c = normalizeCountry(locationValue.country);
      clubData.country = c;
      if (c === "TR") {
        if (locationValue.city) clubData.city = locationValue.city.trim();
        if (locationValue.districtName) clubData.districtName = locationValue.districtName.trim();
        if (locationValue.district) clubData.district = locationValue.district;
      } else {
        if (locationValue.state) clubData.state = locationValue.state.trim();
        if (locationValue.city) clubData.city = locationValue.city.trim();
      }
      if (locationValue.addressLine) {
        clubData.addressLine = locationValue.addressLine.trim();
      }
      
      if (mainSport) clubData.mainSport = mainSport;
      if (formData.vision) clubData.vision = formData.vision;
      if (formData.conditions) clubData.conditions = formData.conditions;
      if (Array.isArray(formData.coaches)) {
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
      }, 1500);

    } catch (err: any) {
      console.error("Error saving club:", err);
      setGeneralError(err.message || "Failed to save club. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-app-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {initialData ? "Edit Club" : "Create New Club"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {initialData
                ? "Update your club details"
                : "Fill in the details to create a new club"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSuccess ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-cyan-500" />
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
                      Club Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter club name"
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                        errors.name
                          ? "border-red-500"
                          : "border-gray-200 dark:border-gray-600"
                      }`}
                      disabled={isLoading}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Main sport
                    </label>
                    <select
                      value={mainSport}
                      onChange={(e) => setMainSport(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      disabled={isLoading}
                    >
                      <option value="">Select sport (optional)</option>
                      {sports.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Location
                    </label>
                    <CascadingLocationFields
                      value={locationValue}
                      onChange={setLocationValue}
                      showPostalCode={false}
                      disabled={isLoading}
                      countryDisabled={Boolean(user?.location?.country)}
                      countryLockNotice="Locked to your registered country (fraud prevention)"
                    />
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                        Street / details (optional)
                      </label>
                      <input
                        type="text"
                        value={locationValue.addressLine || ""}
                        onChange={(e) =>
                          setLocationValue((prev) => ({
                            ...prev,
                            addressLine: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                        placeholder="Building, street, etc."
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors disabled:opacity-50"
                      />
                    </div>
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
                      Coaches (Optional)
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={coachesSearch}
                          onChange={(e) => setCoachesSearch(e.target.value)}
                          onFocus={() => {
                            setShowCoachesDropdown(true);
                            if (coachesResults.length === 0) {
                              searchCoaches(coachesSearch);
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowCoachesDropdown(false), 200)}
                          placeholder="Search for coaches..."
                          className="w-full px-3 py-2.5 pl-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                      
                      {showCoachesDropdown && (coachesResults.length > 0 || isSearchingCoaches) && (
                        <div 
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {isSearchingCoaches ? (
                            <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">Searching...</div>
                          ) : (
                            coachesResults.map(coach => (
                              <button
                                key={coach._id}
                                type="button"
                                onClick={() => toggleCoach(coach)}
                                className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 ${
                                  formData.coaches.includes(String(coach._id)) ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' : 'dark:text-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.coaches.includes(String(coach._id))}
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
                            key={typeof coachId === 'object' && coachId !== null ? (coachId as any)._id : coachId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs rounded"
                          >
                            {getCoachName(coachId)}
                            <button
                              type="button"
                              onClick={() => removeCoach(typeof coachId === 'object' && coachId !== null ? (coachId as any)._id : coachId)}
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
                            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              Change Photo
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                                disabled={isLoading}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer block space-y-3">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto text-gray-400">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Click to upload photo
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                PNG, JPG up to 10MB
                              </p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                              disabled={isLoading}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {generalError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  {generalError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading && <Loader className="w-4 h-4 animate-spin" />}
              {initialData ? "Update Club" : "Create Club"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubModal;
