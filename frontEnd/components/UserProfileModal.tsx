"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Trophy,
  Target,
  Award,
  Building,
  Users,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  MapPin,
  DollarSign,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import {
  User as UserType,
  UserDetailsResponse,
  SportGoal,
  SportGoalResponse,
  CoachDetails,
  CoachDetailsResponse,
} from "@/app/lib/types";
import ClubViewModal from "@/components/ClubViewModal";
import GroupViewModal from "@/components/GroupViewModal";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  context?: "coach" | "participant" | "facility" | "company";
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  context,
}) => {
  const { data: currentUser } = useMe();
  const [user, setUser] = useState<UserType | null>(null);
  const [mainSport, setMainSport] = useState<string>("");
  const [sportGoal, setSportGoal] = useState<SportGoal | null>(null);
  const [coachDetails, setCoachDetails] = useState<CoachDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExtras, setIsLoadingExtras] = useState(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states for clubs and groups
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails(userId);
    } else if (!isOpen) {
      // Reset state when modal closes
      setUser(null);
      setMainSport("");
      setSportGoal(null);
      setCoachDetails(null);
      setIsFullyLoaded(false);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (user) {
      fetchExtraData();
    }
  }, [user]);

  const fetchUserDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let response;

      // Use different endpoints based on context
      if (context === "participant") {
        // For participants, use participant details endpoint
        response = await fetchJSON(EP.PARTICIPANT.getDetails(id));
        if (response?.success && response?.data) {
          // The participant details endpoint returns { user: [...], participant: {...} }
          const userData = response.data.user[0];
          const participantData = response.data.participant;

          if (userData && participantData) {
            // Merge user and participant data for display
            const mergedUser = {
              ...userData,
              participant: {
                _id: participantData._id,
                mainSport: participantData.mainSport?._id,
                skillLevel: participantData.skillLevel,
                membershipLevel: participantData.membershipLevel || "Standard",
                point: participantData.point || 0,
                sportGoal: participantData.sportGoal?._id,
              },
            };
            setUser(mergedUser);
            // Set main sport name for display
            setMainSport(participantData.mainSport?.name || "Unknown Sport");
            // Set sport goal for display
            if (participantData.sportGoal) {
              setSportGoal(participantData.sportGoal);
            }
          } else {
            throw new Error("User or participant data not found");
          }
        }
      } else {
        // For coaches, use the coach details endpoint (includes user data)
        response = await fetchJSON(EP.COACH.getCoachById(id));
        if (response?.success && response?.data) {
          // The coach details endpoint returns comprehensive data
          const coachData = response.data.coach;
          const userData = response.data.user;

          if (userData && coachData) {
            // Merge user and coach data for display
            const mergedUser = {
              ...userData,
              coach: coachData,
            };
            setUser(mergedUser);

            // Set coach details for additional display
            setCoachDetails({
              coach: coachData,
              user: [userData], // Array format as expected by interface
              club: response.data.club || [],
              clubGroup: response.data.clubGroup || [],
              branch: response.data.branch || [],
              event: response.data.event || [],
            });
          } else {
            throw new Error("Coach or user data not found");
          }
        } else {
          setError(response?.message || "Failed to load coach details");
        }
      }
    } catch (err) {
      setError("An error occurred while loading user details");
      console.error("Error loading user details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExtraData = async () => {
    if (!user) return;

    setIsLoadingExtras(true);

    // Check if we need to load any extra data
    const needsSportData =
      user.participant?.mainSport || user.participant?.sportGoal;
    const needsCoachData = user.coach?._id;

    if (!needsSportData && !needsCoachData) {
      // No extra data to load, mark as fully loaded
      setIsLoadingExtras(false);
      setIsFullyLoaded(true);
      return;
    }

    try {
      // Fetch main sport name if participant exists and context allows it
      if (
        user.participant?.mainSport &&
        (!context || context === "participant")
      ) {
        const sportResponse = await fetchJSON(EP.REFERENCE.sportGroup.get, {
          method: "POST",
          body: { sport: user.participant.mainSport },
        });

        if (sportResponse?.success && sportResponse?.data?.length > 0) {
          setMainSport(sportResponse.data[0].name);
        }
      }

      // Fetch sport goal details if participant exists and context allows it
      if (
        user.participant?.sportGoal &&
        (!context || context === "participant")
      ) {
        const sportGoalResponse: SportGoalResponse = await fetchJSON(
          EP.REFERENCE.sportGoal.get,
          {
            method: "POST",
            body: { sportGoal: user.participant.sportGoal },
          }
        );

        if (
          sportGoalResponse?.success &&
          sportGoalResponse?.data &&
          Array.isArray(sportGoalResponse.data) &&
          sportGoalResponse.data.length > 0
        ) {
          setSportGoal(sportGoalResponse.data[0]);
        }
      }

      // Fetch coach details if coach exists and context allows it
      if (user.coach?._id && (!context || context === "coach")) {
        const coachResponse: CoachDetailsResponse = await fetchJSON(
          EP.COACH.getCoachById(user.coach._id)
        );

        if (coachResponse?.success && coachResponse?.data) {
          setCoachDetails(coachResponse.data);
        }
      }
    } catch (err) {
      console.error("Error loading extra data:", err);
    } finally {
      setIsLoadingExtras(false);
      setIsFullyLoaded(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US");
  };

  const getImageUrl = (path: string) => {
    if (!path) return "";
    // Use API_ASSETS_BASE with the path from database
    // If path starts with /, use it directly, otherwise add /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${EP.API_ASSETS_BASE}${normalizedPath}`.replace(/\\/g, "/");
  };

  const isOwnerOrCreator = (resource: any, type: "club" | "group") => {
    if (!currentUser) return false;
    if (type === "club") {
      return resource.creator === currentUser._id;
    } else {
      return resource.owner === currentUser._id;
    }
  };

  const handleClubClick = (club: any) => {
    setSelectedClub(club);
    setIsClubModalOpen(true);
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleCloseClubModal = () => {
    setIsClubModalOpen(false);
    setSelectedClub(null);
  };

  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false);
    setSelectedGroup(null);
  };

  const getRoleName = (role: number) => {
    switch (role) {
      case 1:
        return "Regular User";
      case 2:
        return "Coach";
      case 3:
        return "Admin";
      default:
        return "Unknown";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                User Profile
              </h2>
            </div>
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
          {!isFullyLoaded ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 dark:text-red-400 py-8">
              {error}
            </div>
          ) : user ? (
            <div className="space-y-6">
              {/* User Avatar and Basic Info */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center">
                  {user.photo ? (
                    <img
                      src={`${EP.API_ASSETS_BASE}${user.photo}`}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {getRoleName(user.role)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Member since {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Date of Birth
                  </p>
                  <p className="font-medium dark:text-white">
                    {formatDate(user.age)}
                  </p>
                </div>
              </div>

              {/* Participant Details */}
              {user.participant && (!context || context === "participant") && (
                <div className="border-t dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    Participant Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                      <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Main Sport
                        </p>
                        <p className="font-medium dark:text-white">
                          {mainSport || user.participant.mainSport}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                      <Award className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Skill Level
                        </p>
                        <p className="font-medium dark:text-white">
                          {user.participant.skillLevel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                      <Trophy className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Points
                        </p>
                        <p className="font-medium dark:text-white">
                          {user.participant.point || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                      <Award className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Membership Level
                        </p>
                        <p className="font-medium dark:text-white">
                          {user.participant.membershipLevel || "Standard"}
                        </p>
                      </div>
                    </div>
                    {sportGoal && (
                      <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                        <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Sport Goal
                          </p>
                          <p className="font-medium dark:text-white">
                            {sportGoal.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Coach Information */}
              {(user.coach || coachDetails) &&
                (!context || context === "coach") && (
                  <div className="border-t dark:border-gray-700 pt-6">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Coach Information
                    </h4>

                    {/* Basic Coach Info */}
                    {user.coach && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Verification Status
                            </p>
                            <p className="font-medium dark:text-white">
                              {user.coach.isVerified
                                ? "Verified"
                                : "Pending Verification"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                          <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Membership Level
                            </p>
                            <p className="font-medium dark:text-white">
                              {user.coach.membershipLevel || "Standard"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                          <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Points
                            </p>
                            <p className="font-medium dark:text-white">
                              {user.coach.point || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Coach Branches */}
                    {coachDetails?.branch && coachDetails.branch.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-md font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                          Coaching Specialties ({coachDetails.branch.length})
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {coachDetails.branch.map((branch) => (
                            <div
                              key={branch._id}
                              className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg"
                            >
                              {branch.sport.icon?.path ? (
                                <img
                                  src={getImageUrl(branch.sport.icon.path)}
                                  alt={branch.sport.name}
                                  className="w-12 h-12 object-cover rounded-lg border dark:border-gray-600"
                                />
                              ) : (
                                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm dark:text-white">
                                  {branch.sport.name} - {branch.sport.groupName}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Level: {branch.level} • Order:{" "}
                                  {branch.branchOrder}
                                </p>
                                <div className="mt-1">
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                      branch.isApproved
                                        ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                        : branch.status === "Pending"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                                        : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                                    }`}
                                  >
                                    {branch.isApproved
                                      ? "Approved"
                                      : branch.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clubs Owned */}
                    {coachDetails?.club && coachDetails.club.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-md font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                          <Building className="w-4 h-4 text-green-600 dark:text-green-400" />
                          Owned Clubs ({coachDetails.club.length})
                        </h5>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {coachDetails.club.map((club) => (
                            <div
                              key={club._id}
                              className="bg-white dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                              onClick={() => handleClubClick(club)}
                            >
                              <div className="h-32 bg-gray-200 dark:bg-gray-600 relative overflow-hidden">
                                {club.photo?.path ? (
                                  <img
                                    src={getImageUrl(club.photo.path)}
                                    alt={club.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                                    <div className="text-center">
                                      <ShieldCheck className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-2" />
                                      <div className="text-xs font-medium text-green-700 dark:text-green-300">
                                        Club
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm">
                                  {club.isApproved ? "Approved" : "Pending"}
                                </div>
                              </div>
                              <div className="p-4">
                                <h6 className="font-bold text-gray-900 dark:text-white mb-1 truncate">
                                  {club.name}
                                </h6>
                                {club.vision && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                                    {club.vision}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  Created {formatDate(club.createdAt)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Club Groups Owned */}
                    {coachDetails?.clubGroup &&
                      coachDetails.clubGroup.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-md font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                            Owned Club Groups ({coachDetails.clubGroup.length})
                          </h5>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {coachDetails.clubGroup.map((group) => (
                              <div
                                key={group._id}
                                className="bg-white dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                                onClick={() => handleGroupClick(group)}
                              >
                                <div className="h-32 bg-gray-200 dark:bg-gray-600 relative overflow-hidden">
                                  {group.photo?.path ? (
                                    <img
                                      src={getImageUrl(group.photo.path)}
                                      alt={group.name}
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                                      <div className="text-center">
                                        <Users className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-2" />
                                        <div className="text-xs font-medium text-green-700 dark:text-green-300">
                                          Group
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm">
                                    {group.clubName}
                                  </div>
                                </div>
                                <div className="p-4">
                                  <h6 className="font-bold text-gray-900 dark:text-white mb-1 truncate">
                                    {group.name}
                                  </h6>
                                  {group.description && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                                      {group.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    Created {formatDate(group.createdAt)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Events Created */}
                    {coachDetails?.event && coachDetails.event.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-md font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          Created Events ({coachDetails.event.length})
                        </h5>
                        <div className="space-y-2">
                          {coachDetails.event.slice(0, 5).map((event) => (
                            <div
                              key={event._id}
                              className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg"
                            >
                              <CalendarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                              <div className="flex-1">
                                <p className="font-medium dark:text-white">
                                  {event.name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(
                                    event.startTime
                                  ).toLocaleDateString()}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-0.5 rounded-full">
                                    {event.capacity} capacity
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      event.private
                                        ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                                        : "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                    }`}
                                  >
                                    {event.private ? "Private" : "Public"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {coachDetails.event.length > 5 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                              And {coachDetails.event.length - 5} more events...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Associated Companies */}
                    {user?.company && user.company.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-md font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                          <Building className="w-4 h-4 text-green-600 dark:text-green-400" />
                          Associated Companies ({user.company.length})
                        </h5>
                        <div className="space-y-2">
                          {user.company.map((company, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg"
                            >
                              <Building className="w-5 h-5 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="font-medium dark:text-white">
                                  Company {index + 1}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  ID: {company._id || company.name || "N/A"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Facilities and Companies */}
              {((user.facility.length > 0 && context !== "participant") ||
                (user.company.length > 0 &&
                  context !== "coach" &&
                  context !== "participant")) && (
                <div className="border-t dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Associated with
                  </h4>
                  {user.facility.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-md font-medium text-gray-800 dark:text-white mb-2">
                        Sports Facilities ({user.facility.length})
                      </h5>
                      <div className="space-y-2">
                        {user.facility.map((facility) => (
                          <div
                            key={facility._id}
                            className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                          >
                            <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <div className="flex-1">
                              <p className="font-medium dark:text-white">
                                {facility.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Sport Group: {facility.sportGroup}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Sport: {facility.sport}
                              </p>
                              {facility.priceInfo && (
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {facility.priceInfo}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {user.company.length > 0 && context !== "coach" && (
                    <div>
                      <h5 className="text-md font-medium text-gray-800 dark:text-white mb-2">
                        Companies ({user.company.length})
                      </h5>
                      <div className="space-y-2">
                        {user.company.map((company) => (
                          <div
                            key={company._id}
                            className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg"
                          >
                            {company.photo ? (
                              <img
                                src={`${EP.API_ASSETS_BASE}${company.photo.path}`}
                                alt={company.name}
                                className="w-16 h-16 object-cover rounded-lg border dark:border-gray-600"
                              />
                            ) : (
                              <Building className="w-5 h-5 text-green-600 dark:text-green-400" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium dark:text-white">
                                {company.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="w-4 h-4 inline mr-1" />
                                {company.address}
                              </p>
                              {company.phone && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <Phone className="w-4 h-4 inline mr-1" />
                                  {company.phone}
                                </p>
                              )}
                              {company.email && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <Mail className="w-4 h-4 inline mr-1" />
                                  {company.email}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Club Modal */}
      {selectedClub && (
        <ClubViewModal
          isOpen={isClubModalOpen}
          onClose={handleCloseClubModal}
          club={selectedClub}
        />
      )}

      {/* Group Modal */}
      {selectedGroup && (
        <GroupViewModal
          isOpen={isGroupModalOpen}
          onClose={handleCloseGroupModal}
          group={selectedGroup}
        />
      )}
    </div>
  );
};

export default UserProfileModal;
