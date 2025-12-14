"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Activity,
  Users,
  Settings,
  User,
  Home,
  Building,
  LogOut,
  ChevronRight,
  X,
  Trash2,
  Edit,
  Check,
  Calendar,
  Camera,
  Loader2,
  Shield,
  Layers,
  Heart,
} from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ParticipantModal from "./ParticipantModal";
import CoachModal from "./CoachModal";
import FacilityModal from "./FacilityModal";
import CompanyModal from "./CompanyModal";
import ClubModal from "./ClubModal";
import GroupModal from "./GroupModal";
import FindModal from "./FindModal";
import {
  getFacilities,
  getSports,
  createFacility,
  updateFacility,
  deleteFacility,
  getSalons,
  deleteSalon,
  Facility,
} from "@/app/lib/facility-api";
import {
  getCreatedClubs,
  getCreatedGroups,
  createClub,
  updateClub,
  deleteClub,
  createGroup,
  updateGroup,
  deleteGroup,
} from "@/app/lib/club-api";
import { editUserPhoto } from "@/app/lib/auth-api";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import FacilityDetailsModal from "./FacilityDetailsModal";
import UserProfileModal from "@/components/UserProfileModal";
import ViewEventModal from "@/components/event/ViewEventModal";
import { EP } from "@/app/lib/endpoints";
import { defaultFavorites, useFavorites } from "@/app/hooks/useFavorites";
import { useFollows } from "@/app/hooks/useFollows";

interface ProfileSidebarProps {
  onLogout: () => void;
  onShowCalendar?: () => void;
  onShowFollowings?: () => void;
  onShowFavorites?: () => void;
  initialFacilities?: any[];
  initialCompanies?: any[];
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  onLogout,
  onShowCalendar,
  onShowFollowings,
  onShowFavorites,
  initialFacilities = [],
  initialCompanies = [],
}) => {
  const router = useRouter();
  const { data: user } = useMe();
  const queryClient = useQueryClient();
  const hasCoachProfile = !!user?.coach;

  const [activePanel, setActivePanel] = useState<"home" | "profile">("home");
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);

  const [isFacilitiesListOpen, setIsFacilitiesListOpen] = useState(false);
  const [isClubsListOpen, setIsClubsListOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupsListOpen, setIsGroupsListOpen] = useState(false);

  const { data: allFacilities = [] } = useQuery({
    queryKey: ["facilities"],
    queryFn: () => getFacilities(),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: sports = [] } = useQuery({
    queryKey: ["reference", "sports"],
    queryFn: () => getSports(1, 100),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { data: myClubsData } = useQuery({
    queryKey: ["my-clubs", user?._id],
    queryFn: () => getCreatedClubs(user?._id || ""),
    enabled: !!user?._id,
  });

  // For groups, we need the coach._id
  const coachId =
    user?.coach?._id || (typeof user?.coach === "string" ? user?.coach : null);

  const { data: myGroupsData } = useQuery({
    queryKey: ["my-groups", coachId],
    queryFn: () => {
      console.log("Fetching groups for coach ID:", coachId);
      return getCreatedGroups(coachId || "");
    },
    enabled: !!coachId && !!hasCoachProfile,
  });

  const myClubs = myClubsData?.data || [];
  const myGroups = myGroupsData?.data || [];

  const { data: favoritesData } = useFavorites();
  const favorites = favoritesData?.data || defaultFavorites;
  const totalFavorites =
    (favorites.coach?.length || 0) +
    (favorites.facility?.length || 0) +
    (favorites.event?.length || 0);

  const { data: followsData } = useFollows();
  const totalFollows = followsData?.counts?.total || 0;

  const facilities = React.useMemo(() => {
    if (!user?.facility || !Array.isArray(user.facility)) return [];
    return allFacilities.filter((facility: Facility) =>
      user.facility.includes(facility._id)
    );
  }, [allFacilities, user?.facility]);

  const createFacilityMutation = useMutation({
    mutationFn: createFacility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const updateFacilityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateFacility(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    facilityId: "",
    isLoading: false,
    isSuccess: false,
    error: "",
  });

  const deleteFacilityMutation = useMutation({
    mutationFn: deleteFacility,
    onMutate: () => {
      setDeleteModalState((prev) => ({ ...prev, isLoading: true, error: "" }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setDeleteModalState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
      }));
      setTimeout(() => {
        setDeleteModalState((prev) => ({
          ...prev,
          isOpen: false,
          isSuccess: false,
          facilityId: "",
        }));
      }, 1500);
    },
    onError: () => {
      setDeleteModalState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to delete facility. Please try again.",
      }));
    },
  });

  const [editingFacility, setEditingFacility] = useState<any | null>(null);
  const [editingClub, setEditingClub] = useState<any | null>(null);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isCompaniesListOpen, setIsCompaniesListOpen] = useState(false);
  const [companies, setCompanies] = useState<any[]>(initialCompanies);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [photoDeleteModalState, setPhotoDeleteModalState] = useState({
    isOpen: false,
    isLoading: false,
    isSuccess: false,
    error: "",
  });

  // Load facilities and companies from user data
  useEffect(() => {
    if (user?.facility) {
    }
    if (user?.company) {
      setCompanies(user.company);
    }
  }, [user]);

  const handleCreateParticipant = async (formData: any) => {
    console.log("Participant profile saved:", formData);
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  };

  const handleCreateCoach = async (formData: any) => {
    console.log("Coach profile saved:", formData);
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    setIsCoachModalOpen(false);
  };

  const handleOpenCoachModal = () => {
    setIsCoachModalOpen(true);
  };

  const handleCloseCoachModal = () => {
    setIsCoachModalOpen(false);
  };

  const handleCreateFacility = async (formData: FormData) => {
    try {
      if (editingFacility) {
        return await updateFacilityMutation.mutateAsync({
          id: editingFacility._id,
          data: formData,
        });
      } else {
        return await createFacilityMutation.mutateAsync(formData);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleOpenFacilityModal = () => {
    setIsFacilityModalOpen(true);
  };

  const handleCloseFacilityModal = () => {
    setIsFacilityModalOpen(false);
    setEditingFacility(null);
  };

  const handleFacilityAdd = () => {
    setEditingFacility(null);
    handleOpenFacilityModal();
  };

  const handleEditFacility = (facility: any) => {
    setEditingFacility(facility);
    setIsFacilityModalOpen(true);
  };

  const handleDeleteFacility = (facilityId: string) => {
    setDeleteModalState({
      isOpen: true,
      facilityId,
      isLoading: false,
      isSuccess: false,
      error: "",
    });
  };

  const confirmDeleteFacility = async () => {
    if (deleteModalState.facilityId) {
      try {
        setDeleteModalState((prev) => ({
          ...prev,
          isLoading: true,
          error: "",
        }));

        // 1. Fetch all salons for this facility
        const salons = await getSalons(deleteModalState.facilityId, 1, 100);

        // 2. Delete all salons
        if (salons.length > 0) {
          await Promise.all(salons.map((salon: any) => deleteSalon(salon._id)));
        }

        // 3. Delete the facility
        deleteFacilityMutation.mutate(deleteModalState.facilityId);
      } catch (error) {
        console.error("Error deleting facility and salons:", error);
        setDeleteModalState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to delete facility and its salons. Please try again.",
        }));
      }
    }
  };

  // Club mutations and handlers
  const createClubMutation = useMutation({
    mutationFn: createClub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-clubs"] });
    },
  });

  const updateClubMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateClub(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-clubs"] });
    },
  });

  const [deleteClubModalState, setDeleteClubModalState] = useState({
    isOpen: false,
    clubId: "",
    isLoading: false,
    isSuccess: false,
    error: "",
  });

  const deleteClubMutation = useMutation({
    mutationFn: deleteClub,
    onMutate: () => {
      setDeleteClubModalState((prev) => ({
        ...prev,
        isLoading: true,
        error: "",
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-clubs"] });
      setDeleteClubModalState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
      }));
      setTimeout(() => {
        setDeleteClubModalState((prev) => ({
          ...prev,
          isOpen: false,
          isSuccess: false,
          clubId: "",
        }));
      }, 1500);
    },
    onError: () => {
      setDeleteClubModalState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to delete club. Please try again.",
      }));
    },
  });

  // Group mutations and handlers
  const createGroupMutation = useMutation({
    mutationFn: ({
      clubId,
      formData,
    }: {
      clubId: string;
      formData: FormData;
    }) => createGroup(clubId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });

  const [deleteGroupModalState, setDeleteGroupModalState] = useState({
    isOpen: false,
    groupId: "",
    isLoading: false,
    isSuccess: false,
    error: "",
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onMutate: () => {
      setDeleteGroupModalState((prev) => ({
        ...prev,
        isLoading: true,
        error: "",
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      setDeleteGroupModalState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
      }));
      setTimeout(() => {
        setDeleteGroupModalState((prev) => ({
          ...prev,
          isOpen: false,
          isSuccess: false,
          groupId: "",
        }));
      }, 1500);
    },
    onError: () => {
      setDeleteGroupModalState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to delete group. Please try again.",
      }));
    },
  });

  const handleCreateClub = async (formData: FormData) => {
    try {
      if (editingClub) {
        return await updateClubMutation.mutateAsync({
          id: editingClub._id,
          data: formData,
        });
      } else {
        return await createClubMutation.mutateAsync(formData);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleOpenClubModal = () => {
    setIsClubModalOpen(true);
  };

  const handleCloseClubModal = () => {
    setIsClubModalOpen(false);
    setEditingClub(null);
  };

  const handleClubAdd = () => {
    setEditingClub(null);
    handleOpenClubModal();
  };

  const handleEditClub = (club: any) => {
    setEditingClub(club);
    setIsClubModalOpen(true);
  };

  const handleDeleteClub = (clubId: string) => {
    setDeleteClubModalState({
      isOpen: true,
      clubId,
      isLoading: false,
      isSuccess: false,
      error: "",
    });
  };

  const confirmDeleteClub = async () => {
    if (deleteClubModalState.clubId) {
      deleteClubMutation.mutate(deleteClubModalState.clubId);
    }
  };

  // Group handlers
  const handleCreateGroup = async (clubId: string, formData: FormData) => {
    try {
      if (editingGroup) {
        return await updateGroupMutation.mutateAsync({
          id: editingGroup._id,
          data: formData,
        });
      } else {
        return await createGroupMutation.mutateAsync({ clubId, formData });
      }
    } catch (error) {
      throw error;
    }
  };

  const handleOpenGroupModal = () => {
    setIsGroupModalOpen(true);
  };

  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false);
    setEditingGroup(null);
  };

  const handleGroupAdd = () => {
    setEditingGroup(null);
    handleOpenGroupModal();
  };

  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = (groupId: string) => {
    setDeleteGroupModalState({
      isOpen: true,
      groupId,
      isLoading: false,
      isSuccess: false,
      error: "",
    });
  };

  const confirmDeleteGroup = async () => {
    if (deleteGroupModalState.groupId) {
      deleteGroupMutation.mutate(deleteGroupModalState.groupId);
    }
  };

  const handleCreateCompany = async (formData: any) => {
    setIsLoadingCompanies(true);
    setCompanyError(null);

    try {
      const formDataToSend = new FormData();

      // Convert base64 image to File if photo exists
      if (formData.photo && formData.photo.startsWith("data:image")) {
        const response = await fetch(formData.photo);
        const blob = await response.blob();
        const file = new File([blob], "company-photo.jpg", {
          type: "image/jpeg",
        });
        formDataToSend.append("company-photo", file);
      }

      formDataToSend.append("name", formData.name);
      formDataToSend.append("address", formData.address);
      if (formData.phone) formDataToSend.append("phone", formData.phone);
      if (formData.email) formDataToSend.append("email", formData.email);

      let response;
      if (editingCompany) {
        // Edit existing company
        response = await fetch(EP.COMPANY.editCompany(editingCompany._id), {
          method: "PUT",
          body: formDataToSend,
          credentials: "include",
        });
      } else {
        // Create new company
        response = await fetch(EP.COMPANY.createCompany, {
          method: "POST",
          body: formDataToSend,
          credentials: "include",
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save company");
      }

      const result = await response.json();

      if (result.success) {
        // Refresh user data to get updated companies
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        setEditingCompany(null);
      } else {
        throw new Error(result.message || "Failed to save company");
      }
    } catch (error) {
      console.error("Error saving company:", error);
      setCompanyError(
        error instanceof Error ? error.message : "Failed to save company"
      );
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleOpenCompanyModal = () => {
    setIsCompanyModalOpen(true);
  };

  const handleCloseCompanyModal = () => {
    setIsCompanyModalOpen(false);
    setEditingCompany(null);
  };

  const handleCompanyAdd = () => {
    setEditingCompany(null);
    handleOpenCompanyModal();
  };

  const handleEditCompany = (company: any) => {
    setEditingCompany(company);
    setIsCompanyModalOpen(true);
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return;

    setIsLoadingCompanies(true);
    setCompanyError(null);

    try {
      const response = await fetch(EP.COMPANY.deleteCompany(companyId), {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete company");
      }

      const result = await response.json();

      if (result.success) {
        // Refresh user data to get updated companies
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      } else {
        throw new Error(result.message || "Failed to delete company");
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      setCompanyError(
        error instanceof Error ? error.message : "Failed to delete company"
      );
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append("user-photo", file);
      const result = await editUserPhoto(formData);

      // Optimistically update cache with new photo data
      if (result && result.photo) {
        queryClient.setQueryData(["auth", "me"], (oldUser: any) => {
          if (!oldUser) return oldUser;
          return { ...oldUser, photo: result.photo };
        });
      } else {
        // Fallback if no data returned (though expected)
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    } catch (error) {
      console.error("Failed to upload photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setIsPhotoLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePhotoDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPhotoDeleteModalState({
      isOpen: true,
      isLoading: false,
      isSuccess: false,
      error: "",
    });
  };

  const confirmDeletePhoto = async () => {
    setPhotoDeleteModalState((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
    }));
    try {
      const formData = new FormData();
      await editUserPhoto(formData);

      // Optimistically update cache to remove photo
      queryClient.setQueryData(["auth", "me"], (oldUser: any) => {
        if (!oldUser) return oldUser;
        return { ...oldUser, photo: null };
      });

      setPhotoDeleteModalState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
      }));

      setTimeout(() => {
        setPhotoDeleteModalState((prev) => ({
          ...prev,
          isOpen: false,
          isSuccess: false,
        }));
      }, 1500);
    } catch (error) {
      console.error("Failed to delete photo:", error);
      setPhotoDeleteModalState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to delete photo. Please try again.",
      }));
    }
  };

  const showHomePanel = () => setActivePanel("home");
  const showProfilePanel = () => setActivePanel("profile");

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-lg sm:text-xl font-bold text-cyan-500">
          Events Dashboard
        </h1>
      </div>

      <div className="flex flex-col items-center mb-6 sm:mb-8">
        <div className="relative group">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-3 overflow-hidden bg-gray-100 dark:bg-gray-700">
            {isPhotoLoading ? (
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            ) : user?.photo ? (
              <img
                src={`${EP.API_ASSETS_BASE}/${user.photo.path}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-green-500 flex items-center justify-center">
                <div className="text-white text-3xl sm:text-4xl">😊</div>
              </div>
            )}
          </div>

          {/* Coach Badge */}
          {hasCoachProfile && (
            <div
              className="absolute -top-2 -right-2 z-20 w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-600"
              title="Coach"
            >
              <img
                src="/assets/coach-badge.png"
                alt="Coach Badge"
                className="w-8 h-8 object-contain"
              />
            </div>
          )}

          {/* Edit/Delete Overlay */}
          {!isPhotoLoading && (
            <div className="absolute bottom-0 -right-2 flex gap-1 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="p-1.5 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                title="Change Photo"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              {user?.photo && (
                <button
                  onClick={handlePhotoDelete}
                  className="p-1.5 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handlePhotoUpload}
          />
        </div>
        <h2 className="font-semibold text-gray-800 dark:text-white">
          {user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`
            : "User"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {user?.email || ""}
        </p>
      </div>

      <div className="flex justify-between mb-6 sm:mb-8 text-center gap-3">
        <button
          onClick={() => {
            if (onShowFavorites) {
              onShowFavorites();
            } else {
              router.push("/favorites");
            }
          }}
          className="flex-1 flex flex-col items-center border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          <div className="font-bold text-gray-800 dark:text-white text-sm sm:text-base flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-500" />
            {totalFavorites}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Favorites
          </div>
        </button>
        <button
          onClick={() => {
            if (onShowFollowings) {
              onShowFollowings();
            } else {
              router.push("/followings");
            }
          }}
          className="flex-1 flex flex-col items-center border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          <div className="font-bold text-gray-800 dark:text-white text-sm sm:text-base flex items-center gap-1">
            <Users className="w-4 h-4 text-cyan-500" />
            {totalFollows}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Following
          </div>
        </button>
      </div>

      {activePanel === "home" ? (
        <>
          <nav className="space-y-1">
            <button
              onClick={showProfilePanel}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-cyan-500" />
              <div className="flex-1 text-left">
                <div className="font-semibold">Profile</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  View and edit your account
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>

            <button
              onClick={() => setIsFindModalOpen(true)}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <div>Find</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Search coaches, facilities...
                </div>
              </div>
            </button>

            {hasCoachProfile && onShowCalendar && (
              <button
                onClick={onShowCalendar}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Calendar className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
                <div className="flex-1 text-left">
                  <div>My Calendar</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    View events & schedules
                  </div>
                </div>
              </button>
            )}

            <a
              href="#"
              className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Activity className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
              Activity
            </a>
            <button
              onClick={() => {
                if (onShowFollowings) {
                  onShowFollowings();
                } else {
                  router.push("/followings");
                }
              }}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <Users className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
              Following
            </button>
            <a
              href="#"
              className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
              Settings
            </a>
          </nav>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={showHomePanel}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </button>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Profile
              </div>
              <div className="text-sm font-semibold text-gray-800 dark:text-white">
                Account details
              </div>
            </div>
          </div>

          <ParticipantModal
            renderInline
            onClose={() => {}}
            onSubmit={handleCreateParticipant}
          />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
              Need specialized accounts?
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add or edit your coach profile and manage facility, salon, club,
              or group resources.
            </p>

            <div className="space-y-2">
              <button
                onClick={handleOpenCoachModal}
                className={`w-full bg-white dark:bg-gray-800 border rounded-lg p-3 transition-all group ${
                  hasCoachProfile
                    ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30"
                    : "border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded-md ${
                      hasCoachProfile
                        ? "bg-green-100 dark:bg-green-900/50"
                        : "bg-orange-100 dark:bg-orange-900/50"
                    }`}
                  >
                    <Users
                      className={`w-4 h-4 ${
                        hasCoachProfile
                          ? "text-green-600 dark:text-green-400"
                          : "text-orange-600 dark:text-orange-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-white text-sm">
                      {hasCoachProfile
                        ? "Edit Coach Profile"
                        : "Apply for Coaching"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      {hasCoachProfile ? (
                        <>
                          <span className="inline-flex items-center text-green-600 dark:text-green-400">
                            <Check className="w-3 h-3 mr-0.5" />
                            Added
                          </span>
                          <span className="text-gray-400 dark:text-gray-500">
                            ·
                          </span>
                          <span>Edit your credentials</span>
                        </>
                      ) : (
                        "Become a coach and share your expertise"
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${
                      hasCoachProfile
                        ? "group-hover:text-green-600 dark:group-hover:text-green-400"
                        : "group-hover:text-orange-600 dark:group-hover:text-orange-400"
                    }`}
                  />
                </div>
              </button>

              <button
                onClick={() => setIsFacilitiesListOpen(true)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg p-3 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-cyan-50 dark:bg-cyan-900/50 p-1.5 rounded-md group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/70">
                    <Home className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white text-sm">
                      My Facilities
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {facilities.length}{" "}
                      {facilities.length === 1 ? "facility" : "facilities"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
              </button>

              <button
                onClick={() => setIsCompaniesListOpen(true)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg p-3 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-cyan-50 dark:bg-cyan-900/50 p-1.5 rounded-md group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/70">
                    <Building className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white text-sm">
                      My Companies
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {companies.length}{" "}
                      {companies.length === 1 ? "company" : "companies"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
              </button>

              <button
                onClick={() => setIsClubsListOpen(true)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg p-3 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-cyan-50 dark:bg-cyan-900/50 p-1.5 rounded-md group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/70">
                    <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white text-sm">
                      My Clubs
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {myClubs.length} {myClubs.length === 1 ? "club" : "clubs"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
              </button>

              {hasCoachProfile && (
                <button
                  onClick={() => setIsGroupsListOpen(true)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg p-3 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-cyan-50 dark:bg-cyan-900/50 p-1.5 rounded-md group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/70">
                      <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white text-sm">
                        My Groups
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {myGroups.length}{" "}
                        {myGroups.length === 1 ? "group" : "groups"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coach Modal */}
      <CoachModal
        isOpen={isCoachModalOpen}
        onClose={handleCloseCoachModal}
        onSubmit={handleCreateCoach}
      />

      {/* Facility Modal */}
      <FacilityModal
        isOpen={isFacilityModalOpen}
        onClose={handleCloseFacilityModal}
        onSubmit={handleCreateFacility}
        initialData={editingFacility}
      />

      {/* Club Modal */}
      <ClubModal
        isOpen={isClubModalOpen}
        onClose={handleCloseClubModal}
        onSubmit={handleCreateClub}
        initialData={editingClub}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() =>
          setDeleteModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={confirmDeleteFacility}
        isLoading={deleteModalState.isLoading}
        isSuccess={deleteModalState.isSuccess}
        error={deleteModalState.error}
        title="Delete Facility"
        message="Are you sure you want to delete this facility? This action cannot be undone."
      />

      <DeleteConfirmationModal
        isOpen={deleteClubModalState.isOpen}
        onClose={() =>
          setDeleteClubModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={confirmDeleteClub}
        isLoading={deleteClubModalState.isLoading}
        isSuccess={deleteClubModalState.isSuccess}
        error={deleteClubModalState.error}
        title="Delete Club"
        message="Are you sure you want to delete this club? This action cannot be undone."
      />

      <DeleteConfirmationModal
        isOpen={photoDeleteModalState.isOpen}
        onClose={() =>
          setPhotoDeleteModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={confirmDeletePhoto}
        isLoading={photoDeleteModalState.isLoading}
        isSuccess={photoDeleteModalState.isSuccess}
        error={photoDeleteModalState.error}
        title="Delete Profile Photo"
        message="Are you sure you want to delete your profile photo? This action cannot be undone."
      />

      {/* Facilities List Modal */}
      {isFacilitiesListOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                My Facilities
              </h2>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setIsFacilitiesListOpen(false);
                    handleFacilityAdd();
                  }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
                >
                  <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Facility</span>
                  <span className="sm:hidden">Add</span>
                </button>
                <button
                  onClick={() => setIsFacilitiesListOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 dark:bg-gray-800">
              {facilityError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
                  {facilityError}
                </div>
              )}
              {facilities.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Home className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm mb-2">No facilities yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Click "Add Facility" to create your first facility
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {facilities.map((facility: Facility) => (
                    <div
                      key={facility._id}
                      onClick={() => {
                        // Transform API data to form data structure
                        const editData = {
                          ...facility,
                          isPrivate: facility.private || false,
                          photo: facility.photo
                            ? `${EP.API_ASSETS_BASE}/${facility.photo.path}`
                            : "",
                        };
                        handleEditFacility(editData);
                        setIsFacilitiesListOpen(false);
                      }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow relative cursor-pointer hover:border-cyan-300 dark:hover:border-cyan-700 bg-white dark:bg-gray-700"
                    >
                      {/* Delete Button */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1.5 sm:gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFacility(facility._id);
                          }}
                          className="p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {facility.photo && (
                        <img
                          src={`${EP.API_ASSETS_BASE}/${facility.photo.path}`}
                          alt={facility.name}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-gray-800 dark:text-white text-base sm:text-lg mb-2 pr-16 sm:pr-20">
                        {facility.name}
                        {facility.private && (
                          <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 px-2 py-1 rounded">
                            Private
                          </span>
                        )}
                      </h3>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex items-start">
                          <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                            Address:
                          </span>
                          <span className="text-gray-800 dark:text-gray-200 flex-1">
                            {facility.address}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                            Phone:
                          </span>
                          <span className="text-gray-800 dark:text-gray-200">
                            {facility.phone}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                            Email:
                          </span>
                          <span className="text-gray-800 dark:text-gray-200 break-all">
                            {facility.email}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                            Main Sport:
                          </span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                            {/* We might need to fetch sport name if mainSport is just ID */}
                            {/* For now displaying ID or if populated name */}
                            {(() => {
                              const sportId =
                                typeof facility.mainSport === "object"
                                  ? (facility.mainSport as any)._id
                                  : facility.mainSport;
                              const sport = sports.find(
                                (s: any) => s._id === sportId
                              );
                              return sport
                                ? sport.name
                                : typeof facility.mainSport === "object"
                                ? (facility.mainSport as any).name
                                : facility.mainSport;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => setIsFacilitiesListOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Modal */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={handleCloseCompanyModal}
        onSubmit={handleCreateCompany}
        initialData={editingCompany}
      />

      {/* Companies List Modal */}
      {isCompaniesListOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                My Companies
              </h2>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setIsCompaniesListOpen(false);
                    handleCompanyAdd();
                  }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
                >
                  <Building className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Company</span>
                  <span className="sm:hidden">Add</span>
                </button>
                <button
                  onClick={() => setIsCompaniesListOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 dark:bg-gray-800">
              {companyError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
                  {companyError}
                </div>
              )}
              {companies.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Building className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm mb-2">No companies yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Click "Add Company" to create your first company
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow relative bg-white dark:bg-gray-700"
                    >
                      {/* Edit and Delete Buttons */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1.5 sm:gap-2">
                        <button
                          onClick={() => {
                            handleEditCompany(company);
                            setIsCompaniesListOpen(false);
                          }}
                          className="p-1.5 sm:p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {company.photo && (
                        <img
                          src={company.photo}
                          alt={company.name}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-gray-800 dark:text-white text-base sm:text-lg mb-2 pr-16 sm:pr-20">
                        {company.name}
                      </h3>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex items-start">
                          <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                            Address:
                          </span>
                          <span className="text-gray-800 dark:text-gray-200 flex-1">
                            {company.address}
                          </span>
                        </div>
                        {company.phone && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                              Phone:
                            </span>
                            <span className="text-gray-800 dark:text-gray-200">
                              {company.phone}
                            </span>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                              Email:
                            </span>
                            <span className="text-gray-800 dark:text-gray-200 break-all">
                              {company.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => setIsCompaniesListOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clubs List Modal */}
      {isClubsListOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                My Clubs
              </h2>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setIsClubsListOpen(false);
                    handleClubAdd();
                  }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
                >
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Club</span>
                  <span className="sm:hidden">Add</span>
                </button>
                <button
                  onClick={() => setIsClubsListOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 dark:bg-gray-800">
              {myClubs.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm mb-2">No clubs yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    You haven't created any clubs
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {myClubs.map((club) => (
                    <div
                      key={club._id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow relative cursor-pointer hover:border-cyan-300 dark:hover:border-cyan-700 bg-white dark:bg-gray-700"
                      onClick={() => {
                        // Transform API data to form data structure
                        const editData = {
                          ...club,
                          photo: club.photo
                            ? `${EP.API_ASSETS_BASE}/${club.photo.path}`
                            : "",
                        };
                        handleEditClub(editData);
                        setIsClubsListOpen(false);
                      }}
                    >
                      {/* Delete Button */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1.5 sm:gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClub(club._id);
                          }}
                          className="p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {club.photo ? (
                        <img
                          src={`${EP.API_ASSETS_BASE}/${club.photo.path}`}
                          alt={club.name}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gray-100 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center">
                          <Shield className="w-16 h-16 text-gray-300 dark:text-gray-500" />
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-800 dark:text-white text-base sm:text-lg mb-2 pr-16 sm:pr-20">
                        {club.name}
                        {club.isApproved && (
                          <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                            Approved
                          </span>
                        )}
                        {!club.isApproved && (
                          <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">
                            Pending
                          </span>
                        )}
                      </h3>
                      <div className="space-y-2 text-xs sm:text-sm">
                        {club.vision && (
                          <div className="flex items-start">
                            <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                              Vision:
                            </span>
                            <span className="text-gray-800 dark:text-gray-200 flex-1 line-clamp-2">
                              {club.vision}
                            </span>
                          </div>
                        )}
                        {club.conditions && (
                          <div className="flex items-start">
                            <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                              Conditions:
                            </span>
                            <span className="text-gray-800 dark:text-gray-200 flex-1 line-clamp-2">
                              {club.conditions}
                            </span>
                          </div>
                        )}
                        {club.coaches && club.coaches.length > 0 && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                              Coaches:
                            </span>
                            <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                              {club.coaches.length} coach
                              {club.coaches.length !== 1 ? "es" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => setIsClubsListOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups List Modal */}
      {isGroupsListOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                My Groups
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGroupAdd}
                  className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  <span>Add Group</span>
                </button>
                <button
                  onClick={() => setIsGroupsListOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 dark:bg-gray-800">
              {myGroups.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm mb-2">No groups yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    You haven't created any groups
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {myGroups.map((group) => (
                    <div
                      key={group._id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow relative cursor-pointer hover:border-cyan-300 dark:hover:border-cyan-700 bg-white dark:bg-gray-700"
                      onClick={() => {
                        const editData = {
                          ...group,
                          club: group.clubId,
                          clubName: group.clubName,
                          photo: group.photo
                            ? `${EP.API_ASSETS_BASE}/${group.photo.path}`
                            : "",
                        };
                        handleEditGroup(editData);
                        setIsGroupsListOpen(false);
                      }}
                    >
                      {/* Delete Button */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1.5 sm:gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group._id);
                          }}
                          className="p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {group.photo ? (
                        <img
                          src={`${EP.API_ASSETS_BASE}/${group.photo.path}`}
                          alt={group.name}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gray-100 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center">
                          <Layers className="w-16 h-16 text-gray-300 dark:text-gray-500" />
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-800 dark:text-white text-base sm:text-lg mb-2 pr-16 sm:pr-20">
                        {group.name}
                        {group.isApproved && (
                          <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                            Approved
                          </span>
                        )}
                        {!group.isApproved && (
                          <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">
                            Pending
                          </span>
                        )}
                      </h3>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                            Club:
                          </span>
                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                            {group.clubName || "Unknown Club"}
                          </span>
                        </div>
                        {group.description && (
                          <div className="flex items-start">
                            <span className="font-medium text-gray-600 dark:text-gray-400 w-20 sm:w-24">
                              Description:
                            </span>
                            <span className="text-gray-800 dark:text-gray-200 flex-1 line-clamp-2">
                              {group.description}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => setIsGroupsListOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorites now live on /favorites page */}

      {/* Logout Button at Bottom */}
      <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Club Modal */}
      <ClubModal
        isOpen={isClubModalOpen}
        onClose={handleCloseClubModal}
        onSubmit={handleCreateClub}
        initialData={editingClub}
      />

      {/* Club Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteClubModalState.isOpen}
        onClose={() =>
          setDeleteClubModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={confirmDeleteClub}
        title="Delete Club"
        message="Are you sure you want to delete this club? This action cannot be undone."
        isLoading={deleteClubModalState.isLoading}
        isSuccess={deleteClubModalState.isSuccess}
        error={deleteClubModalState.error}
      />

      {/* Group Modal */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={handleCloseGroupModal}
        onSubmit={handleCreateGroup}
        initialData={editingGroup}
        userId={user?._id}
      />

      {/* Group Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteGroupModalState.isOpen}
        onClose={() =>
          setDeleteGroupModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={confirmDeleteGroup}
        title="Delete Group"
        message="Are you sure you want to delete this group? This action cannot be undone."
        isLoading={deleteGroupModalState.isLoading}
        isSuccess={deleteGroupModalState.isSuccess}
        error={deleteGroupModalState.error}
      />

      {/* Find Modal */}
      <FindModal
        isOpen={isFindModalOpen}
        onClose={() => setIsFindModalOpen(false)}
      />
    </div>
  );
};

export default ProfileSidebar;
