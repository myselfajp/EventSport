"use client";

import { useState, useEffect } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";

export default function NotificationManagement() {
  const [scope, setScope] = useState<"user" | "global" | "role" | "group">("user");
  const [type, setType] = useState<string>("system_announcement");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [actionUrl, setActionUrl] = useState("");
  const [icon, setIcon] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  
  // For user scope
  const [userId, setUserId] = useState("");
  
  // For role scope
  const [targetRole, setTargetRole] = useState<number>(1);
  
  // For group scope
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsersData, setSelectedUsersData] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const notificationTypes = [
    { value: "event_created", label: "Event Created" },
    { value: "event_updated", label: "Event Updated" },
    { value: "event_cancelled", label: "Event Cancelled" },
    { value: "reservation_approved", label: "Reservation Approved" },
    { value: "reservation_rejected", label: "Reservation Rejected" },
    { value: "reservation_reminder", label: "Reservation Reminder" },
    { value: "certificate_approved", label: "Certificate Approved" },
    { value: "certificate_rejected", label: "Certificate Rejected" },
    { value: "join_request_approved", label: "Join Request Approved" },
    { value: "join_request_rejected", label: "Join Request Rejected" },
    { value: "invite_received", label: "Invite Received" },
    { value: "message_received", label: "Message Received" },
    { value: "follow_new_event", label: "Follow New Event" },
    { value: "system_announcement", label: "System Announcement" },
    { value: "maintenance_notice", label: "Maintenance Notice" },
  ];

  const icons = [
    { value: "bell", label: "Bell" },
    { value: "check-circle", label: "Check Circle" },
    { value: "x-circle", label: "X Circle" },
    { value: "calendar", label: "Calendar" },
    { value: "user", label: "User" },
    { value: "alert", label: "Alert" },
    { value: "info", label: "Info" },
  ];

  const fetchUsers = async (search: string = "") => {
    try {
      const response = await fetchJSON(EP.ADMIN.users.getAll, {
        method: "POST",
        body: {
          perPage: 50,
          pageNumber: 1,
          search: search,
        },
      });
      if (response?.success) {
        const users = response.data || [];
        // Filter out already selected users
        const filteredUsers = users.filter(
          (user: any) => !selectedUserIds.includes(user._id)
        );
        setAvailableUsers(filteredUsers);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleUserSearch = (search: string) => {
    setUserSearch(search);
    if (search.length > 0) {
      fetchUsers(search);
    } else {
      setAvailableUsers([]);
    }
  };

  const addUserToGroup = (user: any) => {
    if (!selectedUserIds.includes(user._id)) {
      setSelectedUserIds([...selectedUserIds, user._id]);
      setTargetUsers([...targetUsers, user._id]);
      setSelectedUsersData([...selectedUsersData, user]);
    }
    setUserSearch("");
    setAvailableUsers([]);
  };

  const removeUserFromGroup = (userId: string) => {
    setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    setTargetUsers(targetUsers.filter((id) => id !== userId));
    setSelectedUsersData(selectedUsersData.filter((u) => u._id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const notificationData: any = {
        scope,
        type,
        title,
        message,
        priority,
      };

      if (scope === "user") {
        if (!userId) {
          setError("User ID is required for user scope");
          setLoading(false);
          return;
        }
        notificationData.userId = userId;
      } else if (scope === "role") {
        notificationData.targetRole = targetRole;
      } else if (scope === "group") {
        if (targetUsers.length === 0) {
          setError("At least one user is required for group scope");
          setLoading(false);
          return;
        }
        notificationData.targetUsers = targetUsers;
      }

      if (actionUrl) {
        notificationData.actionUrl = actionUrl;
      }

      if (icon) {
        notificationData.icon = icon;
      }

      if (expiresAt) {
        notificationData.expiresAt = expiresAt;
      }

      const response = await fetchJSON(EP.NOTIFICATIONS.create, {
        method: "POST",
        body: notificationData,
      });

      if (response?.success) {
        setSuccess("Notification created successfully!");
        // Reset form
        setTitle("");
        setMessage("");
        setActionUrl("");
        setExpiresAt("");
        setUserId("");
        setSelectedUserIds([]);
        setTargetUsers([]);
      } else {
        setError(response?.message || "Failed to create notification");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Send Notification
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Scope Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Scope <span className="text-red-500">*</span>
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          >
            <option value="user">Single User</option>
            <option value="global">All Users (Global)</option>
            <option value="role">By Role</option>
            <option value="group">Selected Users (Group)</option>
          </select>
        </div>

        {/* User ID (for user scope) */}
        {scope === "user" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              User ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* Target Role (for role scope) */}
        {scope === "role" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Target Role <span className="text-red-500">*</span>
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value={0}>Admin</option>
              <option value={1}>User</option>
            </select>
          </div>
        )}

        {/* Group Users (for group scope) */}
        {scope === "group" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Select Users <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
              {availableUsers.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-600 rounded-lg max-h-40 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => addUserToGroup(user)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-gray-800 dark:text-slate-200"
                    >
                      {user.firstName} {user.lastName} ({user.email})
                    </button>
                  ))}
                </div>
              )}
              {selectedUserIds.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                    Selected Users ({selectedUserIds.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsersData.map((user) => (
                      <span
                        key={user._id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 rounded text-sm"
                      >
                        {user.firstName} {user.lastName} ({user.email})
                        <button
                          type="button"
                          onClick={() => removeUserFromGroup(user._id)}
                          className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          >
            {notificationTypes.map((nt) => (
              <option key={nt.value} value={nt.value}>
                {nt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message"
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Action URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Action URL (Optional)
          </label>
          <input
            type="text"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="/events/123"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Icon (Optional)
          </label>
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          >
            <option value="">None</option>
            {icons.map((ic) => (
              <option key={ic.value} value={ic.value}>
                {ic.label}
              </option>
            ))}
          </select>
        </div>

        {/* Expires At */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Expires At (Optional)
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Notification"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTitle("");
              setMessage("");
              setActionUrl("");
              setExpiresAt("");
              setUserId("");
              setSelectedUserIds([]);
              setTargetUsers([]);
              setSelectedUsersData([]);
              setSelectedUsersData([]);
              setError("");
              setSuccess("");
            }}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

