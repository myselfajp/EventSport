"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  User,
  Users,
  Home,
  Building,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  Heart,
  Loader2,
  Check,
} from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import {
  User as UserType,
  UserSearchFilters,
  UserSearchResponse,
  Facility,
  FacilitySearchResponse,
  Company,
  CompanySearchResponse,
  Club,
  ClubSearchResponse,
  Group,
  GroupSearchResponse,
  SportGroup,
  Sport,
  SportResponse,
} from "@/app/lib/types";
import UserProfileModal from "../UserProfileModal";
import FacilityDetailsModal from "./FacilityDetailsModal";
import CompanyDetailsModal from "./CompanyDetailsModal";
import ClubViewModal from "../ClubViewModal";
import GroupViewModal from "../GroupViewModal";
import { useMe } from "@/app/hooks/useAuth";
import {
  FavoriteKind,
  defaultFavorites,
  isFavorited,
  useAddFavorite,
  useFavorites,
  useRemoveFavorite,
} from "@/app/hooks/useFavorites";
import {
  FollowType,
  defaultFollowLists as defaultFollows,
  useFollows,
  useFollowMutation,
  useUnfollowMutation,
} from "@/app/hooks/useFollows";

interface FindModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchType =
  | "coach"
  | "participant"
  | "facility"
  | "company"
  | "club"
  | "group";

const FindModal: React.FC<FindModalProps> = ({ isOpen, onClose }) => {
  const [selectedType, setSelectedType] = useState<SearchType>("coach");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    UserType[] | Facility[] | Company[] | Club[] | Group[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 5,
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserContext, setSelectedUserContext] = useState<
    "coach" | "participant"
  >("coach");
  const [showProfile, setShowProfile] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    null
  );
  const [showFacilityDetails, setShowFacilityDetails] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showClubDetails, setShowClubDetails] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [sportGroupFilter, setSportGroupFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoadingSportGroups, setIsLoadingSportGroups] = useState(false);
  const [isLoadingSports, setIsLoadingSports] = useState(false);
  const { data: user } = useMe();
  const { data: favoritesData } = useFavorites();
  const favorites = favoritesData?.data || defaultFavorites;
  const { mutateAsync: addFavoriteAsync, isPending: isSavingFavorite } =
    useAddFavorite();
  const { mutateAsync: removeFavoriteAsync, isPending: isRemovingFavorite } =
    useRemoveFavorite();
  const canFavorite = !!user?.participant;
  const canFollow = !!user?.participant;
  const { data: followsData } = useFollows();
  const follows = followsData?.grouped || defaultFollows;
  const { mutateAsync: followAsync, isPending: isSavingFollow } =
    useFollowMutation();
  const { mutateAsync: unfollowAsync, isPending: isRemovingFollowAction } =
    useUnfollowMutation();
  const [followAnimatingId, setFollowAnimatingId] = useState<string | null>(
    null
  );
  const [pendingFollowIds, setPendingFollowIds] = useState<Set<string>>(
    new Set()
  );
  const [followSuccessIds, setFollowSuccessIds] = useState<Set<string>>(
    new Set()
  );
  const [followOverrides, setFollowOverrides] = useState<
    Record<string, boolean>
  >({});
  const [favoriteAnimatingId, setFavoriteAnimatingId] = useState<string | null>(
    null
  );

  const followKey = (type: FollowType, id?: string) => `${type}:${id || ""}`;

  const isFollowedOptimistic = (type: FollowType, id?: string) => {
    if (!id) return false;
    const key = followKey(type, id);
    if (followOverrides[key] !== undefined) return followOverrides[key];
    return isFollowed(type, id);
  };

  const getFollowEntryId = (type: FollowType, entry: any) => {
    if (!entry) return "";
    if (type === "coach") {
      return (
        entry?.followingCoach?._id ||
        entry?.followingCoach?.id ||
        entry?.followingCoach ||
        entry?.coachId ||
        ""
      );
    }
    if (type === "facility") {
      return (
        entry?.followingFacility?._id ||
        entry?.followingFacility?.id ||
        entry?.followingFacility ||
        entry?.facilityId ||
        ""
      );
    }
    if (type === "company") {
      return (
        entry?.followingCompany?._id ||
        entry?.followingCompany?.id ||
        entry?.followingCompany ||
        entry?.companyId ||
        ""
      );
    }
    if (type === "club") {
      return (
        entry?.followingClub?._id ||
        entry?.followingClub?.id ||
        entry?.followingClub ||
        entry?.clubId ||
        ""
      );
    }
    return (
      entry?.followingClubGroup?._id ||
      entry?.followingClubGroup?.id ||
      entry?.followingClubGroup ||
      entry?.groupId ||
      ""
    );
  };

  const isFollowed = (type: FollowType, id?: string) => {
    if (!id) return false;
    const list = follows?.[type] || [];
    return list.some((entry: any) => getFollowEntryId(type, entry) === id);
  };

  const handleFollowClick = async (
    e: React.MouseEvent,
    type: FollowType,
    id?: string
  ) => {
    e.stopPropagation();
    if (!id) return;
    if (!canFollow) {
      alert("Create a participant profile to follow.");
      return;
    }

    const animKey = `follow-${type}-${id}`;
    setFollowAnimatingId(animKey);
    setPendingFollowIds((prev) => new Set(prev).add(animKey));
    const key = followKey(type, id);
    const currently = isFollowedOptimistic(type, id);
    setFollowOverrides((prev) => ({ ...prev, [key]: !currently }));

    try {
      if (currently) {
        await unfollowAsync({ type, id });
      } else {
        await followAsync({ type, id });
      }
      setFollowSuccessIds((prev) => {
        const next = new Set(prev);
        next.add(animKey);
        return next;
      });
    } catch (err) {
      // revert optimistic state on failure
      setFollowOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setFollowSuccessIds((prev) => {
        const next = new Set(prev);
        next.add(animKey + "-err");
        return next;
      });
    } finally {
      setFollowAnimatingId((curr) => (curr === animKey ? null : curr));
      setPendingFollowIds((prev) => {
        const next = new Set(prev);
        next.delete(animKey);
        return next;
      });
      setTimeout(() => {
        setFollowSuccessIds((prev) => {
          const next = new Set(prev);
          next.delete(animKey);
          next.delete(animKey + "-err");
          return next;
        });
      }, 900);
    }
  };

  const revertFollowOverride = (type: FollowType, id?: string) => {
    if (!id) return;
    const key = followKey(type, id);
    setFollowOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fetchSportsAndGroups = async () => {
    setIsLoadingSports(true);
    setIsLoadingSportGroups(true);
    try {
      const response: SportResponse = await fetchJSON(EP.REFERENCE.sport, {
        method: "POST",
        body: {},
      });

      if (response?.success && response?.data) {
        // Extract unique sport groups from sports data
        const uniqueGroups = response.data.reduce(
          (groups: SportGroup[], sport) => {
            if (!groups.find((g) => g._id === sport.group)) {
              groups.push({
                _id: sport.group,
                name: sport.groupName,
              });
            }
            return groups;
          },
          []
        );

        setSportGroups(uniqueGroups);
        setSports(response.data);
      }
    } catch (err) {
      console.error("Error fetching sports and groups:", err);
    } finally {
      setIsLoadingSports(false);
      setIsLoadingSportGroups(false);
    }
  };

  const searchCoaches = async (filters: {
    search?: string;
    sport?: string;
    pageNumber?: number;
    perPage?: number;
    isVerified?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(!!filters.search);

    try {
      const payload: any = {
        perPage: filters.perPage || 5,
        pageNumber: filters.pageNumber || 1,
      };

      if (filters.search && filters.search.trim().length >= 2) {
        payload.search = filters.search.trim();
      }

      if (filters.sport) {
        payload.sport = filters.sport;
      }

      if (filters.isVerified !== undefined) {
        payload.isVerified = filters.isVerified;
      }

      const response = await fetchJSON(EP.COACH.getCoachList, {
        method: "POST",
        body: payload,
      });

      if (response?.success && response?.data) {
        setSearchResults(response.data);
        setPagination({
          currentPage: response.pagination?.page || response.pageNumber || 1,
          totalPages:
            response.pagination?.totalPages || response.totalPages || 1,
          total: response.pagination?.total || response.total || 0,
          perPage: response.pagination?.perPage || response.perPage || 5,
        });
      } else {
        setError(response?.message || "Failed to search coaches");
        setSearchResults([]);
      }
    } catch (err) {
      setError("An error occurred while searching coaches");
      setSearchResults([]);
      console.error("Error searching coaches:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchParticipants = async (filters: {
    search?: string;
    sport?: string;
    pageNumber?: number;
    perPage?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(!!filters.search);

    try {
      const payload: any = {
        perPage: filters.perPage || 5,
        pageNumber: filters.pageNumber || 1,
      };

      if (filters.search && filters.search.trim().length >= 2) {
        payload.search = filters.search.trim();
      }

      if (filters.sport) {
        payload.sport = filters.sport;
      }

      const response = await fetchJSON(EP.PARTICIPANT_LIST.getParticipantList, {
        method: "POST",
        body: payload,
      });

      if (response?.success && response?.data) {
        setSearchResults(response.data);
        setPagination({
          currentPage: response.pagination?.page || response.pageNumber || 1,
          totalPages:
            response.pagination?.totalPages || response.totalPages || 1,
          total: response.pagination?.total || response.total || 0,
          perPage: response.pagination?.perPage || response.perPage || 5,
        });
      } else {
        setError(response?.message || "Failed to search participants");
        setSearchResults([]);
      }
    } catch (err) {
      setError("An error occurred while searching participants");
      setSearchResults([]);
      console.error("Error searching participants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchFacilities = async (filters: {
    search?: string;
    pageNumber?: number;
    perPage?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const payload: any = {
        perPage: filters.perPage || 5,
        pageNumber: filters.pageNumber || 1,
      };

      if (filters.search && filters.search.trim().length >= 2) {
        payload.search = filters.search.trim();
      }

      const response: FacilitySearchResponse = await fetchJSON(
        EP.FACILITY.getFacility,
        {
          method: "POST",
          body: payload,
        }
      );

      if (response?.success && response?.data) {
        setSearchResults(response.data);
        setPagination({
          currentPage: response.pageNumber || 1,
          totalPages: response.totalPages || 1,
          total: response.total || 0,
          perPage: response.perPage || 5,
        });
      } else {
        setError(response?.message || "Failed to search facilities");
        setSearchResults([]);
      }
    } catch (err) {
      setError("An error occurred while searching facilities");
      setSearchResults([]);
      console.error("Error searching facilities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchCompanies = async (filters: {
    search?: string;
    pageNumber?: number;
    perPage?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const payload: any = {
        perPage: filters.perPage || 5,
        pageNumber: filters.pageNumber || 1,
      };

      if (filters.search && filters.search.trim().length >= 2) {
        payload.search = filters.search.trim();
      }

      const response: CompanySearchResponse = await fetchJSON(
        EP.COMPANY.getCompany,
        {
          method: "POST",
          body: payload,
        }
      );

      if (response?.success && response?.data) {
        setSearchResults(response.data);
        setPagination({
          currentPage: response.pageNumber || 1,
          totalPages: response.totalPages || 1,
          total: response.total || 0,
          perPage: response.perPage || 5,
        });
      } else {
        setError(response?.message || "Failed to search companies");
        setSearchResults([]);
      }
    } catch (err) {
      setError("An error occurred while searching companies");
      setSearchResults([]);
      console.error("Error searching companies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchClubs = async (filters: {
    search?: string;
    creator?: string;
    pageNumber?: number;
    perPage?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const payload: any = {
        perPage: filters.perPage || 5,
        pageNumber: filters.pageNumber || 1,
      };

      if (filters.search && filters.search.trim().length >= 2) {
        payload.search = filters.search.trim();
      }

      if (filters.creator) {
        payload.creator = filters.creator;
      }

      const response: ClubSearchResponse = await fetchJSON(EP.CLUB.getClub, {
        method: "POST",
        body: payload,
      });

      if (response?.success && response?.data) {
        setSearchResults(response.data);
        setPagination({
          currentPage: response.pagination?.currentPage || 1,
          totalPages: response.pagination?.totalPages || 1,
          total: response.pagination?.total || 0,
          perPage: response.pagination?.perPage || 5,
        });
      } else {
        setError(response?.message || "Failed to search clubs");
        setSearchResults([]);
      }
    } catch (err) {
      setError("An error occurred while searching clubs");
      setSearchResults([]);
      console.error("Error searching clubs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchGroups = async (filters: {
    search?: string;
    pageNumber?: number;
    perPage?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const payload: any = {
        perPage: filters.perPage || 5,
        pageNumber: filters.pageNumber || 1,
      };

      if (filters.search && filters.search.trim().length >= 2) {
        payload.search = filters.search.trim();
      }

      const response: GroupSearchResponse = await fetchJSON(EP.GROUP.getGroup, {
        method: "POST",
        body: payload,
      });

      if (response?.success && response?.data) {
        setSearchResults(response.data);
        setPagination({
          currentPage: response.pagination?.currentPage || 1,
          totalPages: response.pagination?.totalPages || 1,
          total: response.pagination?.total || 0,
          perPage: response.pagination?.perPage || 5,
        });
      } else {
        setError(response?.message || "Failed to search groups");
        setSearchResults([]);
      }
    } catch (err) {
      setError("An error occurred while searching groups");
      setSearchResults([]);
      console.error("Error searching groups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteClick = async (
    e: React.MouseEvent,
    type: FavoriteKind,
    id: string,
    entity: any
  ) => {
    e.stopPropagation();
    if (!id) return;
    if (!canFavorite) {
      alert("Create a participant profile to add favorites.");
      return;
    }
    const currentlyFav = isFavorited(favorites, type, id);
    const animKey = `${type}-${id}`;
    setFavoriteAnimatingId(animKey);
    try {
      if (currentlyFav) {
        await removeFavoriteAsync({ type, id });
      } else {
        await addFavoriteAsync({ type, id, entity });
      }
    } finally {
      setTimeout(() => {
        setFavoriteAnimatingId((curr) => (curr === animKey ? null : curr));
      }, 350);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2 && searchQuery.trim().length > 0) {
      setError("Please enter at least 2 characters to search");
      return;
    }

    setError(null);
    setHasSearched(searchQuery.trim().length >= 2);

    if (selectedType === "coach") {
      searchCoaches({
        search: searchQuery.trim().length >= 2 ? searchQuery : "",
        sport: sportFilter || undefined,
        pageNumber: 1,
        perPage: pagination.perPage,
        isVerified: true,
      });
    } else if (selectedType === "participant") {
      searchParticipants({
        search: searchQuery.trim().length >= 2 ? searchQuery : "",
        sport: sportFilter || undefined,
        pageNumber: 1,
        perPage: pagination.perPage,
      });
    } else if (selectedType === "facility") {
      searchFacilities({
        search: searchQuery.trim().length >= 2 ? searchQuery : "",
        pageNumber: 1,
        perPage: pagination.perPage,
      });
    } else if (selectedType === "company") {
      searchCompanies({
        search: searchQuery.trim().length >= 2 ? searchQuery : "",
        pageNumber: 1,
        perPage: pagination.perPage,
      });
    } else if (selectedType === "club") {
      searchClubs({
        search: searchQuery.trim().length >= 2 ? searchQuery : "",
        pageNumber: 1,
        perPage: pagination.perPage,
      });
    } else if (selectedType === "group") {
      searchGroups({
        search: searchQuery.trim().length >= 2 ? searchQuery : "",
        pageNumber: 1,
        perPage: pagination.perPage,
      });
    }
  };

  const handlePageChange = (page: number) => {
    if (selectedType === "coach") {
      searchCoaches({
        search: hasSearched ? searchQuery : "",
        sport: sportFilter || undefined,
        pageNumber: page,
        perPage: pagination.perPage,
        isVerified: true,
      });
    } else if (selectedType === "participant") {
      searchParticipants({
        search: hasSearched ? searchQuery : "",
        sport: sportFilter || undefined,
        pageNumber: page,
        perPage: pagination.perPage,
      });
    } else if (selectedType === "facility") {
      searchFacilities({
        search: hasSearched ? searchQuery : "",
        pageNumber: page,
        perPage: pagination.perPage,
      });
    } else if (selectedType === "company") {
      searchCompanies({
        search: hasSearched ? searchQuery : "",
        pageNumber: page,
        perPage: pagination.perPage,
      });
    } else if (selectedType === "club") {
      searchClubs({
        search: hasSearched ? searchQuery : "",
        pageNumber: page,
        perPage: pagination.perPage,
      });
    } else if (selectedType === "group") {
      searchGroups({
        search: hasSearched ? searchQuery : "",
        pageNumber: page,
        perPage: pagination.perPage,
      });
    }
  };

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedType === "coach") {
        fetchSportsAndGroups();
        // Load initial coaches - only verified ones
        searchCoaches({
          pageNumber: 1,
          perPage: pagination.perPage,
          isVerified: true,
        });
      } else if (selectedType === "participant") {
        fetchSportsAndGroups();
        // Load initial participants
        searchParticipants({
          pageNumber: 1,
          perPage: pagination.perPage,
        });
      } else if (selectedType === "facility") {
        searchFacilities({
          pageNumber: 1,
          perPage: pagination.perPage,
        });
      } else if (selectedType === "company") {
        searchCompanies({
          pageNumber: 1,
          perPage: pagination.perPage,
        });
      } else if (selectedType === "club") {
        searchClubs({
          pageNumber: 1,
          perPage: pagination.perPage,
        });
      } else if (selectedType === "group") {
        searchGroups({
          pageNumber: 1,
          perPage: pagination.perPage,
        });
      }
    }
  }, [isOpen, selectedType]);

  // Filter sports based on selected sport group
  useEffect(() => {
    if (sportGroupFilter) {
      setSportFilter("");
    } else {
      setSportFilter("");
    }
  }, [sportGroupFilter]);

  // Handle sport filter changes - make API call
  useEffect(() => {
    if (sportFilter) {
      if (selectedType === "coach") {
        searchCoaches({
          search: hasSearched ? searchQuery : "",
          sport: sportFilter,
          pageNumber: 1,
          perPage: pagination.perPage,
          isVerified: true,
        });
      } else if (selectedType === "participant") {
        searchParticipants({
          search: hasSearched ? searchQuery : "",
          sport: sportFilter,
          pageNumber: 1,
          perPage: pagination.perPage,
        });
      }
    }
  }, [sportFilter]);

  // Clear results when type changes to ensure proper filtering
  useEffect(() => {
    setSearchResults([]);
    setPagination({
      currentPage: 1,
      totalPages: 1,
      total: 0,
      perPage: 5,
    });
    setError(null);
    setHasSearched(false);
    // Clear sport filters when changing type
    if (selectedType === "facility" || selectedType === "company") {
      setSportGroupFilter("");
      setSportFilter("");
    }
  }, [selectedType]);

  const handleUserSelect = (
    userId: string,
    context?: "coach" | "participant"
  ) => {
    setSelectedUserId(userId);
    setSelectedUserContext(context || "coach");
    setShowProfile(true);
  };

  const handleFacilitySelect = (facility: Facility) => {
    setSelectedFacility(facility);
    setShowFacilityDetails(true);
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyDetails(true);
  };

  const handleClubSelect = (club: Club) => {
    setSelectedClub(club);
    setShowClubDetails(true);
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  const handleCloseUserProfile = () => {
    setShowProfile(false);
    setSelectedUserId(null);
    setSelectedUserContext("coach");
  };

  const handleCloseFacilityDetails = () => {
    setShowFacilityDetails(false);
    setSelectedFacility(null);
  };

  const handleCloseCompanyDetails = () => {
    setShowCompanyDetails(false);
    setSelectedCompany(null);
  };

  const handleCloseClubDetails = () => {
    setShowClubDetails(false);
    setSelectedClub(null);
  };

  const handleCloseGroupDetails = () => {
    setShowGroupDetails(false);
    setSelectedGroup(null);
  };

  const handleClose = () => {
    onClose();
    setSearchQuery("");
    setSearchResults([]);
    setSelectedType("coach");
    setError(null);
    setPagination({
      currentPage: 1,
      totalPages: 1,
      total: 0,
      perPage: 5,
    });
    setShowProfile(false);
    setSelectedUserId(null);
    setSelectedUserContext("coach");
    setHasSearched(false);
    setSportGroupFilter("");
    setSportFilter("");
    setShowFacilityDetails(false);
    setSelectedFacility(null);
    setShowCompanyDetails(false);
    setSelectedCompany(null);
    setShowClubDetails(false);
    setSelectedClub(null);
    setShowGroupDetails(false);
    setSelectedGroup(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
            Find
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 dark:bg-gray-800">
          {/* Search Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What are you looking for?
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSelectedType("coach")}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-lg border transition-all ${
                  selectedType === "coach"
                    ? "border-cyan-500 bg-cyan-900/30"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <Users
                  className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 ${
                    selectedType === "coach"
                      ? "text-cyan-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    selectedType === "coach" ? "text-cyan-300" : "text-gray-400"
                  }`}
                >
                  Coach
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("participant")}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-lg border transition-all ${
                  selectedType === "participant"
                    ? "border-cyan-500 bg-cyan-900/30"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <User
                  className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 ${
                    selectedType === "participant"
                      ? "text-cyan-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    selectedType === "participant"
                      ? "text-cyan-300"
                      : "text-gray-400"
                  }`}
                >
                  Participant
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("facility")}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-lg border transition-all ${
                  selectedType === "facility"
                    ? "border-cyan-500 bg-cyan-900/30"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <Home
                  className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 ${
                    selectedType === "facility"
                      ? "text-cyan-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    selectedType === "facility"
                      ? "text-cyan-300"
                      : "text-gray-400"
                  }`}
                >
                  Facility
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("company")}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-lg border transition-all ${
                  selectedType === "company"
                    ? "border-cyan-500 bg-cyan-900/30"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <Building
                  className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 ${
                    selectedType === "company"
                      ? "text-cyan-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    selectedType === "company"
                      ? "text-cyan-300"
                      : "text-gray-400"
                  }`}
                >
                  Company
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("club")}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-lg border transition-all ${
                  selectedType === "club"
                    ? "border-cyan-500 bg-cyan-900/30"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <Shield
                  className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 ${
                    selectedType === "club"
                      ? "text-cyan-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    selectedType === "club" ? "text-cyan-300" : "text-gray-400"
                  }`}
                >
                  Club
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("group")}
                className={`flex flex-col items-center p-2.5 sm:p-3 rounded-lg border transition-all ${
                  selectedType === "group"
                    ? "border-cyan-500 bg-cyan-900/30"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <UserCheck
                  className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 ${
                    selectedType === "group"
                      ? "text-cyan-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    selectedType === "group" ? "text-cyan-300" : "text-gray-400"
                  }`}
                >
                  Group
                </span>
              </button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search{" "}
              {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Enter ${selectedType} name...`}
                className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Filters - Only show for coach and participant */}
          {(selectedType === "coach" || selectedType === "participant") && (
            <div className="mb-6">
              <div className="flex gap-3">
                <select
                  value={sportGroupFilter}
                  onChange={(e) => {
                    setSportGroupFilter(e.target.value);
                    setSportFilter("");
                  }}
                  disabled={isLoadingSportGroups}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50 text-base dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {isLoadingSportGroups ? "Loading..." : "All sport groups"}
                  </option>
                  {sportGroups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  disabled={!sportGroupFilter || isLoadingSports}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50 text-base dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {!sportGroupFilter
                      ? "Select sport group first"
                      : isLoadingSports
                      ? "Loading..."
                      : "Select sport"}
                  </option>
                  {sports
                    .filter(
                      (sport) =>
                        !sportGroupFilter || sport.group === sportGroupFilter
                    )
                    .map((sport) => (
                      <option key={sport._id} value={sport._id}>
                        {sport.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="flex-1 overflow-auto max-h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 dark:text-red-400">
                {error}
              </div>
            ) : searchResults.length === 0 && hasSearched && !isLoading ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">
                  No {selectedType}s found for "{searchQuery}"
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">
                  {hasSearched
                    ? `No ${selectedType}s found for your search`
                    : `Loading ${selectedType}s...`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {searchResults.map((result, index) => {
                  if (selectedType === "coach") {
                    const coach = result as any;
                    const coachId =
                      coach?.coach?._id || coach?.coach || coach?._id;
                    const coachFavoriteEntity = coachId
                      ? { ...coach, coach: coachId }
                      : coach;
                    return (
                      <div
                        key={coach._id}
                        onClick={() =>
                          handleUserSelect(coach.coach._id, "coach")
                        }
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/50 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {coach.firstName} {coach.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Coach •{" "}
                              {coach.coach?.membershipLevel || "Standard"}
                            </div>
                            <div className="flex gap-1 mt-1">
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs rounded-full">
                                Coach
                              </span>
                              {coach.coach?.isVerified && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={(e) =>
                                handleFollowClick(e, "coach", coachId)
                              }
                              disabled={!coachId || !canFollow}
                              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                                isFollowedOptimistic("coach", coachId)
                                  ? "border-red-200 text-red-600 dark:border-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  : "border-cyan-200 text-cyan-700 dark:border-cyan-800 dark:text-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
                              } ${
                                !coachId || !canFollow
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >
                              {pendingFollowIds.has(
                                `follow-coach-${coachId}`
                              ) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : followSuccessIds.has(
                                  `follow-coach-${coachId}`
                                ) ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isFollowedOptimistic("coach", coachId) ? (
                                "Unfollow"
                              ) : (
                                "Follow"
                              )}
                            </button>
                            <button
                              aria-label={
                                isFavorited(
                                  favorites,
                                  "coach",
                                  coachId || ""
                                ) || !coachId
                                  ? "Favorited"
                                  : "Add to favorites"
                              }
                              onClick={(e) =>
                                handleFavoriteClick(
                                  e,
                                  "coach",
                                  coachId,
                                  coachFavoriteEntity
                                )
                              }
                              disabled={
                                !coachId ||
                                !canFavorite ||
                                isSavingFavorite ||
                                isRemovingFavorite
                              }
                              className={`p-2 rounded-full border border-transparent hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors transition-transform ${
                                isFavorited(favorites, "coach", coachId || "")
                                  ? "text-red-500"
                                  : "text-gray-400 dark:text-gray-500"
                              } ${
                                !coachId || !canFavorite
                                  ? "cursor-not-allowed opacity-60"
                                  : favoriteAnimatingId === `coach-${coachId}`
                                  ? "scale-110"
                                  : ""
                              }`}
                            >
                              <Heart
                                className="w-4 h-4"
                                fill={
                                  isFavorited(favorites, "coach", coachId || "")
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (selectedType === "participant") {
                    const participant = result as any;
                    return (
                      <div
                        key={participant._id}
                        onClick={() =>
                          handleUserSelect(participant._id, "participant")
                        }
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/50 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {participant.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {participant.mainSport?.name} • Level{" "}
                              {participant.skillLevel}
                            </div>
                            <div className="flex gap-1 mt-1">
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                                Participant
                              </span>
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                                {participant.membershipLevel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (selectedType === "facility") {
                    const facility = result as Facility;
                    return (
                      <div
                        key={facility._id}
                        onClick={() => handleFacilitySelect(facility)}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
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
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {facility.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {facility.address}
                            </div>
                            {facility.membershipLevel && (
                              <div className="flex gap-1 mt-1">
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                                  {facility.membershipLevel}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={(e) =>
                                handleFollowClick(e, "facility", facility._id)
                              }
                              disabled={!facility._id || !canFollow}
                              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                                isFollowedOptimistic("facility", facility._id)
                                  ? "border-red-200 text-red-600 dark:border-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  : "border-cyan-200 text-cyan-700 dark:border-cyan-800 dark:text-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
                              } ${
                                !facility._id || !canFollow
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >
                              {pendingFollowIds.has(
                                `follow-facility-${facility._id}`
                              ) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : followSuccessIds.has(
                                  `follow-facility-${facility._id}`
                                ) ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isFollowedOptimistic(
                                  "facility",
                                  facility._id
                                ) ? (
                                "Unfollow"
                              ) : (
                                "Follow"
                              )}
                            </button>
                            <button
                              aria-label={
                                isFavorited(
                                  favorites,
                                  "facility",
                                  facility._id || ""
                                )
                                  ? "Favorited"
                                  : "Add to favorites"
                              }
                              onClick={(e) =>
                                handleFavoriteClick(
                                  e,
                                  "facility",
                                  facility._id,
                                  facility
                                )
                              }
                              disabled={
                                !facility._id ||
                                !canFavorite ||
                                isSavingFavorite ||
                                isRemovingFavorite
                              }
                              className={`p-2 rounded-full border border-transparent hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors transition-transform ${
                                isFavorited(favorites, "facility", facility._id)
                                  ? "text-red-500"
                                  : "text-gray-400 dark:text-gray-500"
                              } ${
                                !facility._id || !canFavorite
                                  ? "cursor-not-allowed opacity-60"
                                  : favoriteAnimatingId ===
                                    `facility-${facility._id}`
                                  ? "scale-110"
                                  : ""
                              }`}
                            >
                              <Heart
                                className="w-4 h-4"
                                fill={
                                  isFavorited(
                                    favorites,
                                    "facility",
                                    facility._id
                                  )
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (selectedType === "company") {
                    const company = result as Company;
                    return (
                      <div
                        key={company._id}
                        onClick={() => handleCompanySelect(company)}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                            {company.photo ? (
                              <img
                                src={
                                  typeof company.photo === "string"
                                    ? company.photo
                                    : `${EP.API_ASSETS_BASE}${
                                        (company.photo as any).path
                                      }`
                                }
                                alt={company.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <Building className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {company.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {company.address}
                            </div>
                            {company.email && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {company.email}
                              </div>
                            )}
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={(e) =>
                                handleFollowClick(e, "company", company._id)
                              }
                              disabled={!company._id || !canFollow}
                              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                                isFollowedOptimistic("company", company._id)
                                  ? "border-red-200 text-red-600 dark:border-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  : "border-cyan-200 text-cyan-700 dark:border-cyan-800 dark:text-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
                              } ${
                                !company._id || !canFollow
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >
                              {pendingFollowIds.has(
                                `follow-company-${company._id}`
                              ) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : followSuccessIds.has(
                                  `follow-company-${company._id}`
                                ) ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isFollowedOptimistic(
                                  "company",
                                  company._id
                                ) ? (
                                "Unfollow"
                              ) : (
                                "Follow"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (selectedType === "club") {
                    const club = result as Club;
                    return (
                      <div
                        key={club._id}
                        onClick={() => handleClubSelect(club)}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                            {club.photo ? (
                              <img
                                src={
                                  typeof club.photo === "string"
                                    ? club.photo
                                    : `${EP.API_ASSETS_BASE}/${
                                        (club.photo as any).path
                                      }`.replace(/\\/g, "/")
                                }
                                alt={club.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {club.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {club.vision || "Sports club"}
                            </div>
                            <div className="flex gap-1 mt-1">
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                                Club
                              </span>
                              {club.isApproved && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs rounded-full">
                                  Approved
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={(e) =>
                                handleFollowClick(e, "club", club._id)
                              }
                              disabled={!club._id || !canFollow}
                              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                                isFollowedOptimistic("club", club._id)
                                  ? "border-red-200 text-red-600 dark:border-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  : "border-cyan-200 text-cyan-700 dark:border-cyan-800 dark:text-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
                              } ${
                                !club._id || !canFollow
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >
                              {pendingFollowIds.has(
                                `follow-club-${club._id}`
                              ) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : followSuccessIds.has(
                                  `follow-club-${club._id}`
                                ) ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isFollowedOptimistic("club", club._id) ? (
                                "Unfollow"
                              ) : (
                                "Follow"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (selectedType === "group") {
                    const group = result as Group;
                    return (
                      <div
                        key={group._id}
                        onClick={() => handleGroupSelect(group)}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                            {group.photo ? (
                              <img
                                src={
                                  typeof group.photo === "string"
                                    ? group.photo
                                    : `${EP.API_ASSETS_BASE}/${
                                        (group.photo as any).path
                                      }`.replace(/\\/g, "/")
                                }
                                alt={group.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {group.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {group.clubName}
                            </div>
                            <div className="flex gap-1 mt-1">
                              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-xs rounded-full">
                                Group
                              </span>
                              {group.isApproved && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs rounded-full">
                                  Approved
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={(e) =>
                                handleFollowClick(e, "group", group._id)
                              }
                              disabled={!group._id || !canFollow}
                              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                                isFollowedOptimistic("group", group._id)
                                  ? "border-red-200 text-red-600 dark:border-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  : "border-cyan-200 text-cyan-700 dark:border-cyan-800 dark:text-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
                              } ${
                                !group._id || !canFollow
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >
                              {pendingFollowIds.has(
                                `follow-group-${group._id}`
                              ) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : followSuccessIds.has(
                                  `follow-group-${group._id}`
                                ) ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isFollowedOptimistic("group", group._id) ? (
                                "Unfollow"
                              ) : (
                                "Follow"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.perPage && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(pagination.currentPage - 1) * pagination.perPage + 1}{" "}
                to{" "}
                {Math.min(
                  pagination.currentPage * pagination.perPage,
                  pagination.total
                )}{" "}
                of {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfile}
        onClose={handleCloseUserProfile}
        userId={selectedUserId}
        context={selectedUserContext}
      />

      {/* Facility Details Modal */}
      <FacilityDetailsModal
        isOpen={showFacilityDetails}
        onClose={handleCloseFacilityDetails}
        facility={selectedFacility}
      />

      {/* Company Details Modal */}
      <CompanyDetailsModal
        isOpen={showCompanyDetails}
        onClose={handleCloseCompanyDetails}
        company={selectedCompany}
      />

      {/* Club Details Modal */}
      <ClubViewModal
        isOpen={showClubDetails}
        onClose={handleCloseClubDetails}
        club={selectedClub}
      />

      {/* Group Details Modal */}
      <GroupViewModal
        isOpen={showGroupDetails}
        onClose={handleCloseGroupDetails}
        group={selectedGroup}
      />
    </div>
  );
};

export default FindModal;
