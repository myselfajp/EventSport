"use client";

import React, { useState, useEffect } from "react";
import { Search, User, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import {
  User as UserType,
  UserSearchFilters,
  UserSearchResponse,
  SportGroup,
  Sport,
  SportGroupResponse,
  SportResponse,
} from "@/app/lib/types";

interface UserSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (user: UserType) => void;
}

const UserSearch: React.FC<UserSearchProps> = ({
  isOpen,
  onClose,
  onUserSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sportGroupFilter, setSportGroupFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [users, setUsers] = useState<UserType[]>([]);
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSportGroups, setIsLoadingSportGroups] = useState(false);
  const [isLoadingSports, setIsLoadingSports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 10,
  });

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

  const searchUsers = async (filters: UserSearchFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: any = {
        perPage: filters.perPage || 10,
        pageNumber: filters.pageNumber || 1,
      };

      if (filters.search && filters.search.trim().length >= 2) {
        payload.search = filters.search.trim();
      }

      if (filters.mainSport) {
        payload.mainSport = filters.mainSport;
      }

      const response: UserSearchResponse = await fetchJSON(EP.AUTH.getUsers, {
        method: "POST",
        body: payload,
      });

      if (response?.success && response?.data) {
        setUsers(response.data);
        setPagination({
          currentPage: response.pageNumber || 1,
          totalPages: response.totalPages || 1,
          total: response.total || 0,
          perPage: response.perPage || 10,
        });
      } else {
        setError(response?.message || "Failed to search users");
        setUsers([]);
      }
    } catch (err) {
      setError("An error occurred while searching users");
      setUsers([]);
      console.error("Error searching users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSportsAndGroups();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter sports based on selected sport group
    if (sportGroupFilter) {
      // Sports are already loaded, just filter them
      setSportFilter("");
    } else {
      setSportFilter("");
    }
  }, [sportGroupFilter]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2 || sportFilter) {
      const timeoutId = setTimeout(() => {
        searchUsers({
          search: searchQuery,
          mainSport: sportFilter,
          pageNumber: 1,
          perPage: pagination.perPage,
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setUsers([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        total: 0,
        perPage: 10,
      });
    }
  }, [searchQuery, sportFilter]);

  const handlePageChange = (page: number) => {
    searchUsers({
      search: searchQuery,
      mainSport: sportFilter,
      pageNumber: page,
      perPage: pagination.perPage,
    });
  };

  const handleUserClick = (user: UserType) => {
    onUserSelect(user);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Search Users
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Search and Filter */}
          <div className="space-y-3">
            {/* Search Bar - Full Width */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by first name or last name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-500 w-full text-base"
              />
            </div>

            {/* Filters - Side by Side on All Screens */}
            <div className="flex gap-3">
              <select
                value={sportGroupFilter}
                onChange={(e) => {
                  setSportGroupFilter(e.target.value);
                  setSportFilter("");
                }}
                disabled={isLoadingSportGroups}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50 text-base"
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
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50 text-base"
              >
                <option value="">
                  {!sportGroupFilter
                    ? "Select sport group first"
                    : isLoadingSports
                    ? "Loading..."
                    : "All sports"}
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
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery.trim().length >= 2 || sportFilter
                ? "No users found"
                : "Enter at least 2 characters or select a sport to search"}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleUserClick(user)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                      {user.photo ? (
                        <img
                          src={user.photo}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-cyan-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="flex gap-1 mt-1">
                        {user.participant && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Participant
                          </span>
                        )}
                        {user.coach && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            Coach
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {users.length > 0 && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(pagination.currentPage - 1) * pagination.perPage + 1} to{" "}
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
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;
