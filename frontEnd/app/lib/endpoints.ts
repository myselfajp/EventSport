"use client";

const API_V1_BASE = (process.env.NEXT_PUBLIC_API_V1_BASE || "").replace(
  /\/+$/,
  ""
);
const API_ASSETS_URL = (process.env.NEXT_PUBLIC_API_ASSETS_BASE || "").replace(
  /\/+$/,
  ""
);

/** Public URL root where Express serves `uploads/` (see backend `app.use('/uploads', static)`). */
function uploadsPublicRoot(): string {
  const apiOrigin = API_V1_BASE.replace(/\/api\/v1\/?$/i, "").replace(
    /\/+$/,
    ""
  );
  const base = (API_ASSETS_URL || apiOrigin).replace(/\/+$/, "");
  if (!base) return "";
  return base.toLowerCase().endsWith("/uploads") ? base : `${base}/uploads`;
}

/**
 * Builds a browser URL for a path stored in Mongo (relative to the uploads folder, or with optional `uploads/` prefix).
 */
export function assetUrl(pathFromDb: string | undefined | null): string {
  if (pathFromDb == null || pathFromDb === "") return "";
  const raw = String(pathFromDb).replace(/\\/g, "/").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  let rel = raw.replace(/^\/+/, "");
  const lower = rel.toLowerCase();
  if (lower.startsWith("uploads/")) {
    rel = rel.slice("uploads/".length);
  }
  const root = uploadsPublicRoot();
  if (!root) {
    return rel ? `/uploads/${rel}` : "";
  }
  return `${root}/${rel}`.replace(/([^:]\/)\/+/g, "$1");
}

if (!API_V1_BASE) {
  if (typeof window !== "undefined") {
    console.warn("NEXT_PUBLIC_API_V1_BASE is not set");
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_V1_BASE is required");
  }
}

const AUTH_API = `${API_V1_BASE}/auth`;
const ADMIN_API = `${API_V1_BASE}/admin`;
const LEGAL_API = `${API_V1_BASE}/legal`;
const REFERENCE_DATA_API = `${API_V1_BASE}/reference-data`;
const PARTICIPANT_DATA_API = `${API_V1_BASE}/participant`;
const COACH_DATA_API = `${API_V1_BASE}/coach`;
const FACILITY_API = `${API_V1_BASE}/facility`;
const COMPANY_API = `${API_V1_BASE}/company`;
const LOCATION_API = `${API_V1_BASE}/location`;

export const EP = {
  API_BASE: API_V1_BASE,
  /** Same origin as uploaded files (`…/uploads`). Prefer `assetUrl()` for file paths from the API. */
  API_ASSETS_BASE: uploadsPublicRoot(),
  assetUrl,
  /** Public read-only; admin creates pages under Static Pages with matching `name`. */
  PUBLIC: {
    staticPageByName: (name: string) =>
      `${API_V1_BASE}/public/static-page/${encodeURIComponent(name)}`,
    activeStaticPages: `${API_V1_BASE}/public/static-pages/active`,
    contractsCatalog: `${API_V1_BASE}/public/contracts`,
    suggestion: `${API_V1_BASE}/public/suggestion`,
    dashboardHeaderLogo: `${API_V1_BASE}/public/dashboard-header-logo`,
    dashboardHeroSlides: `${API_V1_BASE}/public/dashboard-hero-slides`,
    heroClick: (slideId: string) =>
      `${API_V1_BASE}/public/hero-click/${encodeURIComponent(slideId)}`,
  },
  LOCATION: {
    detect: `${LOCATION_API}/detect`,
    districts: `${LOCATION_API}/districts`,
    countries: `${LOCATION_API}/countries`,
    trProvinces: `${LOCATION_API}/tr/provinces`,
    trDistricts: (province: string) =>
      `${LOCATION_API}/tr/districts?province=${encodeURIComponent(province)}`,
    usStates: `${LOCATION_API}/us/states`,
    usCities: (state: string) =>
      `${LOCATION_API}/us/cities?state=${encodeURIComponent(state)}`,
  },
  REPORT: {
    submit: `${API_V1_BASE}/report`,
  },
  AUTH: {
    signIn: `${AUTH_API}/sign-in`,
    sendRegistrationOtp: `${AUTH_API}/send-registration-otp`,
    signUp: `${AUTH_API}/sign-up`,
    signOut: `${AUTH_API}/sign-out`,
    me: `${AUTH_API}/get-current-user`,
    editUser: `${AUTH_API}/edit-user`,
    accountSettings: `${AUTH_API}/account-settings`,
    cookieConsent: `${AUTH_API}/cookie-consent`,
    getUsers: `${AUTH_API}/get-user`,
    getUserById: (userId: string) => `${AUTH_API}/get-user/${userId}`,
  },
  LEGAL: {
    getActive: (type: string) => `${LEGAL_API}/active?type=${encodeURIComponent(type)}`,
    catalog: `${LEGAL_API}/catalog`,
  },
  ADMIN: {
    panel: `${ADMIN_API}/panel`,
    permissionCatalog: `${ADMIN_API}/permission-catalog`,
    permissionGroups: {
      list: `${ADMIN_API}/permission-groups`,
      create: `${ADMIN_API}/permission-groups`,
      update: (groupId: string) => `${ADMIN_API}/permission-groups/${groupId}`,
      delete: (groupId: string) => `${ADMIN_API}/permission-groups/${groupId}`,
    },
    legal: {
      list: (type?: string, category?: string) => {
        const params = new URLSearchParams();
        if (type) params.set("type", type);
        if (category) params.set("category", category);
        const q = params.toString();
        return q ? `${ADMIN_API}/legal?${q}` : `${ADMIN_API}/legal`;
      },
      create: `${ADMIN_API}/legal`,
      getById: (documentId: string) => `${ADMIN_API}/legal/${documentId}`,
      update: (documentId: string) => `${ADMIN_API}/legal/${documentId}`,
      activate: (documentId: string) =>
        `${ADMIN_API}/legal/${documentId}/activate`,
    },
    blacklist: {
      list: `${ADMIN_API}/blacklist`,
      create: `${ADMIN_API}/blacklist/create`,
      fromUser: (userId: string) => `${ADMIN_API}/blacklist/from-user/${userId}`,
      remove: (entryId: string) => `${ADMIN_API}/blacklist/${entryId}`,
    },
    users: {
      getAll: `${ADMIN_API}/users`,
      activityLeaderboard: (limit = 10) =>
        `${ADMIN_API}/users/activity-leaderboard?limit=${limit}`,
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
      createFacility: (userId: string) => `${ADMIN_API}/users/${userId}/facility`,
      updateFacilityProfile: (userId: string, facilityId: string) => `${ADMIN_API}/users/${userId}/facility/${facilityId}`,
    },
    coaches: {
      pending: `${ADMIN_API}/coaches/pending`,
      approve: (branchId: string) =>
        `${ADMIN_API}/coaches/branches/${branchId}/approve`,
      reject: (branchId: string) =>
        `${ADMIN_API}/coaches/branches/${branchId}/reject`,
    },
    staticPages: {
      getAll: `${ADMIN_API}/static-pages`,
      getActive: `${ADMIN_API}/static-pages/active`,
      getById: (pageId: string) => `${ADMIN_API}/static-pages/${pageId}`,
      create: `${ADMIN_API}/static-pages`,
      update: (pageId: string) => `${ADMIN_API}/static-pages/${pageId}`,
      delete: (pageId: string) => `${ADMIN_API}/static-pages/${pageId}`,
    },
    contractAcceptances: {
      list: (params?: {
        userId?: string;
        contractKey?: string;
        context?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
      }) => {
        const q = new URLSearchParams();
        if (params?.userId) q.set("userId", params.userId);
        if (params?.contractKey) q.set("contractKey", params.contractKey);
        if (params?.context) q.set("context", params.context);
        if (params?.from) q.set("from", params.from);
        if (params?.to) q.set("to", params.to);
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        const qs = q.toString();
        return `${ADMIN_API}/contract-acceptances${qs ? `?${qs}` : ""}`;
      },
      byUser: (userId: string) =>
        `${ADMIN_API}/users/${userId}/contract-acceptances`,
    },
    suggestions: `${ADMIN_API}/suggestions`,
    reports: {
      list: `${ADMIN_API}/reports`,
      resolve: (reportId: string) => `${ADMIN_API}/reports/${reportId}/resolve`,
    },
    dashboardHeaderLogo: {
      get: `${ADMIN_API}/dashboard-header-logo`,
      update: `${ADMIN_API}/dashboard-header-logo`,
      delete: `${ADMIN_API}/dashboard-header-logo`,
    },
    dashboardHeroSlides: {
      list: `${ADMIN_API}/dashboard-hero-slides`,
      create: `${ADMIN_API}/dashboard-hero-slides`,
      update: (slideId: string) => `${ADMIN_API}/dashboard-hero-slides/${slideId}`,
      delete: (slideId: string) => `${ADMIN_API}/dashboard-hero-slides/${slideId}`,
      analytics: (params?: {
        days?: number;
        slideId?: string;
        from?: string;
        to?: string;
      }) => {
        const q = new URLSearchParams();
        if (params?.days) q.set("days", String(params.days));
        if (params?.slideId) q.set("slideId", params.slideId);
        if (params?.from) q.set("from", params.from);
        if (params?.to) q.set("to", params.to);
        const qs = q.toString();
        return `${ADMIN_API}/dashboard-hero-analytics${qs ? `?${qs}` : ""}`;
      },
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
      edit: (sportGoalId: string) =>
        `${REFERENCE_DATA_API}/update-sport-goal/${sportGoalId}`,
      delete: (sportGoalId: string) =>
        `${REFERENCE_DATA_API}/delete-sport-goal/${sportGoalId}`,
    },
    eventStyle: {
      get: `${REFERENCE_DATA_API}/get-event-style`,
      create: `${REFERENCE_DATA_API}/create-event-style`,
      edit: (eventStyleId: string) =>
        `${REFERENCE_DATA_API}/update-event-style/${eventStyleId}`,
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
    makeReservation: `${PARTICIPANT_DATA_API}/make-reservation`,
    enrollSeries: `${PARTICIPANT_DATA_API}/enroll-series`,
    checkIn: `${PARTICIPANT_DATA_API}/check-in`,
    confirmPayment: `${PARTICIPANT_DATA_API}/confirm-payment`,
    addEndPhoto: `${PARTICIPANT_DATA_API}/add-end-photo`,
    eventEndPhotos: `${PARTICIPANT_DATA_API}/event-end-photos`,
    myReservations: `${PARTICIPANT_DATA_API}/my-reservations`,
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
    cancelEvent: (eventId: string) => `${COACH_DATA_API}/cancel-event/${eventId}`,
    listingQuote: (sessionCount: number) =>
      `${COACH_DATA_API}/listing-quote?sessionCount=${sessionCount}`,
    getCurrentBranches: `${COACH_DATA_API}/current-branches`,
    getCoachDetails: `${COACH_DATA_API}/get-by-detail`,
    getCoachById: (coachId: string) =>
      `${COACH_DATA_API}/get-by-detail/${coachId}`,
    getCoachList: `${API_V1_BASE}/get-coach-list`,
    myCreatedEvents: `${COACH_DATA_API}/my-events`,
    addEndPhoto: `${COACH_DATA_API}/add-end-photo/`,
    getEventParticipants: (eventId: string) =>
      `${COACH_DATA_API}/event/participants/${eventId}`,
    followStats: (coachId: string) =>
      `${COACH_DATA_API}/${coachId}/follow-stats`,
    followers: (coachId: string, page = 1, limit = 20) =>
      `${COACH_DATA_API}/${coachId}/followers?page=${page}&limit=${limit}`,
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
  EVENTS: {
    getEvents: `${API_V1_BASE}/get-event`,
    getEventById: (eventId: string) =>
      `${API_V1_BASE}/get-event/${encodeURIComponent(eventId)}`,
    getEventSeries: (seriesId: string) =>
      `${API_V1_BASE}/get-event-series/${encodeURIComponent(seriesId)}`,
    eventEndPhotos: (eventId: string) =>
      `${API_V1_BASE}/get-event/${eventId}/end-photos`,
  },
  NOTIFICATIONS: {
    getAll: `${API_V1_BASE}/notifications`,
    getUnreadCount: `${API_V1_BASE}/notifications/unread-count`,
    markAsRead: (notificationId: string) => `${API_V1_BASE}/notifications/${notificationId}/read`,
    markAllAsRead: `${API_V1_BASE}/notifications/read-all`,
    delete: (notificationId: string) => `${API_V1_BASE}/notifications/${notificationId}`,
    create: `${API_V1_BASE}/notifications/create`, // Admin only
    adminSegments: `${API_V1_BASE}/notifications/admin/segments`, // Admin only
    createForSegments: `${API_V1_BASE}/notifications/admin/segment-create`, // Admin only
  },
};
