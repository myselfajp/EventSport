"use client";

import React, { useState, useEffect } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import { Edit, Trash2, Calendar, Filter } from "lucide-react";
import AddEventModal from "../event/AddEventModal";

interface Event {
  _id: string;
  name: string;
  photo?: {
    path?: string;
  };
  sportGroup?: {
    _id: string;
    name: string;
  };
  sport?: {
    _id: string;
    name: string;
  };
  startTime: string;
  endTime: string;
  owner?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
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

const EventsManagement: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    sportGroup: "",
    sport: "",
    startDate: "",
    endDate: "",
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 20,
  });

  useEffect(() => {
    fetchSportGroups();
  }, []);

  useEffect(() => {
    if (filters.sportGroup) {
      fetchSports(filters.sportGroup);
    } else {
      setSports([]);
    }
  }, [filters.sportGroup]);

  useEffect(() => {
    fetchEvents();
  }, [pagination.currentPage, filters]);

  const fetchSportGroups = async () => {
    try {
      const response = await fetchJSON(EP.REFERENCE.sportGroup.get, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
        },
      });
      if (response?.success && response?.data) {
        setSportGroups(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching sport groups:", err);
    }
  };

  const fetchSports = async (sportGroupId: string) => {
    try {
      const response = await fetchJSON(EP.REFERENCE.sport.get, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
          groupId: sportGroupId,
        },
      });
      if (response?.success && response?.data) {
        setSports(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching sports:", err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const payload: any = {
        perPage: pagination.perPage,
        pageNumber: pagination.currentPage,
      };

      if (filters.sportGroup) {
        payload.sportGroup = filters.sportGroup;
      }

      if (filters.sport) {
        payload.sport = filters.sport;
      }

      if (filters.startDate) {
        payload.startTime = new Date(filters.startDate).toISOString();
      }

      if (filters.endDate) {
        payload.endTime = new Date(filters.endDate).toISOString();
      }

      const response = await fetchJSON(EP.EVENTS.getEvents, {
        method: "POST",
        body: payload,
      });

      if (response?.success && response?.data) {
        setEvents(response.data);
        if (response.pagination) {
          setPagination({
            currentPage: response.pagination.currentPage || 1,
            totalPages: response.pagination.totalPages || 1,
            total: response.pagination.total || 0,
            perPage: response.pagination.perPage || 20,
          });
        }
      } else {
        setError(response?.message || "Failed to load events");
        setEvents([]);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingEvent(null);
    fetchEvents();
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      setError("");
      const COACH_DATA_API = EP.COACH.createEvent.replace('/create-event', '');
      const response = await fetchJSON(
        `${COACH_DATA_API}/delete-event/${eventId}`,
        {
          method: "DELETE",
        }
      );

      if (response?.success) {
        fetchEvents();
      } else {
        setError(response?.message || response?.error || "Failed to delete event");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to delete event");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getImageUrl = (photo?: { path?: string }) => {
    if (photo?.path) {
      return `${EP.API_ASSETS_BASE}/${photo.path}`.replace(/\\/g, "/");
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Events Management
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Filters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
              Sport Group
            </label>
            <select
              value={filters.sportGroup}
              onChange={(e) => handleFilterChange("sportGroup", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value="">All Sport Groups</option>
              {sportGroups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
              Sport
            </label>
            <select
              value={filters.sport}
              onChange={(e) => handleFilterChange("sport", e.target.value)}
              disabled={!filters.sportGroup}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Sports</option>
              {sports.map((sport) => (
                <option key={sport._id} value={sport._id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-4">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-slate-400">
          No events found.
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Sport Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Sport
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      End Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {events.map((event) => (
                    <tr key={event._id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getImageUrl(event.photo) ? (
                          <img
                            src={getImageUrl(event.photo)!}
                            alt={event.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 dark:bg-slate-600 rounded flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-gray-400 dark:text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {event.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {event.sportGroup?.name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {event.sport?.name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {formatDate(event.startTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {formatDate(event.endTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {event.owner
                            ? `${event.owner.firstName} ${event.owner.lastName}`
                            : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(event)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(event._id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    currentPage: Math.max(1, prev.currentPage - 1),
                  }))
                }
                disabled={pagination.currentPage === 1}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-slate-300">
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    currentPage: Math.min(prev.totalPages, prev.currentPage + 1),
                  }))
                }
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit Event Modal */}
      {isEditModalOpen && editingEvent && (
        <AddEventModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
          initialData={editingEvent}
        />
      )}
    </div>
  );
};

export default EventsManagement;

