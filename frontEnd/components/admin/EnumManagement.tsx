"use client";

import { useState, useEffect } from "react";
import { fetchJSON, apiFetch } from "../../app/lib/api";
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
  icon?: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface SportGoal {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface EventStyle {
  _id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

type TabType = "sports" | "sportGoals" | "eventStyles" | "enums";

export default function EnumManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("sports");
  
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showSportGroupModal, setShowSportGroupModal] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [editingSportGroup, setEditingSportGroup] = useState<SportGroup | null>(null);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  
  const [sportGoals, setSportGoals] = useState<SportGoal[]>([]);
  const [showSportGoalModal, setShowSportGoalModal] = useState(false);
  
  const [eventStyles, setEventStyles] = useState<EventStyle[]>([]);
  const [showEventStyleModal, setShowEventStyleModal] = useState(false);
  
  const [eventTypes, setEventTypes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin_eventTypes");
      return stored ? JSON.parse(stored) : ["Indoor", "Outdoor", "Online"];
    }
    return ["Indoor", "Outdoor", "Online"];
  });
  const [priceTypes, setPriceTypes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin_priceTypes");
      return stored ? JSON.parse(stored) : ["Manual", "Stable", "Free"];
    }
    return ["Manual", "Stable", "Free"];
  });
  const [membershipLevels, setMembershipLevels] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin_membershipLevels");
      return stored ? JSON.parse(stored) : ["Gold", "Platinum", "Bronze", "Silver"];
    }
    return ["Gold", "Platinum", "Bronze", "Silver"];
  });
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [showPriceTypeModal, setShowPriceTypeModal] = useState(false);
  const [showMembershipLevelModal, setShowMembershipLevelModal] = useState(false);
  const [editingEnumValue, setEditingEnumValue] = useState<string>("");
  const [editingEnumIndex, setEditingEnumIndex] = useState<number>(-1);
  const [enumType, setEnumType] = useState<"eventType" | "priceType" | "membershipLevel">("eventType");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", color: "#000000" });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "sports") {
      fetchSportGroups();
    } else if (activeTab === "sportGoals") {
      fetchSportGoals();
    } else if (activeTab === "eventStyles") {
      fetchEventStyles();
    }
  }, [activeTab]);

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

  const fetchSportGoals = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchJSON(EP.REFERENCE.sportGoal.get, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
        },
      });

      if (response?.success) {
        setSportGoals(response.data);
      } else {
        setError(response?.message || response?.error || "Failed to fetch sport goals");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to fetch sport goals");
    } finally {
      setLoading(false);
    }
  };

  const fetchEventStyles = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchJSON(EP.REFERENCE.eventStyle.get, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
        },
      });

      if (response?.success) {
        setEventStyles(response.data);
      } else {
        setError(response?.message || response?.error || "Failed to fetch event styles");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to fetch event styles");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSportGroup = () => {
    setEditingSportGroup(null);
    setFormData({ name: "", color: "#000000" });
    setShowSportGroupModal(true);
  };

  const handleEditSportGroup = (sportGroup: SportGroup) => {
    setEditingSportGroup(sportGroup);
    setFormData({ name: sportGroup.name, color: "#000000" });
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
    setFormData({ name: "", color: "#000000" });
    setIconFile(null);
    setIconPreview(null);
    setShowSportModal(true);
  };

  const handleEditSport = (sport: Sport) => {
    setEditingSport(sport);
    setFormData({ name: sport.name, color: "#000000" });
    setIconFile(null);
    if (sport.icon?.path) {
      setIconPreview(getImageUrl(sport.icon.path) || null);
    } else {
      setIconPreview(null);
    }
    setShowSportModal(true);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
        setError("Allowed file types: png, jpg, jpeg");
        return;
      }
      setIconFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setIconPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeIcon = () => {
    setIconFile(null);
    setIconPreview(null);
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

  const getImageUrl = (path: string) => {
    if (!path) return "";
    // Convert path like "frontEnd/public/gog-icons/car.png" to "/gog-icons/car.png"
    const normalizedPath = path.replace(/^.*\/public\//, "/").replace(/\\/g, "/");
    // If path already starts with /gog-icons/, use it directly
    if (normalizedPath.startsWith("/gog-icons/")) {
      return normalizedPath;
    }
    // Otherwise use API_ASSETS_BASE
    return `${EP.API_ASSETS_BASE}/${path}`.replace(/\\/g, "/");
  };

  const handleSubmitSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      setError("");
      const url = editingSport
        ? EP.REFERENCE.sport.update(editingSport._id)
        : EP.REFERENCE.sport.create(selectedGroup);

      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      
      if (iconFile) {
        formDataToSend.append("icon", iconFile);
      }

      const res = await apiFetch(url, {
        method: editingSport ? "PUT" : "POST",
        body: formDataToSend,
      });

      const response = await res.json();

      if (response?.success) {
        setShowSportModal(false);
        setIconFile(null);
        setIconPreview(null);
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

  const handleCreateSportGoal = () => {
    setFormData({ name: "", color: "#000000" });
    setShowSportGoalModal(true);
  };


  const handleDeleteSportGoal = async (sportGoalId: string) => {
    if (!confirm("Are you sure you want to delete this sport goal?")) {
      return;
    }

    try {
      setError("");
      const response = await fetchJSON(EP.REFERENCE.sportGoal.delete(sportGoalId), {
        method: "DELETE",
      });

      if (response?.success) {
        fetchSportGoals();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete sport goal");
    }
  };

  const handleSubmitSportGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      const url = EP.REFERENCE.sportGoal.create;

      const response = await fetchJSON(url, {
        method: "POST",
        body: { name: formData.name },
      });

      if (response?.success) {
        setShowSportGoalModal(false);
        fetchSportGoals();
      } else {
        setError(response?.message || response?.error || "Failed to save sport goal");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to save sport goal");
    }
  };

  const handleCreateEventStyle = () => {
    setFormData({ name: "", color: "#000000" });
    setShowEventStyleModal(true);
  };


  const handleDeleteEventStyle = async (eventStyleId: string) => {
    if (!confirm("Are you sure you want to delete this event style?")) {
      return;
    }

    try {
      setError("");
      const response = await fetchJSON(EP.REFERENCE.eventStyle.delete(eventStyleId), {
        method: "DELETE",
      });

      if (response?.success) {
        fetchEventStyles();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete event style");
    }
  };

  const handleSubmitEventStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      const url = EP.REFERENCE.eventStyle.create;

      const response = await fetchJSON(url, {
        method: "POST",
        body: { name: formData.name, color: formData.color },
      });

      if (response?.success) {
        setShowEventStyleModal(false);
        fetchEventStyles();
      } else {
        setError(response?.message || response?.error || "Failed to save event style");
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Failed to save event style");
    }
  };

  const handleCreateEnum = (type: "eventType" | "priceType" | "membershipLevel") => {
    setEnumType(type);
    setEditingEnumValue("");
    setEditingEnumIndex(-1);
    if (type === "eventType") {
      setShowEventTypeModal(true);
    } else if (type === "priceType") {
      setShowPriceTypeModal(true);
    } else {
      setShowMembershipLevelModal(true);
    }
  };

  const handleEditEnum = (type: "eventType" | "priceType" | "membershipLevel", index: number) => {
    setEnumType(type);
    let value = "";
    if (type === "eventType") {
      value = eventTypes[index];
    } else if (type === "priceType") {
      value = priceTypes[index];
    } else {
      value = membershipLevels[index];
    }
    setEditingEnumValue(value);
    setEditingEnumIndex(index);
    if (type === "eventType") {
      setShowEventTypeModal(true);
    } else if (type === "priceType") {
      setShowPriceTypeModal(true);
    } else {
      setShowMembershipLevelModal(true);
    }
  };

  const handleDeleteEnum = (type: "eventType" | "priceType" | "membershipLevel", index: number) => {
    if (!confirm("Are you sure you want to delete this value?")) {
      return;
    }

    if (type === "eventType") {
      const newTypes = eventTypes.filter((_, i) => i !== index);
      setEventTypes(newTypes);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_eventTypes", JSON.stringify(newTypes));
      }
    } else if (type === "priceType") {
      const newTypes = priceTypes.filter((_, i) => i !== index);
      setPriceTypes(newTypes);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_priceTypes", JSON.stringify(newTypes));
      }
    } else {
      const newTypes = membershipLevels.filter((_, i) => i !== index);
      setMembershipLevels(newTypes);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_membershipLevels", JSON.stringify(newTypes));
      }
    }
  };

  const handleSubmitEnum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnumValue.trim()) {
      setError("Value cannot be empty");
      return;
    }

    if (enumType === "eventType") {
      if (editingEnumIndex >= 0) {
        const newTypes = [...eventTypes];
        newTypes[editingEnumIndex] = editingEnumValue.trim();
        setEventTypes(newTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_eventTypes", JSON.stringify(newTypes));
        }
      } else {
        const newTypes = [...eventTypes, editingEnumValue.trim()];
        setEventTypes(newTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_eventTypes", JSON.stringify(newTypes));
        }
      }
      setShowEventTypeModal(false);
    } else if (enumType === "priceType") {
      if (editingEnumIndex >= 0) {
        const newTypes = [...priceTypes];
        newTypes[editingEnumIndex] = editingEnumValue.trim();
        setPriceTypes(newTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_priceTypes", JSON.stringify(newTypes));
        }
      } else {
        const newTypes = [...priceTypes, editingEnumValue.trim()];
        setPriceTypes(newTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_priceTypes", JSON.stringify(newTypes));
        }
      }
      setShowPriceTypeModal(false);
    } else {
      if (editingEnumIndex >= 0) {
        const newTypes = [...membershipLevels];
        newTypes[editingEnumIndex] = editingEnumValue.trim();
        setMembershipLevels(newTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_membershipLevels", JSON.stringify(newTypes));
        }
      } else {
        const newTypes = [...membershipLevels, editingEnumValue.trim()];
        setMembershipLevels(newTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_membershipLevels", JSON.stringify(newTypes));
        }
      }
      setShowMembershipLevelModal(false);
    }
    setEditingEnumValue("");
    setEditingEnumIndex(-1);
    setError("");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
        Reference Data Management
      </h2>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("sports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "sports"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            Sports
          </button>
          <button
            onClick={() => setActiveTab("sportGoals")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "sportGoals"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            Sport Goals
          </button>
          <button
            onClick={() => setActiveTab("eventStyles")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "eventStyles"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            Event Styles
          </button>
          <button
            onClick={() => setActiveTab("enums")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "enums"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            Enums
          </button>
        </nav>
      </div>

      {activeTab === "sports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="flex-1 flex items-center gap-3">
                          {sport.icon?.path && (
                            <img
                              src={getImageUrl(sport.icon.path)}
                              alt={sport.name}
                              className="w-6 h-6 object-contain brightness-0 dark:brightness-0 dark:invert"
                            />
                          )}
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
      )}

      {activeTab === "sportGoals" && (
        <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Sport Goals
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {sportGoals.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                    No sport goals
                  </p>
                ) : (
                  sportGoals.map((goal) => (
                    <div
                      key={goal._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600"
                    >
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {goal.name}
                      </span>
                      <button
                        onClick={() => handleDeleteSportGoal(goal._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={handleCreateSportGoal}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Add Sport Goal
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === "eventStyles" && (
        <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Event Styles
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {eventStyles.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                    No event styles
                  </p>
                ) : (
                  eventStyles.map((style) => (
                    <div
                      key={style._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded border border-gray-300 dark:border-slate-600"
                          style={{ backgroundColor: style.color }}
                        />
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          {style.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteEventStyle(style._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={handleCreateEventStyle}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Add Event Style
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === "enums" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Event Types
              </h3>
            </div>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {eventTypes.length === 0 ? (
                <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                  No event types
                </p>
              ) : (
                eventTypes.map((type, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600"
                  >
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {type}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditEnum("eventType", index)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEnum("eventType", index)}
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
              onClick={() => handleCreateEnum("eventType")}
              className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
            >
              Add Event Type
            </button>
          </div>

          <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Price Types
              </h3>
            </div>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {priceTypes.length === 0 ? (
                <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                  No price types
                </p>
              ) : (
                priceTypes.map((type, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600"
                  >
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {type}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditEnum("priceType", index)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEnum("priceType", index)}
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
              onClick={() => handleCreateEnum("priceType")}
              className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
            >
              Add Price Type
            </button>
          </div>

          <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Membership Levels
              </h3>
            </div>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {membershipLevels.length === 0 ? (
                <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                  No membership levels
                </p>
              ) : (
                membershipLevels.map((level, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600"
                  >
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {level}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditEnum("membershipLevel", index)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEnum("membershipLevel", index)}
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
              onClick={() => handleCreateEnum("membershipLevel")}
              className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
            >
              Add Membership Level
            </button>
          </div>
        </div>
      )}

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
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Icon
                </label>
                {iconPreview && (
                  <div className="mb-2 relative inline-block">
                    <img
                      src={iconPreview}
                      alt="Icon preview"
                      className="w-16 h-16 object-contain border border-gray-300 dark:border-slate-600 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeIcon}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleIconUpload}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Upload an icon image (PNG, JPG, JPEG). Leave empty to keep existing icon or have no icon.
                </p>
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

      {/* Sport Goal Modal */}
      {showSportGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">
              Create Sport Goal
            </h3>
            <form onSubmit={handleSubmitSportGoal} className="space-y-4">
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
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowSportGoalModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Style Modal */}
      {showEventStyleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">
              Create Event Style
            </h3>
            <form onSubmit={handleSubmitEventStyle} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-16 h-10 border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    required
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowEventStyleModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enum Modals */}
      {(showEventTypeModal || showPriceTypeModal || showMembershipLevelModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-slate-100">
              {editingEnumIndex >= 0 ? "Edit" : "Create"}{" "}
              {enumType === "eventType"
                ? "Event Type"
                : enumType === "priceType"
                ? "Price Type"
                : "Membership Level"}
            </h3>
            <form onSubmit={handleSubmitEnum} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Value
                </label>
                <input
                  type="text"
                  required
                  value={editingEnumValue}
                  onChange={(e) => setEditingEnumValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  {editingEnumIndex >= 0 ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEventTypeModal(false);
                    setShowPriceTypeModal(false);
                    setShowMembershipLevelModal(false);
                    setEditingEnumValue("");
                    setEditingEnumIndex(-1);
                  }}
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
