export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  age: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  role: number;
  participant: {
    _id: string;
    mainSport: string;
    skillLevel: number;
    point: number | null;
    membershipLevel: number | null;
    sportGoal: string;
    createdAt: string;
    updatedAt: string;
    __v?: number;
  } | null;
  coach: {
    _id: string;
    membershipLevel: number | null;
    point: number | null;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
    __v?: number;
  } | null;
  facility: Array<{
    _id: string;
    name: string;
    sportGroup: string;
    sport: string;
    priceInfo: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  company: Array<{
    _id: string;
    name: string;
    address: string;
    phone?: string;
    email?: string;
    photo?: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
    createdAt?: string;
    updatedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  photo?: string;
}

export interface UserSearchFilters {
  search?: string;
  mainSport?: string;
  pageNumber?: number;
  perPage?: number;
}

export interface UserSearchResponse {
  success: boolean;
  data: User[];
  total: number;
  perPage: number;
  pageNumber: number;
  totalPages: number;
  message?: string;
}

export interface UserDetailsResponse {
  success: boolean;
  data: User;
  message?: string;
}

export interface SportGroup {
  _id: string;
  name: string;
}

export interface Sport {
  _id: string;
  name: string;
  group: string;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SportGroupResponse {
  success: boolean;
  data: SportGroup[];
  message?: string;
}

export interface SportResponse {
  success: boolean;
  data: Sport[];
  total: number;
  perPage: number;
  pageNumber: number;
  totalPages: number;
  message?: string;
}

export interface SportGoal {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface SportGoalResponse {
  success: boolean;
  data: SportGoal[];
  total: number;
  perPage: number;
  pageNumber: number;
  totalPages: number;
  message?: string;
}

export interface CoachDetails {
  coach: {
    _id: string;
    trainingCertificate?: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
    membershipLevel: number | null;
    point: number | null;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
    __v?: number;
  };
  user: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    age: string;
    coach: string;
    facility: string[];
    company: string[];
    createdAt: string;
    updatedAt: string;
    __v?: number;
    role: number;
    participant?: string;
    photo?: string;
  }>;
  club: Array<any>; // Could be defined more specifically if needed
  clubGroup: Array<{
    _id: string;
    owner: string;
    clubId: string;
    clubName: string;
    name: string;
    description: string;
    isApproved: boolean;
    photo?: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
    createdAt: string;
    updatedAt: string;
    __v?: number;
  }>;
  branch: Array<{
    certificate?: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
    status: string;
    _id: string;
    coach: string;
    sport: {
      _id: string;
      name: string;
      groupName: string;
    };
    branchOrder: number;
    level: number;
    isApproved: boolean;
    __v?: number;
    createdAt: string;
    updatedAt: string;
  }>;
  event: Array<{
    photo?: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
    banner?: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
    _id: string;
    owner: string;
    name: string;
    club?: {
      _id: string;
      name: string;
    };
    group?: {
      _id: string;
      name: string;
    } | null;
    startTime: string;
    endTime: string;
    capacity: number;
    level: number;
    type: string;
    style: {
      _id: string;
      name: string;
    };
    private: boolean;
    sportGroup: {
      _id: string;
      name: string;
    };
    sport: {
      _id: string;
      name: string;
    };
    point: number | null;
    priceType: string;
    participationFee: number;
    isRecurring: boolean;
    location?: string;
    facility?: {
      _id: string;
      name: string;
    };
    salon?: {
      _id: string;
      name: string;
    };
    equipment?: string;
    createdAt: string;
    updatedAt: string;
    __v?: number;
  }>;
}

export interface CoachDetailsResponse {
  success: boolean;
  data: CoachDetails;
  message?: string;
}

export interface Facility {
  _id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  photo: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  mainSport: string;
  membershipLevel: string | null;
  private: boolean;
  point: number | null;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface FacilitySearchResponse {
  success: boolean;
  data: Facility[];
  total: number;
  perPage: number;
  pageNumber: number;
  totalPages: number;
  message?: string;
}

export interface Company {
  _id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  photo: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CompanySearchResponse {
  success: boolean;
  data: Company[];
  total: number;
  perPage: number;
  pageNumber: number;
  totalPages: number;
  message?: string;
}

export interface Club {
  _id: string;
  creator: string;
  name: string;
  vision?: string;
  conditions?: string;
  president?: string;
  coaches: string[];
  photo?: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface ClubSearchResponse {
  success: boolean;
  data: Club[];
  pagination: {
    currentPage: number;
    totalPages: number;
    perPage: number;
    total: number;
  };
  message?: string;
}

export interface Group {
  _id: string;
  owner: string;
  clubId: string;
  clubName: string;
  name: string;
  description?: string;
  photo?: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface GroupSearchResponse {
  success: boolean;
  data: Group[];
  pagination: {
    currentPage: number;
    totalPages: number;
    perPage: number;
    total: number;
  };
  message?: string;
}