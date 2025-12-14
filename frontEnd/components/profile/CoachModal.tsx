"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Upload, Trash2, ChevronDown } from "lucide-react";
import { EP } from "@/app/lib/endpoints";
import { fetchJSON, apiFetch } from "@/app/lib/api";
import { useMe } from "@/app/hooks/useAuth";

interface CoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CoachFormData) => void;
}

interface SportGroup {
  _id: string;
  name: string;
}

interface Sport {
  _id: string;
  name: string;
  group: string;
  groupName: string;
}

interface Branch {
  _id?: string;
  sport: string;
  sportGroup: string;
  branchOrder: number;
  level: number;
  certificate: File | null;
  certificatePreview: string | null;
  sportName?: string;
  sportGroupName?: string;
  existingCertificate?: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
}

interface CoachFormData {
  branches: Branch[];
  about: string;
}

const CoachModal: React.FC<CoachModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { data: user, isLoading: userLoading } = useMe();
  const coachId = user?.coach;

  const [formData, setFormData] = useState<CoachFormData>({
    branches: [],
    about: "",
  });

  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [activeSportGroupDropdown, setActiveSportGroupDropdown] = useState<
    number | null
  >(null);
  const [activeSportDropdown, setActiveSportDropdown] = useState<number | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && !userLoading) {
      loadData();
    }
  }, [isOpen, coachId, userLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setActiveSportGroupDropdown(null);
        setActiveSportDropdown(null);
      }
    };

    if (activeSportGroupDropdown !== null || activeSportDropdown !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeSportGroupDropdown, activeSportDropdown]);

  const loadData = async () => {
    setInitializing(true);
    try {
      if (coachId) {
        await fetchCoachData();
        setIsEditMode(true);
      } else {
        resetForm();
      }
    } finally {
      setInitializing(false);
    }
  };

  const fetchCoachData = async () => {
    if (!coachId) return;

    try {
      const [branchesRes, sportGroupsRes, coachDetailsRes] = await Promise.all([
        fetchJSON(`${EP.COACH.getCurrentBranches}`, { method: "GET" }),
        fetchJSON(EP.REFERENCE.sportGroup, {
          method: "POST",
          body: { perPage: 100, pageNumber: 1 },
        }),
        fetchJSON(EP.COACH.getCoachById(coachId), { method: "GET" }),
      ]);

      if (
        branchesRes.success &&
        branchesRes.data &&
        Array.isArray(branchesRes.data)
      ) {
        const sportGroupsData = sportGroupsRes.data || [];
        setSportGroups(sportGroupsData);

        const branches: Branch[] = branchesRes.data.map(
          (branch: any, index: number) => {
            const sportGroupId =
              sportGroupsData.find(
                (sg: SportGroup) => sg.name === branch.sportGroup
              )?._id || "";

            return {
              _id: branch._id,
              sport: branch.sport || "",
              sportGroup: sportGroupId,
              branchOrder: branch.branchOrder || index + 1,
              level: branch.level || 5,
              certificate: null,
              certificatePreview: null,
              sportName: branch.sportName || "",
              sportGroupName: branch.sportGroup || "",
              existingCertificate: branch.certificate
                ? {
                    path: branch.certificate.path,
                    originalName: branch.certificate.originalName,
                    mimeType: branch.certificate.mimeType,
                    size: branch.certificate.size,
                  }
                : undefined,
            };
          }
        );

        const about =
          coachDetailsRes.success && coachDetailsRes.data?.coach?.about
            ? coachDetailsRes.data.coach.about
            : "";

        setFormData({ branches, about });

        const uniqueSportGroups = [
          ...new Set(branches.map((b) => b.sportGroup).filter(Boolean)),
        ];
        if (uniqueSportGroups.length > 0) {
          const allSports: Sport[] = [];
          for (const groupId of uniqueSportGroups) {
            const sportsRes = await fetchJSON(EP.REFERENCE.sport, {
              method: "POST",
              body: {
                perPage: 50,
                pageNumber: 1,
                groupId: groupId,
              },
            });
            if (sportsRes.success && sportsRes.data) {
              allSports.push(...sportsRes.data);
            }
          }
          setSports(allSports);
        }
      }
    } catch (err) {
      console.error("Error fetching coach data:", err);
    }
  };

  const fetchSportGroups = async () => {
    setLoading(true);
    try {
      const res = await fetchJSON(EP.REFERENCE.sportGroup, {
        method: "POST",
        body: { perPage: 50, pageNumber: 1 },
      });

      if (res.success && res.data) {
        setSportGroups(res.data);
      }
    } catch (err) {
      console.error("Error fetching sport groups:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSportsInGroup = async (groupId: string) => {
    setLoading(true);
    try {
      const res = await fetchJSON(EP.REFERENCE.sport, {
        method: "POST",
        body: {
          perPage: 50,
          pageNumber: 1,
          groupId: groupId,
        },
      });

      if (res.success && res.data) {
        setSports(res.data);
      }
    } catch (err) {
      console.error("Error fetching sports:", err);
    } finally {
      setLoading(false);
    }
  };

  const addBranch = () => {
    const newBranch: Branch = {
      sport: "",
      sportGroup: "",
      branchOrder: formData.branches.length + 1,
      level: 5,
      certificate: null,
      certificatePreview: null,
    };
    setFormData((prev) => ({
      ...prev,
      branches: [...prev.branches, newBranch],
    }));
  };

  const removeBranch = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== index),
    }));
  };

  const updateBranch = (
    index: number,
    field: keyof Branch,
    value: any,
    displayName?: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) => {
        if (i !== index) return branch;

        const updated = { ...branch, [field]: value };

        if (field === "sportGroup") {
          updated.sport = "";
          updated.sportName = "";
          if (displayName) updated.sportGroupName = displayName;
          if (value) {
            fetchSportsInGroup(value);
          }
        }

        if (field === "sport" && displayName) {
          updated.sportName = displayName;
        }

        return updated;
      }),
    }));
    setError("");
  };

  const handleFileUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      updateBranch(index, "certificate", file);
      updateBranch(index, "certificatePreview", preview);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.branches.length === 0) {
      setError("Please add at least one branch");
      return;
    }

    for (const branch of formData.branches) {
      if (!branch.sport || !branch.level) {
        setError("Please fill in all required fields for each branch");
        return;
      }

      if (!isEditMode && !branch.certificate) {
        setError("Please upload a certificate for each branch");
        return;
      }
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      const newCertificates: File[] = [];

      const sportsData = formData.branches.map((branch, index) => {
        console.log(`Branch ${index + 1} - Sport ID:`, branch.sport);

        const sportData: any = {
          sport: branch.sport,
          branchOrder: index + 1,
          level: branch.level,
        };

        // Handle certificate data based on type
        if (branch.existingCertificate && !branch.certificate) {
          // EXISTING certificate (update mode) - include full certificate data in JSON
          const oldOriginalName = branch.existingCertificate.originalName;
          const fileExtension = oldOriginalName.split(".").pop();
          const newOriginalName = `coach-certificate-sportId=${branch.sport}.${fileExtension}`;

          sportData.certificate = {
            path: branch.existingCertificate.path,
            originalName: newOriginalName,
            mimeType: branch.existingCertificate.mimeType,
            size: branch.existingCertificate.size,
          };
        } else if (branch.certificate) {
          // NEW certificate upload - don't include certificate in JSON, upload file instead
          // Backend will create certificate from uploaded file
          newCertificates.push(branch.certificate);
          // Note: NO certificate in JSON - backend will use uploaded file
        }

        return sportData;
      });

      formDataToSend.append("data", JSON.stringify(sportsData));
      console.log(
        "Final sportsData being sent:",
        JSON.stringify(sportsData, null, 2)
      );

      // Upload new certificate files
      formData.branches.forEach((branch, index) => {
        if (branch.certificate && !branch.existingCertificate) {
          const fileExtension = branch.certificate.name.split(".").pop();
          const fileName = `coach-certificate-sportId=${branch.sport}.${fileExtension}`;

          const renamedFile = new File([branch.certificate], fileName, {
            type: branch.certificate.type,
            lastModified: branch.certificate.lastModified,
          });

          formDataToSend.append("coach-certificate", renamedFile);
        }
      });

      const res = await apiFetch(EP.COACH.createProfileAndBranch, {
        method: "POST",
        body: formDataToSend,
      });

      const json = await res.json();

      if (json.success) {
        // Also update the 'about' field if it has changed
        if (formData.about) {
          await apiFetch(EP.COACH.editCoach, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ about: formData.about }),
          });
        }

        onSubmit(formData);
        handleClose();
      } else {
        setError(json.message || "Failed to save coach profile");
      }
    } catch (err) {
      console.error("Error saving coach profile:", err);
      setError("Failed to save coach profile");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ branches: [], about: "" });
    setIsEditMode(false);
  };

  const handleClose = () => {
    onClose();
    setError("");
    resetForm();
  };

  const getSportGroupName = (branch: Branch) => {
    if (!branch.sportGroup) return "Select Sport Group";
    if (branch.sportGroupName) return branch.sportGroupName;
    const group = sportGroups.find((g) => g._id === branch.sportGroup);
    return group ? group.name : "Select Sport Group";
  };

  const getSportName = (branch: Branch) => {
    if (!branch.sport) return "Select Sport";
    if (branch.sportName) return branch.sportName;
    const sport = sports.find((s) => s._id === branch.sport);
    return sport ? sport.name : "Select Sport";
  };

  if (!isOpen) return null;

  if (userLoading || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {isEditMode ? "Edit Coach Profile" : "Create Coach Profile"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 dark:bg-gray-800">
          {initializing && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading profile...</p>
              </div>
            </div>
          )}

          <div
            className={
              initializing ? "opacity-0 pointer-events-none" : "space-y-6"
            }
          >
            {/* About Section */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                About Me
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio / Description
                </label>
                <textarea
                  value={formData.about}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, about: e.target.value }))
                  }
                  placeholder="Tell us about your coaching experience, philosophy, etc..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors min-h-[120px] resize-y dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
                  disabled={loading || initializing}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                Coach Branches ({formData.branches.length})
              </h3>
              <button
                type="button"
                onClick={addBranch}
                className="flex items-center px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
                disabled={loading || initializing}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Branch
              </button>
            </div>

            {formData.branches.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No branches added yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Add your first branch to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.branches.map((branch, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-medium text-gray-800 dark:text-white">
                        Branch {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeBranch(index)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        disabled={loading || initializing}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Sport Group <span className="text-red-500">*</span>
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() => {
                              if (sportGroups.length === 0) {
                                fetchSportGroups();
                              }
                              setActiveSportGroupDropdown(
                                activeSportGroupDropdown === index
                                  ? null
                                  : index
                              );
                            }}
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-left flex items-center justify-between bg-white dark:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading || initializing}
                          >
                            <span
                              className={
                                branch.sportGroup
                                  ? "text-gray-800 dark:text-white"
                                  : "text-gray-400 dark:text-gray-400"
                              }
                            >
                              {getSportGroupName(branch)}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </button>

                          {activeSportGroupDropdown === index && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {loading ? (
                                <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                  Loading...
                                </div>
                              ) : sportGroups.length > 0 ? (
                                sportGroups.map((group) => (
                                  <button
                                    key={group._id}
                                    type="button"
                                    onClick={() => {
                                      updateBranch(
                                        index,
                                        "sportGroup",
                                        group._id,
                                        group.name
                                      );
                                      setActiveSportGroupDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors first:rounded-t-lg last:rounded-b-lg dark:text-white"
                                  >
                                    {group.name}
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                  No sport groups available
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Sport <span className="text-red-500">*</span>
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() => {
                              if (branch.sportGroup) {
                                setActiveSportDropdown(
                                  activeSportDropdown === index ? null : index
                                );
                              }
                            }}
                            className={`w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-left flex items-center justify-between bg-white dark:bg-gray-600 ${
                              !branch.sportGroup || loading || initializing
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            disabled={
                              loading || !branch.sportGroup || initializing
                            }
                          >
                            <span
                              className={
                                branch.sport ? "text-gray-800 dark:text-white" : "text-gray-400 dark:text-gray-400"
                              }
                            >
                              {getSportName(branch)}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </button>

                          {activeSportDropdown === index &&
                            branch.sportGroup && (
                              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {loading ? (
                                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                    Loading...
                                  </div>
                                ) : sports.length > 0 ? (
                                  sports
                                    .filter(
                                      (s) => s.group === branch.sportGroup
                                    )
                                    .map((sport) => (
                                      <button
                                        key={sport._id}
                                        type="button"
                                        onClick={() => {
                                          updateBranch(
                                            index,
                                            "sport",
                                            sport._id,
                                            sport.name
                                          );
                                          setActiveSportDropdown(null);
                                        }}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors first:rounded-t-lg last:rounded-b-lg dark:text-white"
                                      >
                                        {sport.name}
                                      </button>
                                    ))
                                ) : (
                                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                    No sports in this group
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                        {!branch.sportGroup && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Please select a sport group first
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Level (1-10) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={branch.level}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (value >= 1 && value <= 10) {
                              updateBranch(index, "level", value);
                            }
                          }}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-600 dark:text-white"
                          disabled={loading || initializing}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Certificate{" "}
                          {!isEditMode && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <div className="relative">
                          <div className="border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-lg p-3 text-center hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors cursor-pointer">
                            {branch.certificatePreview ? (
                              <div className="space-y-2">
                                <img
                                  src={branch.certificatePreview}
                                  alt="Certificate preview"
                                  className="h-20 w-full object-cover rounded"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {branch.certificate?.name}
                                </p>
                              </div>
                            ) : branch.existingCertificate ? (
                              <div className="space-y-2">
                                <Upload className="w-8 h-8 mx-auto text-green-500 dark:text-green-400" />
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  {branch.existingCertificate.originalName}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  Click to change
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" />
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Upload certificate
                                </p>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/png,image/jpg,image/jpeg,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(index, file);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={loading || initializing}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || initializing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || initializing}
            >
              {loading ? "Saving..." : isEditMode ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoachModal;
