"use client";

import { useState, useEffect, useRef } from "react";
import { fetchJSON, apiFetch } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import CoachModal from "../profile/CoachModal";
import ParticipantModal from "../profile/ParticipantModal";
import FacilityModal from "../profile/FacilityModal";
import {
  PHONE_PREFIX,
  processPhoneInput,
  normalizePhoneForDisplay,
  isPhoneComplete,
} from "../../app/lib/phone-utils";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
  photo?: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  role: number;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  participant?: any;
  coach?: any;
  facility?: any[];
  summary?: {
    coach?: {
      certificateCount: number;
      eventsCount: number;
      sports?: Array<{ name: string; groupName: string }>;
    };
    participant?: {
      joinedEventsCount: number;
    };
    facility?: {
      facilityCount: number;
      salonsCount: number;
    };
    club?: {
      clubCount: number;
      groupsCount: number;
    };
  };
  termsAccepted?: {
    versionId?: { version?: number; title?: string };
    acceptedAt?: string;
  } | null;
  kvkkConsent?: {
    agreed?: boolean;
    versionId?: { version?: number; title?: string };
    consentedAt?: string;
  } | null;
  createdAt: string;
}

type ProfileTab = 'participant' | 'coach' | 'facility';

export default function UsersManagement() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('participant');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [editingProfileUser, setEditingProfileUser] = useState<User | null>(null);
  const [editingFacility, setEditingFacility] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: "",
    password: "",
    role: 1,
  });

  useEffect(() => {
    setPage(1);
    fetchUsers();
  }, [activeTab, search]);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const body: any = {
        perPage: 10,
        pageNumber: page,
        profileType: activeTab,
      };
      if (search) {
        body.search = search;
      }
      const response = await fetchJSON(EP.ADMIN.users.getAll, {
        method: "POST",
        body: body,
      });

      if (response?.success) {
        setUsers(response.data);
        setTotalPages(response.totalPages || 1);
      } else {
        setError(response?.message || response?.error || "Failed to fetch users");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const adminPhoneRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: PHONE_PREFIX,
      age: "",
      password: "",
      role: 1,
    });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: normalizePhoneForDisplay(user.phone) || PHONE_PREFIX,
      age: user.age ? new Date(user.age).toISOString().split("T")[0] : "",
      password: "",
      role: user.role,
    });
    setShowModal(true);
  };

  const handleEditProfile = (user: User) => {
    setEditingProfileUser(user);
    if (user.coach) {
      setShowCoachModal(true);
    } else if (user.participant) {
      setShowParticipantModal(true);
    } else if (user.facility && user.facility.length > 0) {
      // For facility, we need to fetch the facility details first
      // For now, we'll just open the modal with the first facility
      // In a real scenario, you might want to show a list to select which facility to edit
      setEditingFacility(user.facility[0]);
      setShowFacilityModal(true);
    }
  };

  useEffect(() => {
    if (!adminPhoneRef.current) return;
    const len = formData.phone.length;
    adminPhoneRef.current.setSelectionRange(len, len);
  }, [formData.phone]);

  const handleAdminPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = processPhoneInput(e.target.value);
    setFormData((prev) => ({ ...prev, phone: next }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      if (!isPhoneComplete(formData.phone)) {
        setError(`Enter full Turkish phone (9 digits after ${PHONE_PREFIX})`);
        return;
      }
      const url = editingUser
        ? EP.ADMIN.users.update(editingUser._id)
        : EP.ADMIN.users.create;

      const body: any = { ...formData };
      
      if (!editingUser) {
        if (!body.password) {
          setError("Password is required");
          return;
        }
      } else {
        if (body.password) {
          body.newPassword = body.password;
          delete body.password;
        } else {
          delete body.password;
        }
      }

      const response = await fetchJSON(url, {
        method: editingUser ? "PUT" : "POST",
        body: body,
      });

      if (response?.success) {
        setShowModal(false);
        fetchUsers();
      } else {
        setError(response?.message || response?.error || "Failed to save user");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to save user");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      setError("");
      const response = await fetchJSON(EP.ADMIN.users.delete(userId), {
        method: "DELETE",
      });

      if (response?.success) {
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    setDetailsData(null);

    try {
      const details: any = {};

      if (user.coach) {
        try {
          const coachRes = await fetchJSON(EP.ADMIN.users.coachDetails(user._id), {
            method: "GET",
          });
          if (coachRes?.success) {
            details.coach = coachRes.data;
          }
        } catch (err) {
          console.error("Failed to fetch coach details:", err);
        }
      }

      if (user.participant) {
        try {
          const participantRes = await fetchJSON(EP.ADMIN.users.participantDetails(user._id), {
            method: "GET",
          });
          if (participantRes?.success) {
            details.participant = participantRes.data;
          }
        } catch (err) {
          console.error("Failed to fetch participant details:", err);
        }
      }

      if (user.facility && user.facility.length > 0) {
        try {
          const facilityRes = await fetchJSON(EP.ADMIN.users.facilityDetails(user._id), {
            method: "GET",
          });
          if (facilityRes?.success) {
            details.facility = facilityRes.data;
          }
        } catch (err) {
          console.error("Failed to fetch facility details:", err);
        }
      }

      if (user.coach) {
        try {
          const clubRes = await fetchJSON(EP.ADMIN.users.clubDetails(user._id), {
            method: "GET",
          });
          if (clubRes?.success) {
            details.club = clubRes.data;
          }
        } catch (err) {
          console.error("Failed to fetch club details:", err);
        }
      }

      setDetailsData(details);
    } catch (err: any) {
      setError(err.message || "Failed to fetch details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const getProfileSummary = (user: User) => {
    const parts: string[] = [];
    if (user.coach) parts.push("Coach");
    if (user.participant) parts.push("Participant");
    if (user.facility && user.facility.length > 0) parts.push(`Facility Owner (${user.facility.length})`);
    return parts.length > 0 ? parts.join(", ") : "Regular User";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Users Management
        </h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
        >
          Create User
        </button>
      </div>

      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('participant')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'participant'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Participants
          </button>
          <button
            onClick={() => setActiveTab('coach')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'coach'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Coaches
          </button>
          <button
            onClick={() => setActiveTab('facility')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'facility'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Facilities
          </button>
        </nav>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder={`Search ${activeTab}s...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-slate-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700">
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Name
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Email
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Phone
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Terms version
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    KVKK consent
                  </th>
                  {activeTab === 'participant' && (
                    <>
                      <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                        Main Sport
                      </th>
                      <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                        Joined Events
                      </th>
                    </>
                  )}
                  {activeTab === 'coach' && (
                    <>
                      <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                        Certificates
                      </th>
                      <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                        Sports
                      </th>
                      <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                        Events Created
                      </th>
                    </>
                  )}
                  {activeTab === 'facility' && (
                    <>
                      <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                        Facilities Count
                      </th>
                      <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                        Salons Count
                      </th>
                    </>
                  )}
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      {user.email}
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      {user.phone}
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                      {user.termsAccepted?.versionId && typeof user.termsAccepted.versionId === "object" && user.termsAccepted.versionId.version != null
                        ? `v${user.termsAccepted.versionId.version}`
                        : "-"}
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                      {user.kvkkConsent?.agreed ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-500 dark:text-slate-400">No</span>
                      )}
                    </td>
                    {activeTab === 'participant' && (
                      <>
                        <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                          {user.participant?.mainSport && typeof user.participant.mainSport === 'object' && user.participant.mainSport.name 
                            ? user.participant.mainSport.name 
                            : '-'}
                        </td>
                        <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                          {user.summary?.participant?.joinedEventsCount || 0}
                        </td>
                      </>
                    )}
                    {activeTab === 'coach' && (
                      <>
                        <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                          {user.summary?.coach?.certificateCount || 0}
                        </td>
                        <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                          {user.summary?.coach?.sports && user.summary.coach.sports.length > 0
                            ? user.summary.coach.sports.map((s: any) => s.name).join(', ')
                            : '-'}
                        </td>
                        <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                          {user.summary?.coach?.eventsCount || 0}
                        </td>
                      </>
                    )}
                    {activeTab === 'facility' && (
                      <>
                        <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                          {user.summary?.facility?.facilityCount || 0}
                        </td>
                        <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                          {user.summary?.facility?.salonsCount || 0}
                        </td>
                      </>
                    )}
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Edit User
                        </button>
                        {(user.coach || user.participant || (user.facility && user.facility.length > 0)) && (
                          <button
                            onClick={() => handleEditProfile(user)}
                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                          >
                            Edit Profile
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">
              {editingUser ? "Edit User" : "Create User"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Phone
                </label>
                <input
                  ref={adminPhoneRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  value={formData.phone}
                  onChange={handleAdminPhoneChange}
                  placeholder={`${PHONE_PREFIX}XX XXX XX XX`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Age
                </label>
                <input
                  type="date"
                  required
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Password {editingUser && "(leave empty to keep current)"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                >
                  <option value={1}>User</option>
                  <option value={0}>Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  {editingUser ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                User Details: {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedUser(null);
                  setDetailsData(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div className="text-center py-8">Loading details...</div>
            ) : (
              <div className="space-y-6">
                {detailsData?.coach && (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-slate-100">Coach Profile</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Approved Certificates:</span> {detailsData.coach.certificateCount}
                      </p>
                      <p>
                        <span className="font-medium">Events Created (until today):</span> {detailsData.coach.eventsCount}
                      </p>
                      {detailsData.coach.sports && detailsData.coach.sports.length > 0 && (
                        <div>
                          <span className="font-medium">Approved Sports:</span>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {detailsData.coach.sports.map((sport: any) => (
                              <li key={sport._id}>
                                {sport.name} ({sport.groupName})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailsData.coach.branches && detailsData.coach.branches.length > 0 && (
                        <div className="mt-4">
                          <span className="font-medium">All Certificates:</span>
                          <div className="mt-2 space-y-2">
                            {detailsData.coach.branches.map((branch: any) => {
                              const getStatusColor = (status: string) => {
                                switch (status) {
                                  case 'Approved':
                                    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                                  case 'Rejected':
                                    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                                  case 'Pending':
                                    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
                                  default:
                                    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
                                }
                              };

                              return (
                                <div
                                  key={branch._id}
                                  className="border border-gray-200 dark:border-slate-600 rounded-lg p-3 bg-gray-50 dark:bg-slate-700"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {branch.sport.name} ({branch.sport.groupName})
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                                        Level: {branch.level} | Order: {branch.branchOrder}
                                      </div>
                                      {branch.certificate && (
                                        <a
                                          href={`${EP.API_ASSETS_BASE}${branch.certificate.path.startsWith('/') ? branch.certificate.path : `/${branch.certificate.path}`}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-cyan-600 hover:underline mt-1 inline-block"
                                        >
                                          View Certificate
                                        </a>
                                      )}
                                    </div>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(branch.status)}`}
                                    >
                                      {branch.status}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsData?.participant && (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-slate-100">Participant Profile</h4>
                    <div className="space-y-2 text-sm">
                      {detailsData.participant.mainSport && (
                        <p>
                          <span className="font-medium">Main Sport:</span> {detailsData.participant.mainSport.name} ({detailsData.participant.mainSport.groupName})
                        </p>
                      )}
                      {detailsData.participant.events && detailsData.participant.events.length > 0 && (
                        <div>
                          <span className="font-medium">Joined Events ({detailsData.participant.events.length}):</span>
                          <ul className="list-disc list-inside ml-2 mt-1 max-h-40 overflow-y-auto">
                            {detailsData.participant.events.map((event: any) => (
                              <li key={event._id}>
                                {event.name} - {event.sport?.name} ({new Date(event.startTime).toLocaleDateString()})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsData?.facility && (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-slate-100">Facility Owner Profile</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Total Facilities:</span> {detailsData.facility.facilityCount}
                      </p>
                      <p>
                        <span className="font-medium">Total Salons:</span> {detailsData.facility.totalSalons}
                      </p>
                      {detailsData.facility.facilities && detailsData.facility.facilities.length > 0 && (
                        <div>
                          <span className="font-medium">Facilities:</span>
                          <ul className="list-disc list-inside ml-2 mt-1 space-y-2">
                            {detailsData.facility.facilities.map((facility: any) => (
                              <li key={facility._id}>
                                <div className="font-medium">{facility.name}</div>
                                <div className="ml-4 text-xs text-gray-600 dark:text-slate-400">
                                  Sport: {facility.mainSport?.name} | Salons: {facility.salonCount}
                                  {facility.salons && facility.salons.length > 0 && (
                                    <ul className="list-disc list-inside ml-2 mt-1">
                                      {facility.salons.map((salon: any) => (
                                        <li key={salon._id}>{salon.name} - {salon.sport?.name}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsData?.club && (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="font-bold text-lg mb-3 text-gray-900 dark:text-slate-100">Club Owner Profile</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Total Clubs:</span> {detailsData.club.clubCount}
                      </p>
                      <p>
                        <span className="font-medium">Total Groups:</span> {detailsData.club.totalGroups}
                      </p>
                      {detailsData.club.clubs && detailsData.club.clubs.length > 0 && (
                        <div>
                          <span className="font-medium">Clubs:</span>
                          <ul className="list-disc list-inside ml-2 mt-1 space-y-2">
                            {detailsData.club.clubs.map((club: any) => (
                              <li key={club._id}>
                                <div className="font-medium">{club.name}</div>
                                <div className="ml-4 text-xs text-gray-600 dark:text-slate-400">
                                  Groups: {club.groupCount}
                                  {club.groups && club.groups.length > 0 && (
                                    <ul className="list-disc list-inside ml-2 mt-1">
                                      {club.groups.map((group: any) => (
                                        <li key={group._id}>{group.name}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!detailsData?.coach && !detailsData?.participant && !detailsData?.facility && !detailsData?.club && (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    No profile details available for this user.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Edit Modals */}
      {editingProfileUser && editingProfileUser.coach && (
        <AdminCoachModal
          isOpen={showCoachModal}
          onClose={() => {
            setShowCoachModal(false);
            setEditingProfileUser(null);
          }}
          userId={editingProfileUser._id}
          onSuccess={() => {
            fetchUsers();
            setShowCoachModal(false);
            setEditingProfileUser(null);
          }}
        />
      )}

      {editingProfileUser && editingProfileUser.participant && (
        <AdminParticipantModal
          isOpen={showParticipantModal}
          onClose={() => {
            setShowParticipantModal(false);
            setEditingProfileUser(null);
          }}
          userId={editingProfileUser._id}
          onSuccess={() => {
            fetchUsers();
            setShowParticipantModal(false);
            setEditingProfileUser(null);
          }}
        />
      )}

      {editingProfileUser && editingFacility && (
        <AdminFacilityModal
          isOpen={showFacilityModal}
          onClose={() => {
            setShowFacilityModal(false);
            setEditingProfileUser(null);
            setEditingFacility(null);
          }}
          userId={editingProfileUser._id}
          facilityId={editingFacility._id || editingFacility}
          initialData={editingFacility}
          onSuccess={() => {
            fetchUsers();
            setShowFacilityModal(false);
            setEditingProfileUser(null);
            setEditingFacility(null);
          }}
        />
      )}
    </div>
  );
}

// Admin Coach Modal Wrapper
function AdminCoachModal({ isOpen, onClose, userId, onSuccess }: { isOpen: boolean; onClose: () => void; userId: string; onSuccess: () => void }) {
  const handleSubmit = async (formData: any) => {
    // CoachModal now handles admin mode internally
    onSuccess();
  };

  return (
    <CoachModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      adminUserId={userId}
    />
  );
}

// Admin Participant Modal Wrapper
function AdminParticipantModal({ isOpen, onClose, userId, onSuccess }: { isOpen: boolean; onClose: () => void; userId: string; onSuccess: () => void }) {
  const handleSubmit = async (formData: any) => {
    // ParticipantModal now handles admin mode internally
    onSuccess();
  };

  return (
    <ParticipantModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      adminUserId={userId}
    />
  );
}

// Admin Facility Modal Wrapper
function AdminFacilityModal({ isOpen, onClose, userId, facilityId, initialData, onSuccess }: { isOpen: boolean; onClose: () => void; userId: string; facilityId: string; initialData: any; onSuccess: () => void }) {
  const handleSubmit = async (formData: FormData) => {
    try {
      const res = await apiFetch(EP.ADMIN.users.updateFacilityProfile(userId, facilityId), {
        method: "PUT",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error updating facility profile:", err);
    }
  };

  return (
    <FacilityModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialData={initialData}
    />
  );
}

