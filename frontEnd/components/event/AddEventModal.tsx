"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, ImageIcon, ChevronDown, Search } from "lucide-react";
import { fetchJSON, apiFetch } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { LEVEL_DEFINITIONS } from "@/app/lib/level-definitions";
import LevelDefinitions from "@/components/LevelDefinitions";

// Custom hook for debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
}

interface Club {
  _id: string;
  name: string;
}

interface Group {
  _id: string;
  name: string;
  clubName: string;
}

interface EventStyle {
  _id: string;
  name: string;
  color: string;
}

interface SportGroup {
  _id: string;
  name: string;
}

interface Sport {
  _id: string;
  name: string;
  group: string;
}

interface Facility {
  _id: string;
  name: string;
  address: string;
}

interface Salon {
  _id: string;
  name: string;
  facility: string;
}

const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    name: "",
    club: "",
    group: "",
    style: "",
    sportGroup: "",
    sport: "",
    facility: "",
    salon: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    capacity: "",
    level: "",
    type: "",
    priceType: "",
    participationFee: "",
    equipment: "",
    private: false,
    isRecurring: false,
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [eventStyles, setEventStyles] = useState<EventStyle[]>([]);
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);

  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showSportGroupDropdown, setShowSportGroupDropdown] = useState(false);
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);
  const [showSalonDropdown, setShowSalonDropdown] = useState(false);

  // Search queries for autocomplete
  const [clubSearchQuery, setClubSearchQuery] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [styleSearchQuery, setStyleSearchQuery] = useState("");

  // Refs for search inputs to maintain focus
  const clubSearchRef = useRef<HTMLInputElement>(null);
  const groupSearchRef = useRef<HTMLInputElement>(null);
  const styleSearchRef = useRef<HTMLInputElement>(null);
  const sportGroupSearchRef = useRef<HTMLInputElement>(null);
  const sportSearchRef = useRef<HTMLInputElement>(null);
  const facilitySearchRef = useRef<HTMLInputElement>(null);
  const salonSearchRef = useRef<HTMLInputElement>(null);
  const [sportGroupSearchQuery, setSportGroupSearchQuery] = useState("");
  const [sportSearchQuery, setSportSearchQuery] = useState("");
  const [facilitySearchQuery, setFacilitySearchQuery] = useState("");
  const [salonSearchQuery, setSalonSearchQuery] = useState("");

  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [loadingSportGroups, setLoadingSportGroups] = useState(false);
  const [loadingSports, setLoadingSports] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingSalons, setLoadingSalons] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isAnyLoading =
    loadingClubs ||
    loadingGroups ||
    loadingStyles ||
    loadingSportGroups ||
    loadingSports ||
    loadingFacilities ||
    loadingSalons ||
    submitting;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setShowClubDropdown(false);
        setShowGroupDropdown(false);
        setShowStyleDropdown(false);
        setShowSportGroupDropdown(false);
        setShowSportDropdown(false);
        setShowFacilityDropdown(false);
        setShowSalonDropdown(false);
        // Reset search queries when closing dropdowns
        setClubSearchQuery("");
        setGroupSearchQuery("");
        setStyleSearchQuery("");
        setSportGroupSearchQuery("");
        setSportSearchQuery("");
        setFacilitySearchQuery("");
        setSalonSearchQuery("");
      }
    };

    if (
      showClubDropdown ||
      showGroupDropdown ||
      showStyleDropdown ||
      showSportGroupDropdown ||
      showSportDropdown ||
      showFacilityDropdown ||
      showSalonDropdown
    ) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [
    showClubDropdown,
    showGroupDropdown,
    showStyleDropdown,
    showSportGroupDropdown,
    showSportDropdown,
    showFacilityDropdown,
    showSalonDropdown,
  ]);

  // Debounced search queries
  const debouncedClubSearch = useDebounce(clubSearchQuery, 300);
  const debouncedGroupSearch = useDebounce(groupSearchQuery, 300);
  const debouncedStyleSearch = useDebounce(styleSearchQuery, 300);
  const debouncedSportGroupSearch = useDebounce(sportGroupSearchQuery, 300);
  const debouncedSportSearch = useDebounce(sportSearchQuery, 300);
  const debouncedFacilitySearch = useDebounce(facilitySearchQuery, 300);
  const debouncedSalonSearch = useDebounce(salonSearchQuery, 300);

  // Maintain focus on search inputs when data changes
  useEffect(() => {
    if (showClubDropdown && clubSearchRef.current) {
      clubSearchRef.current.focus();
    }
  }, [clubs, showClubDropdown]);

  useEffect(() => {
    if (showGroupDropdown && groupSearchRef.current) {
      groupSearchRef.current.focus();
    }
  }, [groups, showGroupDropdown]);

  useEffect(() => {
    if (showStyleDropdown && styleSearchRef.current) {
      styleSearchRef.current.focus();
    }
  }, [eventStyles, showStyleDropdown]);

  useEffect(() => {
    if (showSportGroupDropdown && sportGroupSearchRef.current) {
      sportGroupSearchRef.current.focus();
    }
  }, [sportGroups, showSportGroupDropdown]);

  useEffect(() => {
    if (showSportDropdown && sportSearchRef.current) {
      sportSearchRef.current.focus();
    }
  }, [sports, showSportDropdown]);

  useEffect(() => {
    if (showFacilityDropdown && facilitySearchRef.current) {
      facilitySearchRef.current.focus();
    }
  }, [facilities, showFacilityDropdown]);

  useEffect(() => {
    if (showSalonDropdown && salonSearchRef.current) {
      salonSearchRef.current.focus();
    }
  }, [salons, showSalonDropdown]);

  // Fetch clubs with search
  useEffect(() => {
    if (showClubDropdown) {
      fetchClubs(debouncedClubSearch);
    }
  }, [showClubDropdown, debouncedClubSearch]);

  // Fetch groups with search
  useEffect(() => {
    if (formData.club && showGroupDropdown) {
      fetchGroups(formData.club, debouncedGroupSearch);
    }
  }, [formData.club, showGroupDropdown, debouncedGroupSearch]);

  // Fetch event styles with search
  useEffect(() => {
    if (showStyleDropdown) {
      fetchEventStyles(debouncedStyleSearch);
    }
  }, [showStyleDropdown, debouncedStyleSearch]);

  // Fetch sport groups with search
  useEffect(() => {
    if (showSportGroupDropdown) {
      fetchSportGroups(debouncedSportGroupSearch);
    }
  }, [showSportGroupDropdown, debouncedSportGroupSearch]);

  // Track previous sportGroup to clear sport only when it changes
  const prevSportGroupRef = useRef<string>("");

  // Fetch sports with search
  useEffect(() => {
    if (formData.sportGroup) {
      fetchSports(formData.sportGroup, debouncedSportSearch);
      // Clear sport only when sportGroup actually changes
      if (prevSportGroupRef.current !== formData.sportGroup) {
        setFormData((prev) => ({ ...prev, sport: "" }));
        prevSportGroupRef.current = formData.sportGroup;
      }
    } else {
      setSports([]);
      setFormData((prev) => ({ ...prev, sport: "" }));
      prevSportGroupRef.current = "";
    }
  }, [formData.sportGroup, debouncedSportSearch]);

  // Fetch facilities with search
  useEffect(() => {
    if (showFacilityDropdown) {
      fetchFacilities(debouncedFacilitySearch);
    }
  }, [showFacilityDropdown, debouncedFacilitySearch]);

  // Fetch salons with search
  useEffect(() => {
    if (formData.facility && showSalonDropdown) {
      fetchSalons(formData.facility, debouncedSalonSearch);
    } else if (!formData.facility) {
      setSalons([]);
      if (!showSalonDropdown) {
        setFormData((prev) => ({ ...prev, salon: "" }));
      }
    }
  }, [formData.facility, showSalonDropdown, debouncedSalonSearch]);

  useEffect(() => {
    if (initialData && isOpen) {
      const startDate = initialData.startTime ? new Date(initialData.startTime).toISOString().split('T')[0] : '';
      const startTime = initialData.startTime ? new Date(initialData.startTime).toTimeString().slice(0, 5) : '';
      const endDate = initialData.endTime ? new Date(initialData.endTime).toISOString().split('T')[0] : '';
      const endTime = initialData.endTime ? new Date(initialData.endTime).toTimeString().slice(0, 5) : '';

      setFormData({
        name: initialData.name || "",
        club: initialData.club?._id || initialData.club || "",
        group: initialData.group?._id || initialData.group || "",
        style: initialData.style?._id || initialData.style || "",
        sportGroup: initialData.sportGroup?._id || initialData.sportGroup || "",
        sport: initialData.sport?._id || initialData.sport || "",
        facility: initialData.facility?._id || initialData.facility || "",
        salon: initialData.salon?._id || initialData.salon || "",
        location: initialData.location || "",
        startDate: startDate,
        startTime: startTime,
        endDate: endDate,
        endTime: endTime,
        capacity: initialData.capacity?.toString() || "",
        level: initialData.level?.toString() || "",
        type: initialData.type || "",
        priceType: initialData.priceType || "",
        participationFee: initialData.participationFee?.toString() || "",
        equipment: initialData.equipment || "",
        private: initialData.private || false,
        isRecurring: initialData.isRecurring || false,
      });

      if (initialData.photo?.path) {
        setPhotoPreview(`${EP.API_ASSETS_BASE}/${initialData.photo.path}`.replace(/\\/g, "/"));
      }
      if (initialData.banner?.path) {
        setBannerPreview(`${EP.API_ASSETS_BASE}/${initialData.banner.path}`.replace(/\\/g, "/"));
      }
    }
  }, [initialData, isOpen]);

  const fetchClubs = async (search: string = "") => {
    setLoadingClubs(true);
    try {
      const res = await fetchJSON(EP.CLUB.getClub, {
        method: "POST",
        body: { 
          perPage: 50, 
          pageNumber: 1,
          ...(search.trim().length >= 2 && { search: search.trim() })
        },
      });
      if (res.success && res.data) {
        setClubs(res.data);
      } else {
        setClubs([]);
      }
    } catch (err) {
      console.error("Error fetching clubs:", err);
      setClubs([]);
    } finally {
      setLoadingClubs(false);
    }
  };

  const fetchGroups = async (clubId: string, search: string = "") => {
    setLoadingGroups(true);
    try {
      const res = await fetchJSON(`${EP.GROUP.getGroup}/${clubId}`, {
        method: "POST",
        body: { 
          perPage: 50, 
          pageNumber: 1,
          ...(search.trim().length >= 2 && { search: search.trim() })
        },
      });
      if (res.success && res.data) {
        setGroups(res.data);
      } else {
        setGroups([]);
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchEventStyles = async (search: string = "") => {
    setLoadingStyles(true);
    try {
      const res = await fetchJSON(EP.REFERENCE.eventStyle.get, {
        method: "POST",
        body: { 
          perPage: 50, 
          pageNumber: 1,
          ...(search.trim().length >= 2 && { search: search.trim() })
        },
      });
      if (res.success && res.data) {
        setEventStyles(res.data);
      } else {
        setEventStyles([]);
      }
    } catch (err) {
      console.error("Error fetching event styles:", err);
      setEventStyles([]);
    } finally {
      setLoadingStyles(false);
    }
  };

  const fetchSportGroups = async (search: string = "") => {
    setLoadingSportGroups(true);
    try {
      const body: any = { 
        perPage: 50, 
        pageNumber: 1,
      };
      if (search.trim().length >= 2) {
        body.search = search.trim();
      }
      const res = await fetchJSON(EP.REFERENCE.sportGroup.get, {
        method: "POST",
        body,
      });
      if (res.success && res.data) {
        setSportGroups(res.data);
      } else {
        setSportGroups([]);
      }
    } catch (err) {
      console.error("Error fetching sport groups:", err);
      setSportGroups([]);
    } finally {
      setLoadingSportGroups(false);
    }
  };

  const fetchSports = async (groupId: string, search: string = "") => {
    setLoadingSports(true);
    try {
      const res = await fetchJSON(EP.REFERENCE.sport.get, {
        method: "POST",
        body: {
          perPage: 50,
          pageNumber: 1,
          groupId,
          ...(search.trim().length >= 2 && { search: search.trim() })
        },
      });
      if (res.success && res.data) {
        setSports(res.data);
      } else {
        setSports([]);
      }
    } catch (err) {
      console.error("Error fetching sports:", err);
      setSports([]);
    } finally {
      setLoadingSports(false);
    }
  };

  const fetchFacilities = async (search: string = "") => {
    setLoadingFacilities(true);
    try {
      const res = await fetchJSON(EP.FACILITY.getFacility, {
        method: "POST",
        body: { 
          perPage: 50, 
          pageNumber: 1,
          ...(search.trim().length >= 2 && { search: search.trim() })
        },
      });
      if (res.success && res.data) {
        setFacilities(res.data);
      } else {
        setFacilities([]);
      }
    } catch (err) {
      console.error("Error fetching facilities:", err);
      setFacilities([]);
    } finally {
      setLoadingFacilities(false);
    }
  };

  const fetchSalons = async (facilityId: string, search: string = "") => {
    setLoadingSalons(true);
    try {
      const res = await fetchJSON(`${EP.SALON.getSalon}/${facilityId}`, {
        method: "POST",
        body: { 
          perPage: 50, 
          pageNumber: 1,
          ...(search.trim().length >= 2 && { search: search.trim() })
        },
      });
      if (res.success && res.data) {
        setSalons(res.data);
      } else {
        setSalons([]);
      }
    } catch (err) {
      console.error("Error fetching salons:", err);
      setSalons([]);
    } finally {
      setLoadingSalons(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");

    if (field === "priceType" && value === "Free") {
      setFormData((prev) => ({ ...prev, participationFee: "" }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
        setError("Allowed file types: png, jpg, jpeg");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
        setError("Allowed file types: png, jpg, jpeg");
        return;
      }
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setBannerPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.name ||
      !formData.style ||
      !formData.sportGroup ||
      !formData.sport ||
      !formData.startDate ||
      !formData.startTime ||
      !formData.capacity ||
      !formData.level ||
      !formData.type ||
      !formData.priceType
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (!formData.facility && !formData.salon && !formData.location) {
      setError("Exactly one of Facility, Salon, or Location must be provided");
      return;
    }

    if (formData.priceType !== "Free" && !formData.participationFee) {
      setError("Participant Fee is required when Price Type is not 'Free'");
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();

      if (photoFile) {
        formDataToSend.append("event-photo", photoFile);
      }
      if (bannerFile) {
        formDataToSend.append("event-banner", bannerFile);
      }

      const startDateTime = `${formData.startDate}T${formData.startTime}:00.000Z`;
      const endDateTime =
        formData.endDate && formData.endTime
          ? `${formData.endDate}T${formData.endTime}:00.000Z`
          : startDateTime;

      const eventData = {
        name: formData.name,
        club: formData.club,
        group: formData.group,
        style: formData.style,
        sportGroup: formData.sportGroup,
        sport: formData.sport,
        startTime: startDateTime,
        endTime: endDateTime,
        capacity: parseInt(formData.capacity),
        level: parseInt(formData.level),
        type: formData.type,
        priceType: formData.priceType,
        participationFee: formData.participationFee
          ? parseFloat(formData.participationFee)
          : 0,
        private: formData.private,
        isRecurring: formData.isRecurring,
        equipment: formData.equipment,
      };

      if (formData.facility) {
        (eventData as any).facility = formData.facility;
      }
      if (formData.salon) {
        (eventData as any).salon = formData.salon;
      }
      if (formData.location) {
        (eventData as any).location = formData.location;
      }

      formDataToSend.append("data", JSON.stringify(eventData));

      console.log(
        "Submitting event with token:",
        localStorage.getItem("se_at")
      );

      const url = isEditMode && initialData?._id 
        ? EP.COACH.editEvent(initialData._id)
        : EP.COACH.createEvent;

      const response = await apiFetch(url, {
        method: isEditMode ? "POST" : "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        alert(isEditMode ? "🎉 Event updated successfully!" : "🎉 Event created successfully!");
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.message || (isEditMode ? "There was a problem updating the event" : "There was a problem creating the event"));
      }
    } catch (err: any) {
      setError("There was a problem creating the event");
      console.error("Error creating event:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError("");
    setFormData({
      name: "",
      club: "",
      group: "",
      style: "",
      sportGroup: "",
      sport: "",
      facility: "",
      salon: "",
      location: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      capacity: "",
      level: "",
      type: "",
      priceType: "",
      participationFee: "",
      equipment: "",
      private: false,
      isRecurring: false,
    });
    setBannerFile(null);
    setPhotoFile(null);
    setBannerPreview(null);
    setPhotoPreview(null);
    setGroups([]);
    setSports([]);
    setSalons([]);
    // Reset search queries
    setClubSearchQuery("");
    setGroupSearchQuery("");
    setStyleSearchQuery("");
    setSportGroupSearchQuery("");
    setSportSearchQuery("");
    setFacilitySearchQuery("");
    setSalonSearchQuery("");
  };

  const getSelectedName = (id: string, list: any[], key = "name") => {
    const item = list.find((item) => item._id === id);
    return item ? item[key] : "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {isEditMode ? "Edit Event" : "Add a New Event"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <fieldset disabled={isAnyLoading}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Image <span className="text-red-500">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">
                    {photoPreview ? (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Event"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute top-2 right-2 bg-white dark:bg-gray-700 rounded-full p-1.5 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 space-y-2 p-4">
                        <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        <Upload className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Upload Image
                        </p>
                        <input
                          type="file"
                          accept="image/png,image/jpg,image/jpeg"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    png, jpg, jpeg · Suggested: 750×750 px
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Banner <span className="text-red-500">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">
                    {bannerPreview ? (
                      <div className="relative">
                        <img
                          src={bannerPreview}
                          alt="Event banner"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeBanner}
                          className="absolute top-2 right-2 bg-white dark:bg-gray-700 rounded-full p-1.5 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 space-y-2 p-4">
                        <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        <Upload className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Upload Banner
                        </p>
                        <input
                          type="file"
                          accept="image/png,image/jpg,image/jpeg"
                          onChange={handleBannerUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    png, jpg, jpeg · Suggested: 1080×1920 px
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="What's Your Event's Name"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  disabled={isAnyLoading}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Club
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClubDropdown(!showClubDropdown);
                      if (!showClubDropdown) setClubSearchQuery("");
                    }}
                    disabled={isAnyLoading}
                    className="w-full px-4 py-2.5 text-sm text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                  >
                    <span className="truncate">
                      {loadingClubs
                        ? "Loading..."
                        : getSelectedName(formData.club, clubs) ||
                          "Select club"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  </button>
                  {showClubDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            ref={clubSearchRef}
                            type="text"
                            value={clubSearchQuery}
                            onChange={(e) => setClubSearchQuery(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search clubs..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange("club", "");
                            setFormData((prev) => ({ ...prev, group: "" }));
                            setGroups([]);
                            setShowClubDropdown(false);
                            setClubSearchQuery("");
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 italic"
                        >
                          Clear selection
                        </button>
                        {clubs.length > 0 ? (
                          clubs.map((club) => (
                            <button
                              key={club._id}
                              type="button"
                              onClick={() => {
                                handleInputChange("club", club._id);
                                setFormData((prev) => ({ ...prev, group: "" }));
                                setGroups([]);
                                setShowClubDropdown(false);
                                setClubSearchQuery("");
                              }}
                              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                formData.club === club._id
                                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {club.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {loadingClubs ? "Loading..." : "No clubs found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sport Community
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.club) {
                        setShowGroupDropdown(!showGroupDropdown);
                        if (!showGroupDropdown) setGroupSearchQuery("");
                      }
                    }}
                    disabled={!formData.club || isAnyLoading}
                    className="w-full px-4 py-2.5 text-sm text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-white"
                  >
                    <span className="truncate">
                      {loadingGroups
                        ? "Loading..."
                        : getSelectedName(formData.group, groups) ||
                          "Select sport community"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  </button>
                  {showGroupDropdown && formData.club && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            ref={groupSearchRef}
                            type="text"
                            value={groupSearchQuery}
                            onChange={(e) => setGroupSearchQuery(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search groups..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange("group", "");
                            setShowGroupDropdown(false);
                            setGroupSearchQuery("");
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 italic"
                        >
                          Clear selection
                        </button>
                        {groups.length > 0 ? (
                          groups.map((group) => (
                            <button
                              key={group._id}
                              type="button"
                              onClick={() => {
                                handleInputChange("group", group._id);
                                setShowGroupDropdown(false);
                                setGroupSearchQuery("");
                              }}
                              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                formData.group === group._id
                                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {group.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {loadingGroups ? "Loading..." : "No groups found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Style <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStyleDropdown(!showStyleDropdown);
                      if (!showStyleDropdown) setStyleSearchQuery("");
                    }}
                    disabled={isAnyLoading}
                    className="w-full px-4 py-2.5 text-sm text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                  >
                    <span className="truncate">
                      {loadingStyles
                        ? "Loading..."
                        : getSelectedName(formData.style, eventStyles) ||
                          "Select style"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  </button>
                  {showStyleDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            ref={styleSearchRef}
                            type="text"
                            value={styleSearchQuery}
                            onChange={(e) => setStyleSearchQuery(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search styles..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange("style", "");
                            setShowStyleDropdown(false);
                            setStyleSearchQuery("");
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 italic"
                        >
                          Clear selection
                        </button>
                        {eventStyles.length > 0 ? (
                          eventStyles.map((style) => (
                            <button
                              key={style._id}
                              type="button"
                              onClick={() => {
                                handleInputChange("style", style._id);
                                setShowStyleDropdown(false);
                                setStyleSearchQuery("");
                              }}
                              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                formData.style === style._id
                                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {style.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {loadingStyles ? "Loading..." : "No styles found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sport Group <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowSportGroupDropdown(!showSportGroupDropdown)
                    }
                    disabled={isAnyLoading}
                    className="w-full px-4 py-2.5 text-sm text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                  >
                    <span className="truncate">
                      {loadingSportGroups
                        ? "Loading..."
                        : getSelectedName(formData.sportGroup, sportGroups) ||
                          "Select sport group"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  </button>
                  {showSportGroupDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            ref={sportGroupSearchRef}
                            type="text"
                            value={sportGroupSearchQuery}
                            onChange={(e) => setSportGroupSearchQuery(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search sport groups..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange("sportGroup", "");
                            setFormData((prev) => ({ ...prev, sport: "" }));
                            setSports([]);
                            setShowSportGroupDropdown(false);
                            setSportGroupSearchQuery("");
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 italic"
                        >
                          Clear selection
                        </button>
                        {sportGroups.length > 0 ? (
                          sportGroups.map((sg) => (
                            <button
                              key={sg._id}
                              type="button"
                              onClick={() => {
                                handleInputChange("sportGroup", sg._id);
                                setFormData((prev) => ({ ...prev, sport: "" }));
                                setSports([]);
                                setShowSportGroupDropdown(false);
                                setSportGroupSearchQuery("");
                              }}
                              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                formData.sportGroup === sg._id
                                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {sg.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {loadingSportGroups ? "Loading..." : "No sport groups found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sport <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.sportGroup) {
                        setShowSportDropdown(!showSportDropdown);
                        if (!showSportDropdown) setSportSearchQuery("");
                      }
                    }}
                    disabled={!formData.sportGroup || isAnyLoading}
                    className="w-full px-4 py-2.5 text-sm text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-white"
                  >
                    <span className="truncate">
                      {loadingSports
                        ? "Loading..."
                        : getSelectedName(formData.sport, sports) ||
                          "Select sport"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  </button>
                  {showSportDropdown && formData.sportGroup && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            ref={sportSearchRef}
                            type="text"
                            value={sportSearchQuery}
                            onChange={(e) => setSportSearchQuery(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search sports..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange("sport", "");
                            setShowSportDropdown(false);
                            setSportSearchQuery("");
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 italic"
                        >
                          Clear selection
                        </button>
                        {sports.length > 0 ? (
                          sports.map((sport) => (
                            <button
                              key={sport._id}
                              type="button"
                              onClick={() => {
                                handleInputChange("sport", sport._id);
                                setShowSportDropdown(false);
                                setSportSearchQuery("");
                              }}
                              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                formData.sport === sport._id
                                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {sport.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {loadingSports ? "Loading..." : "No sports found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-3 py-2 rounded-lg">
                Exactly one of Facility, Salon, or Location must be provided.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Facility
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFacilityDropdown(!showFacilityDropdown);
                      if (!showFacilityDropdown) setFacilitySearchQuery("");
                    }}
                    disabled={isAnyLoading}
                    className="w-full px-4 py-2.5 text-sm text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                  >
                    <span className="truncate">
                      {loadingFacilities
                        ? "Loading..."
                        : getSelectedName(formData.facility, facilities) ||
                          "Select facility"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  </button>
                  {showFacilityDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            ref={facilitySearchRef}
                            type="text"
                            value={facilitySearchQuery}
                            onChange={(e) => setFacilitySearchQuery(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search facilities..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange("facility", "");
                            setFormData((prev) => ({ ...prev, salon: "" }));
                            setSalons([]);
                            setShowFacilityDropdown(false);
                            setFacilitySearchQuery("");
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 italic"
                        >
                          Clear selection
                        </button>
                        {facilities.length > 0 ? (
                          facilities.map((facility) => (
                            <button
                              key={facility._id}
                              type="button"
                              onClick={() => {
                                handleInputChange("facility", facility._id);
                                setShowFacilityDropdown(false);
                                setFacilitySearchQuery("");
                              }}
                              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                formData.facility === facility._id
                                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              <div>
                                <div className="font-medium">{facility.name}</div>
                                {facility.address && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {facility.address}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {loadingFacilities ? "Loading..." : "No facilities found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Salon
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.facility) {
                        setShowSalonDropdown(!showSalonDropdown);
                        if (!showSalonDropdown) setSalonSearchQuery("");
                      }
                    }}
                    disabled={!formData.facility || isAnyLoading}
                    className="w-full px-4 py-2.5 text-sm text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-white"
                  >
                    <span className="truncate">
                      {loadingSalons
                        ? "Loading..."
                        : getSelectedName(formData.salon, salons) ||
                          "Select salon"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  </button>
                  {showSalonDropdown && formData.facility && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            ref={salonSearchRef}
                            type="text"
                            value={salonSearchQuery}
                            onChange={(e) => setSalonSearchQuery(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search salons..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange("salon", "");
                            setShowSalonDropdown(false);
                            setSalonSearchQuery("");
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 italic"
                        >
                          Clear selection
                        </button>
                        {salons.length > 0 ? (
                          salons.map((salon) => (
                            <button
                              key={salon._id}
                              type="button"
                              onClick={() => {
                                handleInputChange("salon", salon._id);
                                setShowSalonDropdown(false);
                                setSalonSearchQuery("");
                              }}
                              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                formData.salon === salon._id
                                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                                  : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              {salon.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {loadingSalons ? "Loading..." : "No salons found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Location
                </label>
                <textarea
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  placeholder="If there are no Facility/Salon"
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      handleInputChange("startDate", e.target.value)
                    }
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      handleInputChange("startTime", e.target.value)
                    }
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      handleInputChange("endDate", e.target.value)
                    }
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      handleInputChange("endTime", e.target.value)
                    }
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <LevelDefinitions />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      handleInputChange("capacity", e.target.value)
                    }
                    placeholder="Capacity"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => handleInputChange("level", e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors bg-white dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select Level</option>
                    {LEVEL_DEFINITIONS.map(({ level, label }) => (
                      <option key={level} value={level}>
                        {level} – {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange("type", e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors bg-white dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.priceType}
                    onChange={(e) =>
                      handleInputChange("priceType", e.target.value)
                    }
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors bg-white dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select Price Type</option>
                    <option value="Free">Free</option>
                    <option value="Manual">Manual</option>
                    <option value="Stable">Stable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Participant Fee
                  </label>
                  <input
                    type="number"
                    value={formData.participationFee}
                    onChange={(e) =>
                      handleInputChange("participationFee", e.target.value)
                    }
                    placeholder="Participant Fee"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    disabled={formData.priceType === "Free"}
                    min="0"
                    step="0.01"
                  />
                  {formData.priceType === "Free" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Disabled if Price Type is "Free".
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Equipment
                </label>
                <textarea
                  value={formData.equipment}
                  onChange={(e) =>
                    handleInputChange("equipment", e.target.value)
                  }
                  placeholder="Equipment"
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={formData.private}
                    onChange={(e) =>
                      handleInputChange("private", e.target.checked)
                    }
                    className="w-4 h-4 text-cyan-500 border-gray-300 dark:border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <label
                    htmlFor="isPrivate"
                    className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Is Private?
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      handleInputChange("isRecurring", e.target.checked)
                    }
                    className="w-4 h-4 text-cyan-500 border-gray-300 dark:border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <label
                    htmlFor="isRecurring"
                    className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Is Recurring?
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {error && (
            <div className="mt-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-6 mt-6 pb-6 px-6 -mx-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnyLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnyLoading}
            >
              {submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update" : "Submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEventModal;
