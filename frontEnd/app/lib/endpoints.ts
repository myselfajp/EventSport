"use client";

const API_V1_BASE = (process.env.NEXT_PUBLIC_API_V1_BASE || "").replace(
  /\/+$/,
  ""
);
const API_ASSETS_URL = (process.env.NEXT_PUBLIC_API_ASSETS_BASE || "").replace(
  /\/+$/,
  ""
);

if (!API_V1_BASE) {
  if (typeof window !== "undefined") {
    console.warn("NEXT_PUBLIC_API_V1_BASE is not set");
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_V1_BASE is required");
  }
}

const AUTH_API = `${API_V1_BASE}/auth`;
const ADMIN_API = `${API_V1_BASE}/admin`;
const REFERENCE_DATA_API = `${API_V1_BASE}/reference-data`;
const PARTICIPANT_DATA_API = `${API_V1_BASE}/participant`;
const COACH_DATA_API = `${API_V1_BASE}/coach`;
const FACILITY_API = `${API_V1_BASE}/facility`;
const COMPANY_API = `${API_V1_BASE}/company`;

export const EP = {
  API_BASE: API_V1_BASE,
  API_ASSETS_BASE: API_ASSETS_URL,
  AUTH: {
    signIn: `${AUTH_API}/sign-in`,
    signUp: `${AUTH_API}/sign-up`,
    signOut: `${AUTH_API}/sign-out`,
    me: `${AUTH_API}/get-current-user`,
    editUserPhoto: `${AUTH_API}/edit-user-photo`,
    getUsers: `${AUTH_API}/get-user`,
    getUserById: (userId: string) => `${AUTH_API}/get-user/${userId}`,
  },
  ADMIN: {
    panel: `${ADMIN_API}/panel`,
    users: {
      getAll: `${ADMIN_API}/users`,
      create: `${ADMIN_API}/users/create`,
      update: (userId: string) => `${ADMIN_API}/users/${userId}`,
      delete: (userId: string) => `${ADMIN_API}/users/${userId}`,
      coachDetails: (userId: string) => `${ADMIN_API}/users/${userId}/coach-details`,
      participantDetails: (userId: string) => `${ADMIN_API}/users/${userId}/participant-details`,
      facilityDetails: (userId: string) => `${ADMIN_API}/users/${userId}/facility-details`,
      clubDetails: (userId: string) => `${ADMIN_API}/users/${userId}/club-details`,
      getCoachBranches: (userId: string) => `${ADMIN_API}/users/${userId}/coach-branches`,
      getParticipantProfile: (userId: string) => `${ADMIN_API}/users/${userId}/participant-profile`,
      updateCoachProfile: (userId: string) => `${ADMIN_API}/users/${userId}/coach-profile`,
      updateParticipantProfile: (userId: string) => `${ADMIN_API}/users/${userId}/participant-profile`,
      updateFacilityProfile: (userId: string, facilityId: string) => `${ADMIN_API}/users/${userId}/facility/${facilityId}`,
    },
    coaches: {
      pending: `${ADMIN_API}/coaches/pending`,
      approve: (branchId: string) =>
        `${ADMIN_API}/coaches/branches/${branchId}/approve`,
      reject: (branchId: string) =>
        `${ADMIN_API}/coaches/branches/${branchId}/reject`,
    },
  },
  REFERENCE: {
    sportGroup: {
      get: `${REFERENCE_DATA_API}/get-sport-group`,
      create: `${REFERENCE_DATA_API}/create-sport-group`,
      update: (sportGroupId: string) =>
        `${REFERENCE_DATA_API}/update-sport-group/${sportGroupId}`,
      delete: (sportGroupId: string) =>
        `${REFERENCE_DATA_API}/delete-sport-group/${sportGroupId}`,
    },
    sport: {
      get: `${REFERENCE_DATA_API}/get-sport`,
      create: (sportGroupId: string) =>
        `${REFERENCE_DATA_API}/create-sport/${sportGroupId}`,
      update: (sportId: string) =>
        `${REFERENCE_DATA_API}/update-sport/${sportId}`,
      delete: (sportId: string) =>
        `${REFERENCE_DATA_API}/delete-sport/${sportId}`,
    },
    sportGoal: {
      get: `${REFERENCE_DATA_API}/get-sport-goal`,
      create: `${REFERENCE_DATA_API}/create-sport-goal`,
      delete: (sportGoalId: string) =>
        `${REFERENCE_DATA_API}/delete-sport-goal/${sportGoalId}`,
    },
    eventStyle: {
      get: `${REFERENCE_DATA_API}/get-event-style`,
      create: `${REFERENCE_DATA_API}/create-event-style`,
      delete: (eventStyleId: string) =>
        `${REFERENCE_DATA_API}/delete-event-style/${eventStyleId}`,
    },
  },
  PARTICIPANT: {
    createProfile: `${PARTICIPANT_DATA_API}/create-profile`,
    editProfile: `${PARTICIPANT_DATA_API}/edit-profile`,
    getDetails: (participantId: string) =>
      `${PARTICIPANT_DATA_API}/get-by-detail/${participantId}`,
    getFavorites: `${PARTICIPANT_DATA_API}/get-favorites`,
    getFollows: `${PARTICIPANT_DATA_API}/follows`,
    favoriteCoach: `${PARTICIPANT_DATA_API}/favorite-coach`,
    favoriteFacility: `${PARTICIPANT_DATA_API}/favorite-facility`,
    favoriteEvent: `${PARTICIPANT_DATA_API}/favorite-event`,
    unfavorite: (type: "coach" | "facility" | "event") =>
      `${PARTICIPANT_DATA_API}/favorite/${type}`,
    follow: {
      group: `${PARTICIPANT_DATA_API}/follow-group`,
      company: `${PARTICIPANT_DATA_API}/follow-company`,
      club: `${PARTICIPANT_DATA_API}/follow-club`,
      facility: `${PARTICIPANT_DATA_API}/follow-facility`,
      coach: `${PARTICIPANT_DATA_API}/follow-coach`,
    },
    unfollow: {
      group: `${PARTICIPANT_DATA_API}/unfollow-group`,
      company: `${PARTICIPANT_DATA_API}/unfollow-company`,
      club: `${PARTICIPANT_DATA_API}/unfollow-club`,
      facility: `${PARTICIPANT_DATA_API}/unfollow-facility`,
      coach: `${PARTICIPANT_DATA_API}/unfollow-coach`,
    },
  },
  COACH: {
    createProfileAndBranch: `${COACH_DATA_API}/create-branch`,
    editProfileAndBranch: `${COACH_DATA_API}/edit-branch`,
    editCoach: `${COACH_DATA_API}/edit-coach`,
    createEvent: `${COACH_DATA_API}/create-event`,
    editEvent: (eventId: string) => `${COACH_DATA_API}/edit-event/${eventId}`,
    getCurrentBranches: `${COACH_DATA_API}/current-branches`,
    getCoachDetails: `${COACH_DATA_API}/get-by-detail`,
    getCoachById: (coachId: string) =>
      `${COACH_DATA_API}/get-by-detail/${coachId}`,
    getCoachList: `${API_V1_BASE}/get-coach-list`,
  },
  PARTICIPANT_LIST: {
    getParticipantList: `${API_V1_BASE}/get-participant-list`,
  },
  FACILITY: {
    base: `${API_V1_BASE}/facility`,
    getFacility: `${API_V1_BASE}/get-facility`,
    createFacility: `${API_V1_BASE}/facility/create-facility`,
    editFacility: (id: string) => `${API_V1_BASE}/facility/${id}`,
    deleteFacility: (id: string) => `${API_V1_BASE}/facility/${id}`,
  },
  COMPANY: {
    getCompany: `${API_V1_BASE}/get-company`,
    createCompany: `${COMPANY_API}/create-company`,
    editCompany: (id: string) => `${COMPANY_API}/${id}`,
    deleteCompany: (id: string) => `${COMPANY_API}/${id}`,
  },
  SALON: {
    getSalon: `${API_V1_BASE}/get-salon`,
    getSalonsByFacility: (facilityId: string) =>
      `${API_V1_BASE}/get-salon/${facilityId}`,
  },
  CLUB: {
    getClub: `${API_V1_BASE}/get-club`,
    createClub: `${COACH_DATA_API}/create-club`,
    editClub: (clubId: string) => `${COACH_DATA_API}/edit-club/${clubId}`,
    deleteClub: (clubId: string) => `${COACH_DATA_API}/delete-club/${clubId}`,
  },
  GROUP: {
    getGroup: `${API_V1_BASE}/get-group`,
  },
  CLUB_GROUPS: {
    getClubGroups: `${API_V1_BASE}/get-group-by-coach`,
    createGroup: (clubId: string) => `${COACH_DATA_API}/create-group/${clubId}`,
    editGroup: (groupId: string) => `${COACH_DATA_API}/edit-group/${groupId}`,
    deleteGroup: (groupId: string) =>
      `${COACH_DATA_API}/delete-group/${groupId}`,
    getClubs: `${API_V1_BASE}/get-club`,
  },
  EVENT_STYLE: { getEventStyle: `${API_V1_BASE}/get-event-style` },
  EVENTS: { getEvents: `${API_V1_BASE}/get-event` },
  NOTIFICATIONS: {
    getAll: `${API_V1_BASE}/notifications`,
    getUnreadCount: `${API_V1_BASE}/notifications/unread-count`,
    markAsRead: (notificationId: string) => `${API_V1_BASE}/notifications/${notificationId}/read`,
    markAllAsRead: `${API_V1_BASE}/notifications/read-all`,
    delete: (notificationId: string) => `${API_V1_BASE}/notifications/${notificationId}`,
    create: `${API_V1_BASE}/notifications/create`, // Admin only
  },
};
