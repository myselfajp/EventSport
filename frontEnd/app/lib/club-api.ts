import { EP } from "./endpoints";
import { fetchJSON, apiFetch } from "./api";

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
}

export interface Group {
  _id: string;
  owner: string;
  name: string;
  description?: string;
  clubId: string;
  clubName: string;
  photo?: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  perPage: number;
  pageNumber: number;
  totalPages: number;
}

export const getCreatedClubs = async (
  creatorId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Club>> => {
  return fetchJSON(EP.CLUB.getClub, {
    method: "POST",
    body: {
      creator: creatorId,
      pageNumber: page,
      perPage: limit,
    },
  });
};

export const getCreatedGroups = async (
  ownerId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Group>> => {
  return fetchJSON(EP.CLUB_GROUPS.getClubGroups, {
    method: "POST",
    body: {
      owner: ownerId,
      pageNumber: page,
      perPage: limit,
    },
  });
};

export async function createClub(formData: FormData) {
  const res = await apiFetch(EP.CLUB.createClub, {
    method: "POST",
    body: formData,
    // Content-Type header is automatically set by browser for FormData
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body?.data;
}

export async function updateClub(id: string, formData: FormData) {
  const res = await apiFetch(EP.CLUB.editClub(id), {
    method: "PATCH",
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body?.data;
}

export async function deleteClub(id: string) {
  const res = await apiFetch(EP.CLUB.deleteClub(id), {
    method: "DELETE",
  });

  if (res.status === 204) return true;

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return true;
}

// Group CRUD operations
export async function createGroup(clubId: string, formData: FormData) {
  const res = await apiFetch(EP.CLUB_GROUPS.createGroup(clubId), {
    method: "POST",
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body?.data;
}

export async function updateGroup(groupId: string, formData: FormData) {
  const res = await apiFetch(EP.CLUB_GROUPS.editGroup(groupId), {
    method: "POST",
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body?.data;
}

export async function deleteGroup(groupId: string) {
  const res = await apiFetch(EP.CLUB_GROUPS.deleteGroup(groupId), {
    method: "DELETE",
  });

  if (res.status === 204) return true;

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return true;
}

export async function getClubs(
  search?: string,
  page: number = 1,
  perPage: number = 10,
  creator?: string
) {
  const body: any = {
    search: search || "",
    pageNumber: page,
    perPage: perPage,
  };

  if (creator) {
    body.creator = creator;
  }

  return fetchJSON(EP.CLUB_GROUPS.getClubs, {
    method: "POST",
    body,
  });
}
