"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload } from "lucide-react";
import {
  PHONE_PREFIX,
  processPhoneInput,
  normalizePhoneForDisplay,
  isPhoneComplete,
} from "@/app/lib/phone-utils";
import {
  COMPANY_TYPE_OPTIONS,
  type CompanyType,
} from "@/app/lib/company-types";
import { EP } from "@/app/lib/endpoints";
import { fetchJSON } from "@/app/lib/api";
import LocationFields, {
  emptyLocationValue,
} from "@/components/location/LocationFields";
import type { LocationValue } from "@/app/lib/location-api";

type CompanyModalInitialData = Omit<CompanyFormData, "photo"> & {
  _id?: string;
  photo?: string | { path: string };
};

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CompanyFormData) => void;
  initialData?: CompanyModalInitialData | null;
}

interface CompanyFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  photo: string;
  companyType: CompanyType | "";
  mainSport: string;
  district?: string;
  addressLine?: string;
}

const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
}) => {
  const emptyForm: CompanyFormData = {
    name: "",
    address: "",
    phone: PHONE_PREFIX,
    email: "",
    photo: "",
    companyType: "",
    mainSport: "",
  };

  const [formData, setFormData] = useState<CompanyFormData>(emptyForm);
  const [locationValue, setLocationValue] = useState<LocationValue>(
    emptyLocationValue()
  );
  const [sports, setSports] = useState<{ _id: string; name: string }[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetchJSON(EP.REFERENCE.sport.get, {
          method: "POST",
          body: { perPage: 200, pageNumber: 1 },
        });
        if (res?.success && Array.isArray(res.data)) {
          setSports(res.data);
        }
      } catch {
        setSports([]);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      const rawPhoto = initialData.photo;
      const photo =
        typeof rawPhoto === "string"
          ? rawPhoto
          : rawPhoto &&
              typeof rawPhoto === "object" &&
              "path" in rawPhoto &&
              rawPhoto.path
            ? EP.assetUrl(rawPhoto.path)
            : "";
      const type = initialData.companyType;
      setFormData({
        name: initialData.name ?? "",
        address: initialData.address ?? "",
        phone: normalizePhoneForDisplay(initialData.phone) || PHONE_PREFIX,
        email: initialData.email ?? "",
        photo,
        companyType:
          type === "sponsor" || type === "sport" ? type : "sport",
        mainSport:
          typeof initialData.mainSport === "string"
            ? initialData.mainSport
            : (initialData.mainSport as { _id?: string })?._id || "",
      });
      const loc = (initialData as { location?: { district?: string; addressLine?: string } })
        .location;
      if (loc?.district) {
        setLocationValue({
          district: String(loc.district),
          addressLine: loc.addressLine || "",
        });
      } else {
        setLocationValue(emptyLocationValue());
      }
      if (photo) setPhotoPreview(photo);
      else setPhotoPreview(null);
    } else {
      setFormData(emptyForm);
      setPhotoPreview(null);
      setLocationValue(emptyLocationValue());
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!phoneInputRef.current) return;
    const len = formData.phone.length;
    phoneInputRef.current.setSelectionRange(len, len);
  }, [formData.phone]);

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPhotoPreview(result);
        handleInputChange("photo", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    handleInputChange("photo", "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || (!locationValue.district && !formData.address?.trim())) {
      setError("Name and Istanbul district (or address) are required");
      return;
    }

    if (!formData.companyType) {
      setError("Please select a company type");
      return;
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Please enter a valid email address");
        return;
      }
    }

    if (formData.phone && !isPhoneComplete(formData.phone)) {
      setError(`Enter full Turkish phone (9 digits after ${PHONE_PREFIX})`);
      return;
    }

    onSubmit({
      ...formData,
      district: locationValue.district,
      addressLine: locationValue.addressLine,
    });
    onClose();
    setFormData(emptyForm);
    setPhotoPreview(null);
  };

  const handleClose = () => {
    onClose();
    setError("");
    setFormData(emptyForm);
    setPhotoPreview(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Edit Company" : "Add Company"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Form Fields */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter company name"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  required
                />
              </div>

              {/* Company type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {COMPANY_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.companyType === option.value
                          ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-cyan-300 dark:hover:border-cyan-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="companyType"
                        value={option.value}
                        checked={formData.companyType === option.value}
                        onChange={() =>
                          handleInputChange("companyType", option.value)
                        }
                        className="mt-1 w-4 h-4 text-cyan-500 border-gray-300 dark:border-gray-600 focus:ring-cyan-500"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-800 dark:text-white">
                          {option.label}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Main sport
                </label>
                <select
                  value={formData.mainSport}
                  onChange={(e) => handleInputChange("mainSport", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select sport (optional)</option>
                  {sports.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Istanbul district <span className="text-red-500">*</span>
                </label>
                <LocationFields
                  value={locationValue}
                  onChange={setLocationValue}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Right Column - Photo Upload */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Photo
              </label>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full">
                  <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors cursor-pointer">
                    {photoPreview ? (
                      <div className="flex flex-col items-center space-y-3">
                        <img
                          src={photoPreview}
                          alt="Company preview"
                          className="h-48 w-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors text-sm font-medium"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Click to upload photo
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            PNG, JPG, JPEG up to 10MB
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpg,image/jpeg"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
            >
              {initialData ? "Update Company" : "Add Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyModal;
