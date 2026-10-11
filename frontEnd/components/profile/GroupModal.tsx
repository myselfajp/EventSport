"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Loader, Check, Search as SearchIcon, Layers } from "lucide-react";
import { getClubs } from "@/app/lib/club-api";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import CascadingLocationFields, {
  normalizeCountry,
} from "@/components/location/CascadingLocationFields";
import { emptyLocationValue, type LocationValue } from "@/app/lib/location-api";
import { useMe } from "@/app/hooks/useAuth";

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clubId: string, formData: FormData) => Promise<any> | any;
  initialData?: GroupFormData | null;
  userId?: string;
  /** Admin without a coach profile must specify which coach owns the new group */
  requireOwnerCoachId?: boolean;
}

interface GroupFormData {
  _id?: string;
  club: string;
  clubName?: string;
  name: string;
  description: string;
  photo: string;
  coaches?: string[];
  mainSport?: string;
  district?: string;
  location?: LocationValue;
  country?: string;
  city?: string;
  state?: string;
  districtName?: string;
  addressLine?: string;
}

interface ClubSearchResult {
  _id: string;
  name: string;
  vision?: string;
  photo?: {
    path: string;
  };
}

interface CoachSearchResult {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  coach?: {
    _id: string;
    membershipLevel?: string;
    isVerified?: boolean;
  };
}

const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  userId,
  requireOwnerCoachId = false,
}) => {
  const { data: user } = useMe();
  const [formData, setFormData] = useState<GroupFormData>({
    club: "",
    name: "",
    description: "",
    photo: "",
    coaches: [],
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const initialFormState = useRef<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ownerCoachId, setOwnerCoachId] = useState("");
  
  // Club search states
  const [clubSearch, setClubSearch] = useState("");
  const [clubResults, setClubResults] = useState<ClubSearchResult[]>([]);
  const [isSearchingClubs, setIsSearchingClubs] = useState(false);
  const [showClubDropdown, setShowClubDropdown] = useState(false);

  // Coach search states
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

  const searchClubs = async (query: string = "") => {
    setIsSearchingClubs(true);

    try {
      const response = await fetchJSON(EP.CLUB.getClub, {
        method: "POST",
        body: {
          pageNumber: 1,
          perPage: 50,
          ...(query.trim().length > 0 ? { search: query.trim() } : {}),
        },
      });

      if (response?.success && response?.data) {
        let list = response.data;
        if (userId) {
          list = list.filter((club: any) => {
            const creatorId =
              typeof club.creator === "object"
                ? String(club.creator?._id)
                : String(club.creator || "");
            const isCreator = creatorId === String(userId);
            const isCoach =
              Array.isArray(club.coaches) &&
              club.coaches.some((c: any) => {
                const cId =
                  typeof c === "object" ? String(c?._id) : String(c || "");
                return cId === String(userId);
              });
            return isCreator || isCoach;
          });
        }
        setClubResults(list);
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
      if (showClubDropdown) {
        searchClubs(clubSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clubSearch, showClubDropdown]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCoachesDropdown) {
        searchCoaches(coachesSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [coachesSearch, showCoachesDropdown]);

  const toggleCoach = (coach: CoachSearchResult) => {
    const currentCoaches = formData.coaches || [];
    const userId = coach._id;
    if (currentCoaches.includes(userId)) {
      handleInputChange("coaches", currentCoaches.filter((id) => id !== userId) as any);
      setSelectedCoachesData((prev) => prev.filter((c) => c._id !== userId));
    } else {
      handleInputChange("coaches", [...currentCoaches, userId] as any);
      setSelectedCoachesData((prev) => [...prev, coach]);
    }
  };

  const removeCoach = (userId: string) => {
    handleInputChange(
      "coaches",
      (formData.coaches || []).filter((id) => id !== userId) as any
    );
    setSelectedCoachesData((prev) => prev.filter((c) => c._id !== userId));
  };

  const getCoachName = (id: any) => {
    const coachId = typeof id === "object" && id !== null ? String(id._id) : String(id);
    const coach = selectedCoachesData.find((c) => String(c._id) === coachId);
    if (coach) return `${coach.firstName} ${coach.lastName}`;
    if (typeof id === "object" && id !== null && (id.firstName || id.lastName)) {
      return `${id.firstName || ""} ${id.lastName || ""}`.trim();
    }
    return coachId;
  };

  const loadCoachesData = async (userIds: string[]) => {
    try {
      const promises = userIds.map((id) =>
        fetchJSON(EP.AUTH.getUserById(id), { method: "GET" })
      );
      const results = await Promise.all(promises);
      const coachesData = results
        .filter((r) => r?.success && r?.data)
        .map((r) => {
          const u = r.data;
          const coachId = u.coach?._id || "";
          return {
            _id: u._id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            coach: {
              _id: coachId,
              membershipLevel: u.coach?.membershipLevel,
              isVerified: u.coach?.isVerified,
            },
          };
        });
      setSelectedCoachesData((prev) => [...prev, ...coachesData]);
    } catch (err) {
      console.error("Error loading coaches data in GroupModal:", err);
    }
  };

  useEffect(() => {
    if (initialData) {
      const initialForm = { ...initialData };
      const rawCoaches = initialData.coaches || [];
      const coachIds: string[] = rawCoaches.map((c: any) =>
        typeof c === "object" && c !== null ? String(c._id) : String(c)
      );
      initialForm.coaches = coachIds;
      setFormData(initialForm);
      initialFormState.current = JSON.stringify(initialForm);

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

      // Set club search to show club name
      if (initialData.clubName) {
        setClubSearch(initialData.clubName);
      }

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
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    const emptyForm: GroupFormData = {
      club: "",
      name: "",
      description: "",
      photo: "",
      coaches: [],
    };
    setFormData(emptyForm);
    initialFormState.current = JSON.stringify(emptyForm);
    setPhotoPreview(null);
    setPhotoFile(null);
    setErrors({});
    setGeneralError("");
    setClubSearch("");
    setClubResults([]);
    setOwnerCoachId("");
    setMainSport("");
    setCoachesSearch("");
    setCoachesResults([]);
    setSelectedCoachesData([]);
    const userCountry = user?.location?.country ? normalizeCountry(user.location.country) : "TR";
    setLocationValue({ ...emptyLocationValue(), country: userCountry });
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
      if (!formData.name) newErrors.name = "Sport Community Name is required";
      if (
        requireOwnerCoachId &&
        !/^[a-fA-F0-9]{24}$/.test(ownerCoachId.trim())
      ) {
        newErrors.ownerCoachId =
          "Valid 24-character coach profile ID (Mongo ObjectId) is required";
      }
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

      if (mainSport) groupData.mainSport = mainSport;

      const c = normalizeCountry(locationValue.country);
      groupData.country = c;
      if (c === "TR") {
        if (locationValue.city) groupData.city = locationValue.city.trim();
        if (locationValue.districtName) groupData.districtName = locationValue.districtName.trim();
        if (locationValue.district) groupData.district = locationValue.district;
      } else {
        if (locationValue.state) groupData.state = locationValue.state.trim();
        if (locationValue.city) groupData.city = locationValue.city.trim();
      }
      if (locationValue.addressLine) {
        groupData.addressLine = locationValue.addressLine.trim();
      }
      
      if (formData.description) groupData.description = formData.description;
      if (Array.isArray(formData.coaches)) {
        groupData.coaches = formData.coaches;
      }
      if (requireOwnerCoachId && !initialData) {
        groupData.ownerCoachId = ownerCoachId.trim();
      }

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-app-modal p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Edit Sport Community" : "Add Sport Community"}
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
                Sport community saved successfully.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {!isEditing && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Club (Optional)
                        </label>
                        {formData.club && (
                          <button
                            type="button"
                            onClick={() => {
                              handleInputChange("club", "");
                              setClubSearch("");
                            }}
                            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            Make independent (no club)
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <div className="relative">
                          <input
                            type="text"
                            value={clubSearch}
                            onChange={(e) => setClubSearch(e.target.value)}
                            onFocus={() => {
                              setShowClubDropdown(true);
                              if (clubResults.length === 0) {
                                searchClubs(clubSearch);
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowClubDropdown(false), 200)}
                            placeholder="Search for club (optional)..."
                            className="w-full px-3 py-2.5 pl-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                          />
                          <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        
                        {showClubDropdown && (
                          <div 
                            onMouseDown={(e) => e.preventDefault()}
                            className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                handleInputChange("club", "");
                                setClubSearch("");
                                setShowClubDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-cyan-600 dark:text-cyan-400 font-medium"
                            >
                              None (Independent Community)
                            </button>
                            {isSearchingClubs ? (
                              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">Searching...</div>
                            ) : clubResults.length > 0 ? (
                              clubResults.map((club) => (
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
                    </div>
                  )}

                  {!isEditing && requireOwnerCoachId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Coach profile ID{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ownerCoachId}
                        onChange={(e) => {
                          setOwnerCoachId(e.target.value);
                          setErrors((prev) => ({ ...prev, ownerCoachId: "" }));
                          setGeneralError("");
                        }}
                        placeholder="24-character MongoDB ObjectId"
                        className={`w-full px-3 py-2.5 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                          errors.ownerCoachId
                            ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                            : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                        }`}
                        disabled={isLoading}
                      />
                      {errors.ownerCoachId && (
                        <p className="mt-1 text-xs text-red-500">{errors.ownerCoachId}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sport Community Name {!initialData && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter sport community name"
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                        errors.name ? "border-red-300 focus:ring-red-200 dark:border-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
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
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Enter sport community description"
                      rows={5}
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
                            coachesResults.map((coach) => (
                              <button
                                key={coach._id}
                                type="button"
                                onClick={() => toggleCoach(coach)}
                                className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 ${
                                  formData.coaches?.includes(coach._id) ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' : 'dark:text-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.coaches?.includes(coach._id)}
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
                    {formData.coaches && formData.coaches.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {formData.coaches.map((coachId) => (
                          <span
                            key={coachId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs rounded"
                          >
                            {getCoachName(coachId)}
                            <button
                              type="button"
                              onClick={() => removeCoach(coachId)}
                              className="text-cyan-700 dark:text-cyan-300 hover:text-cyan-900"
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
                    Sport Community Photo
                  </label>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full">
                      <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors cursor-pointer">
                        {photoPreview ? (
                          <div className="flex flex-col items-center space-y-3">
                            <img
                              src={photoPreview}
                              alt="Sport community preview"
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
