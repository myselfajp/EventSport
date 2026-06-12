"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Upload, ImageIcon, ChevronDown, Search } from "lucide-react";
import { fetchJSON, apiFetch } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { LEVEL_DEFINITIONS } from "@/app/lib/level-definitions";
import {
  getEventLinkSecurityHint,
  parseSecureEventLink,
} from "@/app/lib/event-link-security";
import LocationFields from "@/components/location/LocationFields";
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

type RecurrenceFrequency = "weekly" | "daily" | "monthly";

function getRecurrenceIntervalLabel(frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case "weekly":
      return "Repeat every (weeks)";
    case "daily":
      return "Repeat every (days)";
    case "monthly":
      return "Repeat every (months)";
    default:
      return "Repeat every";
  }
}

function formatListingPurchaseLine(
  sessionCount: string,
  unitPrice: number,
  totalAmount: number
): string {
  return `Listing purchase: ${totalAmount} TRY (${sessionCount} × ${unitPrice} TRY per session)`;
}

function extractRefId(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in (value as object)) {
    const id = (value as { _id?: unknown })._id;
    return id != null ? String(id) : "";
  }
  return "";
}

function extractFacilityDistrictId(
  facility: { location?: { district?: unknown } } | undefined
): string {
  return extractRefId(facility?.location?.district);
}

function localDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localTimeInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineLocalDateTime(date: string, time: string): string {
  if (!date || !time) return "";
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  if ([y, m, d, h, min].some((n) => Number.isNaN(n))) return "";
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString();
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
  location?: {
    district?: string | { _id?: string };
  };
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
    district: "",
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
    eventDetails: "",
    eventLink: "",
    private: false,
    isRecurring: false,
    checkInOpensHoursBeforeStart: "",
    recurrenceFrequency: "weekly" as "weekly" | "daily" | "monthly",
    recurrenceInterval: "1",
    recurrenceSessionCount: "4",
    listingPurchaseConfirmed: false,
    editScope: "single" as "single" | "following",
  });

  const [listingQuote, setListingQuote] = useState<{
    unitPrice: number;
    totalAmount: number;
  } | null>(null);
  const [loadingListingQuote, setLoadingListingQuote] = useState(false);

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

  const selectedFacility = useMemo(
    () => facilities.find((f) => f._id === formData.facility),
    [facilities, formData.facility]
  );
  const selectedFacilityDistrictId = useMemo(
    () => extractFacilityDistrictId(selectedFacility),
    [selectedFacility]
  );
  const showDistrictField =
    formData.type !== "Online" &&
    (!formData.facility || !selectedFacilityDistrictId);

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
      const sportGroupId = extractRefId(initialData.sportGroup);
      const sportId = extractRefId(initialData.sport);
      prevSportGroupRef.current = sportGroupId;

      const startDate = localDateInputValue(initialData.startTime);
      const startTime = localTimeInputValue(initialData.startTime);
      const endDate = localDateInputValue(initialData.endTime);
      const endTime = localTimeInputValue(initialData.endTime);

      setFormData({
        name: initialData.name || "",
        club: extractRefId(initialData.club),
        group: extractRefId(initialData.group),
        style: extractRefId(initialData.style),
        sportGroup: sportGroupId,
        sport: sportId,
        facility: extractRefId(initialData.facility),
        salon: extractRefId(initialData.salon),
        location: initialData.location || "",
        district: extractRefId(initialData.district),
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
        eventDetails: initialData.eventDetails || "",
        eventLink: initialData.eventLink || "",
        private: initialData.private || false,
        isRecurring: initialData.isRecurring || false,
        checkInOpensHoursBeforeStart:
          initialData.checkInOpensHoursBeforeStart != null
            ? String(initialData.checkInOpensHoursBeforeStart)
            : "",
        recurrenceFrequency: "weekly",
        recurrenceInterval: "1",
        recurrenceSessionCount: "4",
        listingPurchaseConfirmed: false,
        editScope: "single",
      });

      if (initialData.photo?.path) {
        setPhotoPreview(EP.assetUrl(initialData.photo.path));
      }
      if (initialData.banner?.path) {
        setBannerPreview(EP.assetUrl(initialData.banner.path));
      }

      void (async () => {
        const sgName =
          typeof initialData.sportGroup === "object" && initialData.sportGroup?.name
            ? String(initialData.sportGroup.name)
            : "";
        const sportName =
          typeof initialData.sport === "object" && initialData.sport?.name
            ? String(initialData.sport.name)
            : "";

        if (sportGroupId) {
          try {
            const sgRes = await fetchJSON(EP.REFERENCE.sportGroup.get, {
              method: "POST",
              body: { perPage: 100, pageNumber: 1 },
            });
            let groups: SportGroup[] =
              sgRes.success && Array.isArray(sgRes.data) ? sgRes.data : [];
            if (!groups.some((g) => g._id === sportGroupId)) {
              groups = [
                { _id: sportGroupId, name: sgName || "Selected sport group" },
                ...groups,
              ];
            }
            setSportGroups(groups);
          } catch {
            if (sgName) {
              setSportGroups([{ _id: sportGroupId, name: sgName }]);
            }
          }

          if (sportId) {
            try {
              const spRes = await fetchJSON(EP.REFERENCE.sport.get, {
                method: "POST",
                body: { perPage: 100, pageNumber: 1, groupId: sportGroupId },
              });
              let list: Sport[] =
                spRes.success && Array.isArray(spRes.data) ? spRes.data : [];
              if (!list.some((s) => s._id === sportId)) {
                list = [
                  { _id: sportId, name: sportName || "Selected sport", group: sportGroupId },
                  ...list,
                ];
              }
              setSports(list);
            } catch {
              if (sportName) {
                setSports([
                  { _id: sportId, name: sportName, group: sportGroupId },
                ]);
              }
            }
          }
        }
      })();
    }
  }, [initialData, isOpen]);

  const isSeriesEdit = isEditMode && !!(initialData?.series?._id || initialData?.series);

  const recurrenceIntervalLabel = useMemo(
    () => getRecurrenceIntervalLabel(formData.recurrenceFrequency),
    [formData.recurrenceFrequency]
  );

  const listingPurchaseLine = useMemo(() => {
    const count = formData.recurrenceSessionCount.trim();
    if (!listingQuote || !count) return null;
    return formatListingPurchaseLine(
      count,
      listingQuote.unitPrice,
      listingQuote.totalAmount
    );
  }, [formData.recurrenceSessionCount, listingQuote]);

  useEffect(() => {
    if (!isOpen || !formData.isRecurring || isEditMode) {
      setListingQuote(null);
      return;
    }
    const count = parseInt(formData.recurrenceSessionCount, 10);
    if (Number.isNaN(count) || count < 2 || count > 52) {
      setListingQuote(null);
      return;
    }
    let cancelled = false;
    const loadQuote = async () => {
      setLoadingListingQuote(true);
      try {
        const res = await apiFetch(EP.COACH.listingQuote(count));
        const json = await res.json();
        if (!cancelled && json?.success && json.data) {
          setListingQuote({
            unitPrice: json.data.unitPrice,
            totalAmount: json.data.totalAmount,
          });
        }
      } catch {
        if (!cancelled) setListingQuote(null);
      } finally {
        if (!cancelled) setLoadingListingQuote(false);
      }
    };
    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    formData.isRecurring,
    formData.recurrenceSessionCount,
    isEditMode,
  ]);

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
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "type" && value === "Online") {
        next.district = "";
      }
      if (field === "facility") {
        const facility = facilities.find((f) => f._id === value);
        if (extractFacilityDistrictId(facility)) {
          next.district = "";
        }
      }
      return next;
    });
    setError("");

    if (field === "priceType" && value === "Free") {
      setFormData((prev) => ({ ...prev, participationFee: "0" }));
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
      !formData.endDate ||
      !formData.endTime ||
      !formData.capacity ||
      !formData.level ||
      !formData.type ||
      !formData.priceType ||
      !formData.equipment
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (!bannerFile && !isEditMode) {
      setError("Event Banner is required");
      return;
    }

    if (!bannerFile && isEditMode && !initialData?.banner?.path) {
      setError("Event Banner is required");
      return;
    }

    if (formData.type !== "Online") {
      if (!formData.facility && !formData.salon && !formData.location) {
        setError("Exactly one of Facility, Salon, or Location must be provided");
        return;
      }

      const needsDistrict =
        (!formData.facility && !formData.salon) ||
        Boolean(formData.facility && !selectedFacilityDistrictId);
      if (needsDistrict && !formData.district) {
        setError(
          formData.facility
            ? "Selected facility has no district — select an Istanbul district below"
            : "Select an Istanbul district when no facility is chosen"
        );
        return;
      }
    }

    if (!formData.participationFee || parseFloat(formData.participationFee) < 0) {
      setError("Gamer Fee must be a valid number (0 or greater)");
      return;
    }

    if (formData.priceType !== "Free" && parseFloat(formData.participationFee) === 0) {
      setError("Gamer Fee must be greater than 0 when Price Type is not 'Free'");
      return;
    }

    const rawLink = formData.eventLink.trim();
    let normalizedLink = "";
    if (rawLink) {
      const linkResult = parseSecureEventLink(rawLink);
      if (!linkResult.ok) {
        setError(linkResult.error);
        return;
      }
      normalizedLink = linkResult.url;
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

      const startDateTime = combineLocalDateTime(
        formData.startDate,
        formData.startTime
      );
      const endDateTime =
        formData.endDate && formData.endTime
          ? combineLocalDateTime(formData.endDate, formData.endTime)
          : startDateTime;

      if (!startDateTime || !endDateTime) {
        setError("Invalid start or end date/time");
        setSubmitting(false);
        return;
      }

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
        eventDetails: formData.eventDetails.trim(),
        eventLink: normalizedLink,
      };

      const checkInHoursRaw = formData.checkInOpensHoursBeforeStart.trim();
      if (checkInHoursRaw !== "") {
        const hours = parseInt(checkInHoursRaw, 10);
        if (Number.isNaN(hours) || hours < 0 || hours > 720) {
          setError("Check-in hours must be between 0 and 720");
          setSubmitting(false);
          return;
        }
        (eventData as any).checkInOpensHoursBeforeStart = hours;
      }

      if (formData.facility) {
        (eventData as any).facility = formData.facility;
      }
      if (formData.salon) {
        (eventData as any).salon = formData.salon;
      }
      if (formData.location) {
        (eventData as any).location = formData.location;
      }
      if (formData.type !== "Online" && formData.district) {
        (eventData as any).district = formData.district;
      }

      if (formData.isRecurring && !isEditMode) {
        const sessionCount = parseInt(formData.recurrenceSessionCount, 10);
        const interval = parseInt(formData.recurrenceInterval, 10);
        if (
          Number.isNaN(sessionCount) ||
          sessionCount < 2 ||
          sessionCount > 52 ||
          Number.isNaN(interval) ||
          interval < 1
        ) {
          setError("Invalid recurrence settings (session count 2–52, interval ≥ 1)");
          setSubmitting(false);
          return;
        }
        if (!formData.listingPurchaseConfirmed) {
          setError("Please confirm listing purchase for the recurring series");
          setSubmitting(false);
          return;
        }
        (eventData as any).recurrence = {
          frequency: formData.recurrenceFrequency,
          interval,
          sessionCount,
        };
        (eventData as any).listingPurchaseConfirmed = true;
      }

      if (isSeriesEdit) {
        (eventData as any).scope = formData.editScope;
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
        const msg =
          !isEditMode && formData.isRecurring && result.sessions
            ? `🎉 Series created with ${result.sessions.length} sessions! Listing: ${result.listing?.totalAmount ?? 0} TRY`
            : isEditMode
              ? "🎉 Event updated successfully!"
              : "🎉 Event created successfully!";
        alert(msg);
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.message || (isEditMode ? "There was a problem updating the event" : "There was a problem creating the event"));
      }
    } catch (err: any) {
      setError(
        isEditMode
          ? "There was a problem updating the event"
          : "There was a problem creating the event"
      );
      console.error(isEditMode ? "Error updating event:" : "Error creating event:", err);
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
      district: "",
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
      eventDetails: "",
      eventLink: "",
      private: false,
      isRecurring: false,
      checkInOpensHoursBeforeStart: "",
      recurrenceFrequency: "weekly",
      recurrenceInterval: "1",
      recurrenceSessionCount: "4",
      listingPurchaseConfirmed: false,
      editScope: "single",
    });
    setListingQuote(null);
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
    prevSportGroupRef.current = "";
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
                  disabled={formData.type === "Online"}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 disabled:opacity-50"
                />
              </div>

              {showDistrictField && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Istanbul District <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {formData.facility
                      ? "This facility has no district on file. Select one for this event, or edit the facility to add a district permanently."
                      : "Required when no facility is selected. If you pick a facility with a district, it is used automatically."}
                  </p>
                  <LocationFields
                    value={{
                      district: formData.district,
                      addressLine: "",
                    }}
                    onChange={(loc) => handleInputChange("district", loc.district)}
                    showAddressLine={false}
                  />
                </div>
              )}

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
                    Event End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      handleInputChange("endDate", e.target.value)
                    }
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      handleInputChange("endTime", e.target.value)
                    }
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 items-start">
                <LevelDefinitions className="min-h-0 max-h-[320px] overflow-y-auto" />
                <div className="lg:pt-7">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Check-in opens (hours before start)
                </label>
                <input
                  type="number"
                  min={0}
                  max={720}
                  step={1}
                  value={formData.checkInOpensHoursBeforeStart}
                  onChange={(e) =>
                    handleInputChange("checkInOpensHoursBeforeStart", e.target.value)
                  }
                  placeholder="Leave empty to use Event Style default"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Example: 48 = check-in opens 2 days before the event. Empty = use the
                  style default from admin settings.
                </p>
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
                    Gamer Fee <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.participationFee}
                    onChange={(e) =>
                      handleInputChange("participationFee", e.target.value)
                    }
                    placeholder="Gamer Fee"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    disabled={formData.priceType === "Free"}
                    min="0"
                    required
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
                  Equipment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.equipment}
                  onChange={(e) =>
                    handleInputChange("equipment", e.target.value)
                  }
                  placeholder="e.g. running shoes, racket, water bottle"
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event link
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Optional. Registration page, live stream, tickets, or any related link
                  (shown on the event page). <strong>HTTPS only</strong> — insecure or
                  unsupported link types are blocked.
                </p>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  value={formData.eventLink}
                  onChange={(e) =>
                    handleInputChange("eventLink", e.target.value)
                  }
                  placeholder="https://example.com/register"
                  maxLength={500}
                  title="Enter a secure HTTPS URL (https://example.com)"
                  className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                    getEventLinkSecurityHint(formData.eventLink)
                      ? "border-amber-400 dark:border-amber-600"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {getEventLinkSecurityHint(formData.eventLink) ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    {getEventLinkSecurityHint(formData.eventLink)}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event details &amp; rules
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Optional. Add house rules, skill requirements, cancellation policy, or
                  other notes for participants.
                </p>
                <textarea
                  value={formData.eventDetails}
                  onChange={(e) =>
                    handleInputChange("eventDetails", e.target.value)
                  }
                  placeholder="e.g. Arrive 15 minutes early. No refunds within 24h of start. Beginners welcome."
                  rows={5}
                  maxLength={5000}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-y min-h-[120px] dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                  {formData.eventDetails.length}/5000
                </p>
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
                    disabled={isEditMode}
                    onChange={(e) =>
                      handleInputChange("isRecurring", e.target.checked)
                    }
                    className="w-4 h-4 text-cyan-500 border-gray-300 dark:border-gray-600 rounded focus:ring-cyan-500 focus:ring-2 disabled:opacity-50"
                  />
                  <label
                    htmlFor="isRecurring"
                    className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Is Recurring?
                  </label>
                </div>
              </div>

              {formData.isRecurring && !isEditMode && (
                <div className="mt-4 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20 space-y-4">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Recurrence schedule
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Frequency
                      </label>
                      <select
                        value={formData.recurrenceFrequency}
                        onChange={(e) =>
                          handleInputChange(
                            "recurrenceFrequency",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {recurrenceIntervalLabel}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={formData.recurrenceInterval}
                        onChange={(e) =>
                          handleInputChange("recurrenceInterval", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Number of sessions
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={52}
                        value={formData.recurrenceSessionCount}
                        onChange={(e) =>
                          handleInputChange(
                            "recurrenceSessionCount",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {loadingListingQuote ? (
                      <span>Calculating listing cost…</span>
                    ) : listingPurchaseLine ? (
                      <span>{listingPurchaseLine}</span>
                    ) : (
                      <span>
                        Enter a valid session count (2–52) to see listing cost.
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="listingPurchaseConfirmed"
                      checked={formData.listingPurchaseConfirmed}
                      onChange={(e) =>
                        handleInputChange(
                          "listingPurchaseConfirmed",
                          e.target.checked
                        )
                      }
                      className="mt-1 w-4 h-4 text-cyan-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label
                      htmlFor="listingPurchaseConfirmed"
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      I confirm the listing purchase for all sessions in this
                      series (payment will be made to the coach/organizer of
                      the event at once at the beginning).
                    </label>
                  </div>
                </div>
              )}

              {isSeriesEdit && (
                <div className="mt-4 p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Apply changes to
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="editScope"
                        checked={formData.editScope === "single"}
                        onChange={() =>
                          handleInputChange("editScope", "single")
                        }
                      />
                      This session only
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="editScope"
                        checked={formData.editScope === "following"}
                        onChange={() =>
                          handleInputChange("editScope", "following")
                        }
                      />
                      This and following sessions
                    </label>
                  </div>
                </div>
              )}
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
