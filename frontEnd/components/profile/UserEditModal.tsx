"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import { apiFetch } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import {
  PHONE_PREFIX,
  processPhoneInput,
  normalizePhoneForDisplay,
  isPhoneComplete,
} from "@/app/lib/phone-utils";
import CascadingLocationFields, {
  normalizeCountry,
} from "@/components/location/CascadingLocationFields";
import { emptyLocationValue, type LocationValue } from "@/app/lib/location-api";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function locationFromUser(user: {
  location?: {
    country?: string;
    state?: string;
    city?: string;
    district?: string | { _id?: string; name?: string };
    districtName?: string;
    postalCode?: string;
    addressLine?: string;
  };
}): LocationValue {
  const loc = user.location || {};
  const country = normalizeCountry(loc.country);
  const districtDocName =
    typeof loc.district === "object" && loc.district?.name
      ? String(loc.district.name)
      : "";

  // Legacy Istanbul users: only the district ObjectId is set.
  const city =
    loc.city || (country === "TR" && districtDocName ? "İstanbul" : "");
  const districtName = loc.districtName || districtDocName || "";

  return {
    ...emptyLocationValue(),
    country,
    state: loc.state || "",
    stateCode: "",
    city,
    provinceSlug: "",
    district: "",
    districtName,
    postalCode: loc.postalCode || "",
    addressLine: loc.addressLine?.trim() || "",
  };
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose }) => {
  const { data: user } = useMe();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: PHONE_PREFIX,
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [locationValue, setLocationValue] = useState<LocationValue>(emptyLocationValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [changePassword, setChangePassword] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: normalizePhoneForDisplay(user.phone) || PHONE_PREFIX,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setLocationValue(locationFromUser(user));
      setChangePassword(false);
      setError("");
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!phoneInputRef.current) return;
    const len = formData.phone.length;
    phoneInputRef.current.setSelectionRange(len, len);
  }, [formData.phone]);

  const handleInputChange = (
    field: keyof UserFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = processPhoneInput(e.target.value);
    handleInputChange("phone", next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.phone && !isPhoneComplete(formData.phone)) {
      setError(`Enter full Turkish phone (9 digits after ${PHONE_PREFIX})`);
      return;
    }

    const country = normalizeCountry(locationValue.country);
    if (country === "TR") {
      if (!locationValue.city) {
        setError("Lütfen şehir (il) seçin.");
        return;
      }
      if (!locationValue.districtName) {
        setError("Lütfen ilçe seçin.");
        return;
      }
      if (!locationValue.postalCode?.trim()) {
        setError("Lütfen posta kodunu girin.");
        return;
      }
    } else {
      if (!locationValue.state) {
        setError("Please select your state.");
        return;
      }
      if (!locationValue.city?.trim()) {
        setError("Please enter your city.");
        return;
      }
      if (!locationValue.postalCode?.trim()) {
        setError("Please enter your ZIP code.");
        return;
      }
    }

    if (changePassword) {
      if (!formData.oldPassword) {
        setError("Old password is required");
        return;
      }
      if (!formData.newPassword) {
        setError("New password is required");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError("New password and confirm password do not match");
        return;
      }
      if (formData.newPassword.length < 7) {
        setError("Password must be at least 7 characters");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        country,
        city: (locationValue.city || "").trim(),
        postalCode: (locationValue.postalCode || "").trim(),
      };
      if (country === "TR") {
        payload.districtName = (locationValue.districtName || "").trim();
      } else {
        payload.state = (locationValue.state || "").trim();
      }
      const addressLine = (locationValue.addressLine || "").trim();
      if (addressLine) payload.addressLine = addressLine;

      if (changePassword) {
        payload.oldPassword = formData.oldPassword;
        payload.newPassword = formData.newPassword;
      }

      // Remove undefined values
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const res = await apiFetch(EP.AUTH.editUser, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || body?.error || "Failed to update user");
      }

      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update user information");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            <input
              ref={phoneInputRef}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder={`${PHONE_PREFIX}XX XXX XX XX`}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              If you move, update your location so nearby events and
              recommendations stay accurate.
            </p>
            <CascadingLocationFields
              value={locationValue}
              onChange={setLocationValue}
              disabled={loading}
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => setChangePassword(e.target.checked)}
                className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Change Password
              </span>
            </label>
          </div>

          {changePassword && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Old Password
                </label>
                <input
                  type="password"
                  value={formData.oldPassword}
                  onChange={(e) =>
                    handleInputChange("oldPassword", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) =>
                    handleInputChange("newPassword", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  minLength={7}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  minLength={7}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;

