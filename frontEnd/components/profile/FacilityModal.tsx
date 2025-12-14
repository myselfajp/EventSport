"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Loader,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getSports,
  addSalon,
  updateSalon,
  deleteSalon,
  getSalons,
} from "@/app/lib/facility-api";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

interface FacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<any> | any;
  initialData?: FacilityFormData | null;
}

interface FacilityFormData {
  _id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  photo: string;
  mainSport: string | { _id: string; name: string };
  isPrivate: boolean;
}

interface SalonFormData {
  id: string; // temp id for UI or _id for existing
  _id?: string; // real backend id
  name: string;
  sport: string;
  sportGroup: string;
  priceInfo: string;
  isNew?: boolean;
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

const FacilityModal: React.FC<FacilityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
}) => {
  // Facility State
  const [formData, setFormData] = useState<FacilityFormData>({
    name: "",
    address: "",
    phone: "",
    email: "",
    photo: "",
    mainSport: "",
    isPrivate: false,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Salon State
  const [salons, setSalons] = useState<SalonFormData[]>([]);
  const [deletedSalons, setDeletedSalons] = useState<string[]>([]); // Track IDs of salons to delete

  // Dirty Checking State
  const initialFormState = useRef<string>("");
  const initialSalonsState = useRef<string>("");

  // UI State
  const [expandedSection, setExpandedSection] = useState<
    "facility" | "salon" | null
  >("facility");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Dropdown State
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<{
    type: "group" | "sport";
    index?: number;
  } | null>(null);

  // Fetch Sport Groups
  useEffect(() => {
    if (isOpen) {
      fetchJSON(EP.REFERENCE.sportGroup, {
        method: "POST",
        body: { perPage: 100, pageNumber: 1 },
      }).then((res) => {
        if (res.success && res.data) {
          setSportGroups(res.data);
        }
      });
    }
  }, [isOpen]);

  // Fetch Sports
  useEffect(() => {
    if (isOpen) {
      getSports(1, 100).then((data) => setSports(data));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      const initialForm = {
        ...initialData,
        mainSport:
          typeof initialData.mainSport === "object"
            ? initialData.mainSport._id
            : initialData.mainSport,
      };
      setFormData(initialForm);
      initialFormState.current = JSON.stringify(initialForm);

      if (initialData.photo) {
        setPhotoPreview(initialData.photo);
      }
      setPhotoFile(null);
      setExpandedSection("facility");

      // Fetch existing salons
      if (initialData._id) {
        getSalons(initialData._id).then((fetchedSalons) => {
          const formattedSalons = fetchedSalons.map((s: any) => ({
            id: s._id,
            _id: s._id,
            name: s.name,
            sport: s.sport,
            sportGroup: s.sportGroup,
            priceInfo: s.priceInfo,
            isNew: false,
          }));
          setSalons(formattedSalons);
          initialSalonsState.current = JSON.stringify(formattedSalons);
        });
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    const emptyForm = {
      name: "",
      address: "",
      phone: "",
      email: "",
      photo: "",
      mainSport: "",
      isPrivate: false,
    };
    setFormData(emptyForm);
    initialFormState.current = JSON.stringify(emptyForm);
    setPhotoPreview(null);
    setPhotoFile(null);
    setSalons([]);
    initialSalonsState.current = JSON.stringify([]);
    setDeletedSalons([]);
    setErrors({});
    setGeneralError("");
    setExpandedSection("facility");
  };

  const handleInputChange = (
    field: keyof FacilityFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setGeneralError("");
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
      setPhotoFile(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    handleInputChange("photo", "");
    setPhotoFile(null);
  };

  // Salon Management
  const handleAddSalon = () => {
    setSalons((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        sport: "",
        sportGroup: "",
        priceInfo: "",
        isNew: true,
      },
    ]);
    setExpandedSection("salon");
  };

  const handleRemoveSalon = (index: number) => {
    const salonToRemove = salons[index];
    if (!salonToRemove.isNew && salonToRemove._id) {
      setDeletedSalons((prev) => [...prev, salonToRemove._id!]);
    }
    setSalons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSalonChange = (
    index: number,
    field: keyof SalonFormData,
    value: string
  ) => {
    setSalons((prev) =>
      prev.map((salon, i) => {
        if (i !== index) return salon;

        const updates: Partial<SalonFormData> = { [field]: value };

        if (field === "sportGroup") {
          updates.sport = ""; // Reset sport when group changes
        }

        return { ...salon, ...updates };
      })
    );
  };

  const getSportGroupName = (groupId: string) => {
    const group = sportGroups.find((g) => g._id === groupId);
    return group ? group.name : "Select Sport Group";
  };

  const getSportName = (sportId: string) => {
    const sport = sports.find((s) => s._id === sportId);
    return sport ? sport.name : "Select Sport";
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Facility Validation
    if (!initialData) {
      if (!formData.name) newErrors.name = "Facility Name is required";
      if (!formData.address) newErrors.address = "Address is required";
      if (!formData.phone) newErrors.phone = "Phone is required";
      if (!formData.email) newErrors.email = "E-mail is required";
      if (!formData.mainSport) newErrors.mainSport = "Main Sport is required";
      if (!photoFile && !formData.photo)
        newErrors.photo = "Facility Photo is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.phone && !/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format";
    }

    // Salon Validation
    salons.forEach((salon, index) => {
      if (!salon.name) newErrors[`salon_${index}_name`] = "Name is required";
      if (!salon.sportGroup)
        newErrors[`salon_${index}_sportGroup`] = "Sport Group is required";
      if (!salon.sport) newErrors[`salon_${index}_sport`] = "Sport is required";
      if (!salon.priceInfo)
        newErrors[`salon_${index}_priceInfo`] = "Price info is required";
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
    }

    return isValid;
  };

  const isFacilityDirty = () => {
    if (photoFile) return true; // Photo changed
    return JSON.stringify(formData) !== initialFormState.current;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setErrors({});

    if (!validateForm()) {
      setGeneralError("Please fix the errors below.");
      return;
    }

    setIsLoading(true);

    try {
      let facilityId = initialData?._id;

      // 1. Save Facility (Only if dirty or new)
      if (!initialData || isFacilityDirty()) {
        const submitData = new FormData();
        const facilityData = {
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          mainSport: formData.mainSport,
          private: formData.isPrivate,
        };

        submitData.append("data", JSON.stringify(facilityData));
        if (photoFile) {
          submitData.append("facility-photo", photoFile);
        }

        const result = await onSubmit(submitData);
        if (result?._id) {
          facilityId = result._id;
        }
      }

      // 2. Process Salons
      if (facilityId) {
        const promises: Promise<any>[] = [];

        // Add New Salons
        const newSalons = salons.filter((s) => s.isNew);
        newSalons.forEach((salon) => {
          promises.push(
            addSalon(facilityId!, {
              name: salon.name,
              sport: salon.sport,
              sportGroup: salon.sportGroup,
              priceInfo: salon.priceInfo,
            })
          );
        });

        // Update Existing Salons (Only if dirty)
        const existingSalons = salons.filter((s) => !s.isNew);
        const initialSalons = JSON.parse(initialSalonsState.current || "[]");

        existingSalons.forEach((salon) => {
          const initialSalon = initialSalons.find(
            (s: any) => s._id === salon._id
          );
          const isDirty =
            !initialSalon ||
            salon.name !== initialSalon.name ||
            salon.sport !== initialSalon.sport ||
            salon.sportGroup !== initialSalon.sportGroup ||
            salon.priceInfo !== initialSalon.priceInfo;

          if (isDirty && salon._id) {
            promises.push(
              updateSalon(salon._id, {
                name: salon.name,
                sport: salon.sport,
                sportGroup: salon.sportGroup,
                priceInfo: salon.priceInfo,
              })
            );
          }
        });

        // Delete Salons
        deletedSalons.forEach((salonId) => {
          promises.push(deleteSalon(salonId));
        });

        await Promise.all(promises);
      }

      setIsSuccess(true);

      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        resetForm();
      }, 1500);
    } catch (err: any) {
      console.error("Error submitting facility:", err);
      setGeneralError(
        err.message || "Failed to save facility. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
    setIsLoading(false);
    setIsSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Edit Facility" : "Add Facility"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto dark:bg-gray-800">
          {isSuccess ? (
            <div className="p-12 flex flex-col items-center justify-center text-center h-full">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Success!
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Facility saved successfully.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Section 1: Edit Facility */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "facility" ? null : "facility"
                    )
                  }
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <span className="font-medium text-gray-800 dark:text-white">
                    Edit Facility
                  </span>
                  {expandedSection === "facility" ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {expandedSection === "facility" && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Facility Name{" "}
                            {!initialData && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            placeholder="Enter facility name"
                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                              errors.name
                                ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                            }`}
                            disabled={isLoading}
                          />
                          {errors.name && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.name}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Address{" "}
                            {!initialData && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <textarea
                            value={formData.address}
                            onChange={(e) =>
                              handleInputChange("address", e.target.value)
                            }
                            placeholder="Enter address"
                            rows={3}
                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                              errors.address
                                ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                            }`}
                            disabled={isLoading}
                          />
                          {errors.address && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.address}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone{" "}
                            {!initialData && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              handleInputChange("phone", e.target.value)
                            }
                            placeholder="Enter phone number"
                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                              errors.phone
                                ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                            }`}
                            disabled={isLoading}
                          />
                          {errors.phone && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.phone}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            E-mail{" "}
                            {!initialData && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            placeholder="Enter email address"
                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                              errors.email
                                ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                            }`}
                            disabled={isLoading}
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.email}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Main Sport{" "}
                            {!initialData && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <select
                            value={
                              typeof formData.mainSport === "string"
                                ? formData.mainSport
                                : formData.mainSport?._id
                            }
                            onChange={(e) =>
                              handleInputChange("mainSport", e.target.value)
                            }
                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-700 dark:text-white ${
                              errors.mainSport
                                ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                : "border-gray-200 dark:border-gray-600 focus:ring-cyan-500"
                            }`}
                            disabled={isLoading}
                          >
                            <option value="">Select a sport</option>
                            {sports.map((sport: any) => (
                              <option key={sport._id} value={sport._id}>
                                {sport.name}
                              </option>
                            ))}
                          </select>
                          {errors.mainSport && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.mainSport}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center pt-2">
                          <input
                            type="checkbox"
                            id="isPrivate"
                            checked={formData.isPrivate}
                            onChange={(e) =>
                              handleInputChange("isPrivate", e.target.checked)
                            }
                            className="w-4 h-4 text-cyan-500 border-gray-300 dark:border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                            disabled={isLoading}
                          />
                          <label
                            htmlFor="isPrivate"
                            className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Private Facility
                          </label>
                        </div>
                      </div>

                      {/* Right Column - Photo */}
                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Facility Photo
                        </label>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-full">
                            <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors cursor-pointer">
                              {photoPreview ? (
                                <div className="flex flex-col items-center space-y-3">
                                  <img
                                    src={photoPreview}
                                    alt="Facility preview"
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
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                disabled={isLoading}
                              />
                            </div>
                            {errors.photo && (
                              <p className="mt-2 text-xs text-red-500 text-center">
                                {errors.photo}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Add Salon */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "salon" ? null : "salon"
                    )
                  }
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <span className="font-medium text-gray-800 dark:text-white">
                    Add Salon
                  </span>
                  {expandedSection === "salon" ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {expandedSection === "salon" && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4">
                    {salons.map((salon, index) => (
                      <div
                        key={salon.id}
                        className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 relative"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveSalon(index)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-6">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Salon Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={salon.name}
                              onChange={(e) =>
                                handleSalonChange(index, "name", e.target.value)
                              }
                              placeholder="e.g., Main Hall"
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 ${
                                errors[`salon_${index}_name`]
                                  ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                  : "border-gray-200 dark:border-gray-500 focus:ring-cyan-500"
                              }`}
                            />
                            {errors[`salon_${index}_name`] && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors[`salon_${index}_name`]}
                              </p>
                            )}
                          </div>

                          {/* Sport Group Selection */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Sport Group{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveDropdown(
                                    activeDropdown?.type === "group" &&
                                      activeDropdown.index === index
                                      ? null
                                      : { type: "group", index }
                                  )
                                }
                                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-600 text-left flex items-center justify-between ${
                                  errors[`salon_${index}_sportGroup`]
                                    ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                    : "border-gray-200 dark:border-gray-500 focus:ring-cyan-500"
                                }`}
                              >
                                <span
                                  className={
                                    salon.sportGroup
                                      ? "text-gray-800 dark:text-white"
                                      : "text-gray-400 dark:text-gray-400"
                                  }
                                >
                                  {getSportGroupName(salon.sportGroup)}
                                </span>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              </button>

                              {activeDropdown?.type === "group" &&
                                activeDropdown.index === index && (
                                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {sportGroups.map((group) => (
                                      <button
                                        key={group._id}
                                        type="button"
                                        onClick={() => {
                                          handleSalonChange(
                                            index,
                                            "sportGroup",
                                            group._id
                                          );
                                          setActiveDropdown(null);
                                        }}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-white transition-colors"
                                      >
                                        {group.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                            {errors[`salon_${index}_sportGroup`] && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors[`salon_${index}_sportGroup`]}
                              </p>
                            )}
                          </div>

                          {/* Sport Selection */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Sport <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  if (salon.sportGroup) {
                                    setActiveDropdown(
                                      activeDropdown?.type === "sport" &&
                                        activeDropdown.index === index
                                        ? null
                                        : { type: "sport", index }
                                    );
                                  }
                                }}
                                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-600 text-left flex items-center justify-between ${
                                  errors[`salon_${index}_sport`]
                                    ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                    : "border-gray-200 dark:border-gray-500 focus:ring-cyan-500"
                                } ${
                                  !salon.sportGroup
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                disabled={!salon.sportGroup}
                              >
                                <span
                                  className={
                                    salon.sport
                                      ? "text-gray-800 dark:text-white"
                                      : "text-gray-400 dark:text-gray-400"
                                  }
                                >
                                  {getSportName(salon.sport)}
                                </span>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              </button>

                              {activeDropdown?.type === "sport" &&
                                activeDropdown.index === index && (
                                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {sports
                                      .filter(
                                        (s) => s.group === salon.sportGroup
                                      )
                                      .map((sport) => (
                                        <button
                                          key={sport._id}
                                          type="button"
                                          onClick={() => {
                                            handleSalonChange(
                                              index,
                                              "sport",
                                              sport._id
                                            );
                                            setActiveDropdown(null);
                                          }}
                                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-white transition-colors"
                                        >
                                          {sport.name}
                                        </button>
                                      ))}
                                  </div>
                                )}
                            </div>
                            {errors[`salon_${index}_sport`] && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors[`salon_${index}_sport`]}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Price Info <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={salon.priceInfo}
                              onChange={(e) =>
                                handleSalonChange(
                                  index,
                                  "priceInfo",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., $50/hour"
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 ${
                                errors[`salon_${index}_priceInfo`]
                                  ? "border-red-300 focus:ring-red-200 dark:border-red-500"
                                  : "border-gray-200 dark:border-gray-500 focus:ring-cyan-500"
                              }`}
                            />
                            {errors[`salon_${index}_priceInfo`] && (
                              <p className="mt-1 text-xs text-red-500">
                                {errors[`salon_${index}_priceInfo`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddSalon}
                      className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-cyan-400 dark:hover:border-cyan-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors flex items-center justify-center font-medium text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add {salons.length > 0 ? "Another " : ""}Salon
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {generalError && (
          <div className="px-6 pb-4">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
              {generalError}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {!isSuccess && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacilityModal;
