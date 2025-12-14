import React, { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  Award,
  CheckCircle,
  Calendar,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import { getCreatedClubs, getCreatedGroups } from "@/app/lib/club-api";
import ClubModal from "@/components/profile/ClubModal";
import GroupModal from "@/components/profile/GroupModal";
import ClubViewModal from "@/components/ClubViewModal";
import GroupViewModal from "@/components/GroupViewModal";

interface CoachDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string | null;
}

interface Event {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  photo?: {
    path: string;
  };
  banner?: {
    path: string;
  };
  sport?: {
    name: string;
  };
}

interface CoachResponseData {
  coach: {
    _id: string;
    isVerified: boolean;
    createdAt: string;
    about?: string;
  };
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    age?: string; // ISO date string
    photo?: {
      path: string;
    };
  };
  branch: {
    _id: string;
    sport: {
      _id: string;
      name: string;
      groupName: string;
    };
    branchOrder: number;
    level: number;
    certificate?: {
      path: string;
      originalName: string;
    };
  }[];
  event: Event[];
}

const CoachDetailModal: React.FC<CoachDetailModalProps> = ({
  isOpen,
  onClose,
  coachId,
}) => {
  const { data: currentUser } = useMe();
  const [data, setData] = useState<CoachResponseData | null>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states for clubs and groups
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  useEffect(() => {
    if (isOpen && coachId) {
      fetchCoachDetails(coachId);
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, coachId]);

  const fetchCoachDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch coach details and clubs/groups in parallel
      const [coachResponse, clubsResponse, groupsResponse] = await Promise.all([
        fetchJSON(EP.COACH.getCoachById(id), { method: "GET" }),
        getCreatedClubs(id),
        getCreatedGroups(id)
      ]);

      if (coachResponse?.success && coachResponse?.data) {
        setData(coachResponse.data);
      } else {
        setError(coachResponse?.message || "Failed to load coach details");
      }

      // Set clubs and groups
      if (clubsResponse?.success && clubsResponse?.data) {
        setClubs(clubsResponse.data);
      }

      if (groupsResponse?.success && groupsResponse?.data) {
        setGroups(groupsResponse.data);
      }

    } catch (err) {
      setError("An error occurred while fetching coach details");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    return `${EP.API_ASSETS_BASE}/${path}`.replace(/\\/g, "/");
  };

  const calculateAge = (dateString?: string) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(isoString));
  };

  const isOwnerOrCreator = (resource: any, type: 'club' | 'group') => {
    if (!currentUser) return false;
    if (type === 'club') {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Coach Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 overscroll-contain">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading coach information...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 p-4 rounded-lg inline-block mb-4">
                {error}
              </div>
              <button
                onClick={() => coachId && fetchCoachDetails(coachId)}
                className="block mx-auto text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : data ? (
            <div className="p-6 space-y-8">
              {/* Profile Section */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0 overflow-hidden border-4 border-white dark:border-gray-600 shadow-md relative">
                    {data.user.photo?.path ? (
                      <img
                        src={getImageUrl(data.user.photo.path)!}
                        alt={data.user.firstName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400 text-3xl font-bold">
                        {data.user.firstName.charAt(0)}
                        {data.user.lastName.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                        {data.user.firstName} {data.user.lastName}
                      </h3>
                      {data.coach.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {data.user.age && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span>{calculateAge(data.user.age)} years old</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span>
                          Joined {formatDate(data.coach.createdAt)}
                        </span>
                      </div>
                      {data.user.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <a
                            href={`mailto:${data.user.email}`}
                            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                          >
                            {data.user.email}
                          </a>
                        </div>
                      )}
                      {data.user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <a
                            href={`tel:${data.user.phone}`}
                            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                          >
                            {data.user.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* About Section (Moved inside Profile Card) */}
                {data.coach.about && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                      About
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {data.coach.about}
                    </p>
                  </div>
                )}
              </div>

              {/* Branches Section */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                  Sports & Certifications
                </h4>
                {data.branch && data.branch.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.branch.map((item) => (
                      <div
                        key={item._id}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.sport.name}
                          </span>
                          <span className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs font-semibold rounded-full border border-cyan-100 dark:border-cyan-800">
                            Level {item.level}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          {item.sport.groupName}
                        </div>
                        {item.certificate?.path && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                              Certificate
                            </p>
                            <a
                              href={getImageUrl(item.certificate.path)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                            >
                              <img
                                src={getImageUrl(item.certificate.path)!}
                                alt="Certificate"
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 italic">
                    No sports branches assigned.
                  </div>
                )}
              </div>

              {/* Events Section */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                  Active Events
                </h4>
                {data.event && data.event.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.event.map((event) => (
                      <div
                        key={event._id}
                        className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="h-32 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                          {event.banner?.path || event.photo?.path ? (
                            <img
                              src={
                                getImageUrl(event.banner?.path) ||
                                getImageUrl(event.photo?.path)!
                              }
                              alt={event.name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                              <Calendar className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm">
                            {event.sport?.name}
                          </div>
                        </div>
                        <div className="p-4">
                          <h5 className="font-bold text-gray-900 dark:text-white mb-1 truncate">
                            {event.name}
                          </h5>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            {formatDate(event.startTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 italic">
                    No active events found.
                  </div>
                )}
              </div>

              {/* Clubs Section */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                  Clubs
                </h4>
                {clubs && clubs.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {clubs.map((club) => (
                      <div
                        key={club._id}
                        className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => handleClubClick(club)}
                      >
                        <div className="h-32 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                          {club.photo?.path ? (
                            <img
                              src={getImageUrl(club.photo.path)!}
                              alt={club.name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900 dark:to-cyan-800">
                              <div className="text-center">
                                <ShieldCheck className="w-12 h-12 text-cyan-500 dark:text-cyan-400 mx-auto mb-2" />
                                <div className="text-xs font-medium text-cyan-700 dark:text-cyan-300">Club</div>
                              </div>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm">
                            {club.isApproved ? "Approved" : "Pending"}
                          </div>
                        </div>
                        <div className="p-4">
                          <h5 className="font-bold text-gray-900 dark:text-white mb-1 truncate">
                            {club.name}
                          </h5>
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
                ) : (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 italic">
                    No clubs found.
                  </div>
                )}
              </div>

              {/* Groups Section */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                  Groups
                </h4>
                {groups && groups.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                      <div
                        key={group._id}
                        className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => handleGroupClick(group)}
                      >
                        <div className="h-32 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                          {group.photo?.path ? (
                            <img
                              src={getImageUrl(group.photo.path)!}
                              alt={group.name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900 dark:to-cyan-800">
                              <div className="text-center">
                                <User className="w-12 h-12 text-cyan-500 dark:text-cyan-400 mx-auto mb-2" />
                                <div className="text-xs font-medium text-cyan-700 dark:text-cyan-300">Group</div>
                              </div>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm">
                            {group.clubName}
                          </div>
                        </div>
                        <div className="p-4">
                          <h5 className="font-bold text-gray-900 dark:text-white mb-1 truncate">
                            {group.name}
                          </h5>
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
                ) : (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 italic">
                    No groups found.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Club Modal */}
      {selectedClub && isOwnerOrCreator(selectedClub, 'club') && (
        <ClubModal
          isOpen={isClubModalOpen}
          onClose={handleCloseClubModal}
          onSubmit={async () => {}}
          initialData={selectedClub}
        />
      )}

      {/* Club View Modal */}
      {selectedClub && !isOwnerOrCreator(selectedClub, 'club') && (
        <ClubViewModal
          isOpen={isClubModalOpen}
          onClose={handleCloseClubModal}
          club={selectedClub}
        />
      )}

      {/* Group Modal */}
      {selectedGroup && isOwnerOrCreator(selectedGroup, 'group') && (
        <GroupModal
          isOpen={isGroupModalOpen}
          onClose={handleCloseGroupModal}
          onSubmit={async () => {}}
          initialData={selectedGroup}
          userId={currentUser?._id}
        />
      )}

      {/* Group View Modal */}
      {selectedGroup && !isOwnerOrCreator(selectedGroup, 'group') && (
        <GroupViewModal
          isOpen={isGroupModalOpen}
          onClose={handleCloseGroupModal}
          group={selectedGroup}
        />
      )}
    </div>
  );
};

export default CoachDetailModal;
