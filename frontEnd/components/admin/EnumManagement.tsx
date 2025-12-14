"use client";

import { useState, useEffect } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";

interface SportGroup {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface Sport {
  _id: string;
  name: string;
  group: string;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

export default function EnumManagement() {
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showSportGroupModal, setShowSportGroupModal] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [editingSportGroup, setEditingSportGroup] = useState<SportGroup | null>(null);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  useEffect(() => {
    fetchSportGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchSports(selectedGroup);
    } else {
      setSports([]);
    }
  }, [selectedGroup]);

  const fetchSportGroups = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchJSON(EP.REFERENCE.sportGroup.get, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
        },
      });

      if (response?.success) {
        setSportGroups(response.data);
        if (response.data.length > 0 && !selectedGroup) {
          setSelectedGroup(response.data[0]._id);
        }
      } else {
        setError(response?.message || response?.error || "Failed to fetch sport groups");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to fetch sport groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchSports = async (groupId: string) => {
    try {
      setError("");
      const response = await fetchJSON(EP.REFERENCE.sport.get, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
          groupId: groupId,
        },
      });

      if (response?.success) {
        setSports(response.data);
      } else {
        setError(response?.message || response?.error || "Failed to fetch sports");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to fetch sports");
    }
  };

  const handleCreateSportGroup = () => {
    setEditingSportGroup(null);
    setFormData({ name: "" });
    setShowSportGroupModal(true);
  };

  const handleEditSportGroup = (sportGroup: SportGroup) => {
    setEditingSportGroup(sportGroup);
    setFormData({ name: sportGroup.name });
    setShowSportGroupModal(true);
  };

  const handleDeleteSportGroup = async (sportGroupId: string) => {
    if (!confirm("Are you sure you want to delete this sport group? All related sports will also be deleted.")) {
      return;
    }

    try {
      setError("");
      const response = await fetchJSON(EP.REFERENCE.sportGroup.delete(sportGroupId), {
        method: "DELETE",
      });

      if (response?.success) {
        fetchSportGroups();
        if (selectedGroup === sportGroupId) {
          setSelectedGroup(null);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete sport group");
    }
  };

  const handleSubmitSportGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      const url = editingSportGroup
        ? EP.REFERENCE.sportGroup.update(editingSportGroup._id)
        : EP.REFERENCE.sportGroup.create;

      const response = await fetchJSON(url, {
        method: editingSportGroup ? "PUT" : "POST",
        body: { name: formData.name },
      });

      if (response?.success) {
        setShowSportGroupModal(false);
        fetchSportGroups();
      } else {
        setError(response?.message || response?.error || "Failed to save sport group");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to save sport group");
    }
  };

  const handleCreateSport = () => {
    if (!selectedGroup) {
      setError("Please select a sport group first. Sports must belong to a sport group.");
      return;
    }
    setEditingSport(null);
    setFormData({ name: "" });
    setShowSportModal(true);
  };

  const handleEditSport = (sport: Sport) => {
    setEditingSport(sport);
    setFormData({ name: sport.name });
    setShowSportModal(true);
  };

  const handleDeleteSport = async (sportId: string) => {
    if (!confirm("Are you sure you want to delete this sport?")) {
      return;
    }

    try {
      setError("");
      const response = await fetchJSON(EP.REFERENCE.sport.delete(sportId), {
        method: "DELETE",
      });

      if (response?.success && selectedGroup) {
        fetchSports(selectedGroup);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete sport");
    }
  };

  const handleSubmitSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      setError("");
      const url = editingSport
        ? EP.REFERENCE.sport.update(editingSport._id)
        : EP.REFERENCE.sport.create(selectedGroup);

      const response = await fetchJSON(url, {
        method: editingSport ? "PUT" : "POST",
        body: { name: formData.name },
      });

      if (response?.success) {
        setShowSportModal(false);
        if (selectedGroup) {
          fetchSports(selectedGroup);
        }
      } else {
        setError(response?.message || response?.error || "Failed to save sport");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to save sport");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
        Enum Management
      </h2>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sport Groups */}
        <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Sport Groups
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {sportGroups.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                    No sport groups
                  </p>
                ) : (
                  sportGroups.map((group) => (
                    <div
                      key={group._id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedGroup === group._id
                          ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500"
                          : "bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedGroup(group._id)}
                        className="flex-1 text-left font-medium text-gray-900 dark:text-slate-100"
                      >
                        {group.name}
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSportGroup(group)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSportGroup(group._id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={handleCreateSportGroup}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Add Sport Group
              </button>
            </>
          )}
        </div>

        {/* Sports */}
        <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Sports
              </h3>
              {selectedGroup && (
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  Group: {sportGroups.find((g) => g._id === selectedGroup)?.name || "Unknown"}
                </p>
              )}
            </div>
          </div>

          {!selectedGroup ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-slate-400 mb-2">
                Select a sport group first
              </p>
              <p className="text-sm text-gray-400 dark:text-slate-500">
                Sports must belong to a sport group
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {sports.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                    No sports in this group
                  </p>
                ) : (
                  sports.map((sport) => (
                    <div
                      key={sport._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          {sport.name}
                        </span>
                        {sport.groupName && (
                          <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                            ({sport.groupName})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSport(sport)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSport(sport._id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={handleCreateSport}
                disabled={!selectedGroup}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Sport to {selectedGroup ? sportGroups.find((g) => g._id === selectedGroup)?.name : "Group"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sport Group Modal */}
      {showSportGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">
              {editingSportGroup ? "Edit Sport Group" : "Create Sport Group"}
            </h3>
            <form onSubmit={handleSubmitSportGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  {editingSportGroup ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSportGroupModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sport Modal */}
      {showSportModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">
              {editingSport ? "Edit Sport" : "Create Sport"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Group: {sportGroups.find((g) => g._id === selectedGroup)?.name || "Unknown"}
            </p>
            <form onSubmit={handleSubmitSport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Sport Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  placeholder="Enter sport name"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  {editingSport ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSportModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
