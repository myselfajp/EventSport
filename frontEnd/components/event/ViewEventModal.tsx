"use client";

import React, { useState, useEffect } from "react";
import { X, ImageIcon, UserPlus, CheckCircle, CreditCard, Copy, Check } from "lucide-react";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import { apiFetch } from "@/app/lib/api";

interface Event {
  _id: string;
  name: string;
  photo?: {
    path?: string;
  };
  banner?: {
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
  club?: {
    _id: string;
    name: string;
  };
  group?: {
    _id: string;
    name: string;
  };
  eventStyle?: {
    name: string;
    color: string;
  };
  facility?: {
    _id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    photo?: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
    mainSport?: string;
    membershipLevel?: string;
    private?: boolean;
    point?: number;
    createdAt?: string;
  };
  salon?: {
    _id: string;
    name: string;
  };
  location?: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  capacity?: number;
  level?: number;
  type?: string;
  priceType?: string;
  participationFee?: number;
  equipment?: string;
  private?: boolean;
  isRecurring?: boolean;
  owner?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    coach?: string;
  } | string;
  backupCoach?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    coach?: string;
  } | string;
  backuoCoach?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    coach?: string;
  } | string;
  [key: string]: any;
}

interface ViewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onCoachClick: (coachId: string) => void;
  onFacilityClick?: (facility: Event['facility']) => void;
}

const ViewEventModal: React.FC<ViewEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onCoachClick,
  onFacilityClick,
}) => {
  const { data: user } = useMe();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinStatus, setJoinStatus] = useState<{
    _id?: string;
    isWaitListed?: boolean;
    isApproved?: boolean;
    isCheckedIn?: boolean;
    isPaid?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showCheckInConfirm, setShowCheckInConfirm] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isWithinDeadline, setIsWithinDeadline] = useState(false);

  // Calculate if within deadline (less than 2 days to event start)
  const isFreeEvent = event?.priceType === 'Free';
  
  useEffect(() => {
    if (event?.startTime) {
      const now = new Date();
      const eventStart = new Date(event.startTime);
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      const timeDiff = eventStart.getTime() - now.getTime();
      setIsWithinDeadline(timeDiff < twoDaysInMs && timeDiff > 0);
    }
  }, [event?.startTime]);

  // Check if user is owner or backupCoach
  const ownerId = typeof event?.owner === 'object' && event?.owner !== null ? event.owner._id : event?.owner;
  const backupCoachId = typeof event?.backupCoach === 'object' && event?.backupCoach !== null ? event.backupCoach._id : event?.backupCoach;
  const isOwner = ownerId === user?._id;
  const isBackupCoach = backupCoachId === user?._id;
  const isEventCreator = isOwner || isBackupCoach;
  const isParticipant = !!user?.participant;

  // Check if user has joined this event
  useEffect(() => {
    if (!isOpen || !event || !user?.participant) {
      setHasJoined(false);
      setJoinStatus(null);
      return;
    }

    // Fetch reservation status from backend
    const fetchReservationStatus = async () => {
      try {
        const response = await apiFetch(`${EP.EVENTS.getEvents}/${event._id}`, {
          method: "POST",
        });
        const data = await response.json();
        
        if (response.ok && data.success && data.reservation) {
          setHasJoined(true);
          setJoinStatus({
            _id: data.reservation._id,
            isWaitListed: data.reservation.isWaitListed,
            isApproved: data.reservation.isApproved,
            isCheckedIn: data.reservation.isCheckedIn,
            isPaid: data.reservation.isPaid,
          });
          // Also set reservationId for checked-in display
          if (data.reservation.isCheckedIn) {
            setReservationId(data.reservation._id);
          }
        } else {
          setHasJoined(false);
          setJoinStatus(null);
        }
      } catch (error) {
        console.error("Error fetching reservation status:", error);
        setHasJoined(false);
        setJoinStatus(null);
      }
    };

    fetchReservationStatus();
  }, [isOpen, event, user]);

  const handleJoinEvent = async () => {
    if (!event || !user?.participant || isJoining) return;

    setIsJoining(true);
    try {
      const response = await apiFetch(EP.PARTICIPANT.makeReservation, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: event._id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setHasJoined(true);
        
        // If within deadline and requires payment, open payment modal
        if (data.isWithinDeadline && data.requiresPayment) {
          setJoinStatus({
            isWaitListed: false,
            isApproved: false,
            isCheckedIn: false,
            isPaid: false,
          });
          setShowPaymentModal(true);
          return;
        }
        
        // If auto checked in (free event within deadline)
        if (data.autoCheckedIn) {
          setJoinStatus({
            isWaitListed: false,
            isApproved: true,
            isCheckedIn: true,
            isPaid: true,
          });
          alert("Successfully joined and checked in!");
          return;
        }
        
        // Refresh reservation status for normal flow
        try {
          const statusResponse = await apiFetch(`${EP.EVENTS.getEvents}/${event._id}`, {
            method: "POST",
          });
          const statusData = await statusResponse.json();
          if (statusResponse.ok && statusData.success && statusData.reservation) {
            setJoinStatus({
              isWaitListed: statusData.reservation.isWaitListed,
              isApproved: statusData.reservation.isApproved,
              isCheckedIn: statusData.reservation.isCheckedIn,
              isPaid: statusData.reservation.isPaid,
            });
            const message = statusData.reservation?.isWaitListed 
              ? "You have been added to the waitlist." 
              : "Successfully joined the event!";
            alert(message);
          } else {
            alert("Successfully joined the event!");
          }
        } catch (statusError) {
          console.error("Error fetching reservation status:", statusError);
          alert("Successfully joined the event!");
        }
      } else {
        alert(data.error || data.message || "Failed to join event");
      }
    } catch (error) {
      console.error("Error joining event:", error);
      alert("An error occurred while joining the event");
    } finally {
      setIsJoining(false);
    }
  };

  const handleCheckIn = async () => {
    if (!event || !user?.participant || isCheckingIn) return;

    setIsCheckingIn(true);
    try {
      const response = await apiFetch(EP.PARTICIPANT.checkIn, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: event._id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJoinStatus((prev) => prev ? { ...prev, isCheckedIn: true } : null);
        alert("Successfully checked in!");
      } else {
        alert(data.error || data.message || "Failed to check in");
      }
    } catch (error) {
      console.error("Error checking in:", error);
      alert("An error occurred while checking in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handlePayment = async () => {
    if (!event || !user?.participant || isPaying) return;

    setIsPaying(true);
    try {
      const response = await apiFetch(EP.PARTICIPANT.confirmPayment, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: event._id,
          autoCheckIn: isWithinDeadline, // Auto check-in if within deadline
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReservationId(data.reservationId);
        setShowPaymentModal(false);
        
        // If auto checked in (within deadline), show success modal directly
        if (data.isCheckedIn) {
          setJoinStatus((prev) => prev ? { ...prev, isPaid: true, isCheckedIn: true } : null);
          setShowSuccessModal(true);
        } else {
          // Normal flow - ask if user wants to check-in
          setJoinStatus((prev) => prev ? { ...prev, isPaid: true } : null);
          setShowCheckInConfirm(true);
        }
      } else {
        alert(data.error || data.message || "Payment failed");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("An error occurred while processing payment");
    } finally {
      setIsPaying(false);
    }
  };

  const handleCheckInAfterPayment = async () => {
    setShowCheckInConfirm(false);
    
    if (!event || !user?.participant) return;

    setIsCheckingIn(true);
    try {
      const response = await apiFetch(EP.PARTICIPANT.checkIn, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: event._id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJoinStatus((prev) => prev ? { ...prev, isCheckedIn: true } : null);
        setShowSuccessModal(true);
      } else {
        alert(data.error || data.message || "Failed to check in");
      }
    } catch (error) {
      console.error("Error checking in:", error);
      alert("An error occurred while checking in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSkipCheckIn = () => {
    setShowCheckInConfirm(false);
    alert("Payment confirmed! You can check-in later.");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!isOpen || !event) return null;

  const getImageUrl = (photo?: { path?: string }) => {
    if (photo?.path) {
      return `${EP.API_ASSETS_BASE}/${photo.path}`.replace(/\\/g, "/");
    }
    return null;
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(date);
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const imageUrl = getImageUrl(event.photo);
  const bannerUrl = getImageUrl(event.banner);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className="relative h-48 bg-gray-200 dark:bg-slate-700 overflow-visible">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Event banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-slate-700">
                <ImageIcon className="w-12 h-12 text-gray-400 dark:text-slate-500" />
              </div>
            )}
            <div className="absolute bottom-0 left-6 transform translate-y-1/2 z-10">
              <div
                className="w-44 h-44 rounded-full p-1 shadow-xl"
                style={{ backgroundColor: event.eventStyle?.color || '#ffffff' }}
              >
                <div className="w-full h-full p-2 rounded-full">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Event"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gray-50 dark:bg-slate-700 rounded-full">
                      <ImageIcon className="w-16 h-16 text-gray-400 dark:text-slate-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors bg-black/50 rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 pt-20">
          <div className="space-y-6">

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Event Name
              </label>
              <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                {event.name || "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Coach
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.owner ? (
                    (() => {
                      const owner = event.owner;
                      if (typeof owner === 'object' && owner !== null && 'firstName' in owner && owner.firstName) {
                        return (
                    <button
                            onClick={() => onCoachClick(owner.coach || '')}
                      className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:underline font-medium"
                    >
                            {owner.firstName} {owner.lastName}
                    </button>
                        );
                      } else {
                        return (
                          <span className="text-gray-700 dark:text-slate-300">
                            {typeof owner === 'string' ? owner : 'Coach'}
                          </span>
                        );
                      }
                    })()
                  ) : (
                    "-"
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Backup Coach
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.backupCoach || event.backuoCoach ? (
                    (() => {
                      const backupCoach = event.backupCoach || event.backuoCoach;
                      if (typeof backupCoach === 'object' && backupCoach !== null && backupCoach.firstName) {
                        return (
                    <button
                      onClick={() =>
                              onCoachClick(backupCoach.coach || '')
                      }
                      className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:underline font-medium"
                    >
                            {backupCoach.firstName} {backupCoach.lastName}
                    </button>
                        );
                      } else {
                        return (
                          <span className="text-gray-700 dark:text-slate-300">
                            {typeof backupCoach === 'string' ? backupCoach : 'Coach'}
                          </span>
                        );
                      }
                    })()
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Club
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.club?.name || "-"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Sport Community
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.group?.name || "-"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Event Style
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.eventStyle?.name || "-"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Sport Group
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.sportGroup?.name || "-"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Sport Name
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.sport?.name || "-"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Facility
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.facility ? (
                    onFacilityClick ? (
                      <button
                        onClick={() => onFacilityClick(event.facility)}
                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:underline font-medium"
                      >
                        {event.facility.name}
                      </button>
                    ) : (
                      event.facility.name
                    )
                  ) : (
                    "-"
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Salon
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.salon?.name || "-"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Event Location
              </label>
              <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 min-h-[80px]">
                {event.location || "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Event Start
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {formatDateTime(event.startTime)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Event End
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {formatDateTime(event.endTime)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Capacity
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.capacity || "-"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Level
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 capitalize">
                  {event.level || "-"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Type
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 capitalize">
                  {event.type || "-"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Price Type
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 capitalize">
                  {event.priceType || "-"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Participant Fee
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.participationFee ? `$${event.participationFee}` : "-"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Equipment
              </label>
              <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 min-h-[80px]">
                {event.equipment || "-"}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {event.private && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">Private Event</span>
                </div>
              )}

              {event.isRecurring && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">Recurring Event</span>
                </div>
              )}

              {!event.private && !event.isRecurring && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  <span className="text-sm font-medium">Public Event</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Created On
              </label>
              <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                {formatDate(event.createdAt)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 pb-6 px-6 -mx-6 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
            {/* Show Join button if user is participant and hasn't joined yet */}
            {!isEventCreator && isParticipant && !hasJoined && (
              <button
                type="button"
                onClick={handleJoinEvent}
                disabled={isJoining}
                className="px-6 py-2.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                {isJoining ? "Joining..." : "Join"}
              </button>
            )}
            
            {/* Show Check-in button if user has joined, is paid, not waitlisted, and not checked in yet */}
            {hasJoined && joinStatus && !joinStatus.isCheckedIn && joinStatus.isPaid && !joinStatus.isWaitListed && (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                {isCheckingIn ? "Checking in..." : "Check-in"}
              </button>
            )}
            
            {/* Show Checked In status with ID if user has already checked in */}
            {hasJoined && joinStatus?.isCheckedIn && (
              <button
                onClick={() => joinStatus._id && copyToClipboard(joinStatus._id)}
                className="px-6 py-2.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                title="Click to copy Check-in ID"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Checked In</span>
                {joinStatus._id && (
                  <>
                    <span className="text-green-500 dark:text-green-500">|</span>
                    <span className="font-mono text-xs">{joinStatus._id.slice(-8)}</span>
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </>
                )}
              </button>
            )}
            
            {/* Show Waitlisted status if user is on the waitlist */}
            {hasJoined && joinStatus?.isWaitListed && (
              <div className="px-6 py-2.5 text-sm font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                Waitlisted
              </div>
            )}
            
            {/* Show Pay button if user has joined but not paid */}
            {hasJoined && joinStatus && !joinStatus.isPaid && !joinStatus.isWaitListed && !joinStatus.isCheckedIn && (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="px-6 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 rounded-lg transition-colors flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pay {event.participationFee ? `$${event.participationFee}` : ""}
              </button>
            )}
            
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Event</p>
                <p className="font-medium text-gray-900 dark:text-white">{event.name}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Amount</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {event.priceType === 'Free' ? 'Free' : `$${event.participationFee || 0}`}
                </p>
              </div>
              
              {isWithinDeadline && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    Since the event starts in less than 2 days, you will be automatically checked in after payment.
                  </p>
                </div>
              )}
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This is a test payment. Click "Confirm Payment" to simulate a successful payment.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isPaying}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPaying ? "Processing..." : isWithinDeadline ? "Pay & Check-in" : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Confirmation Modal */}
      {showCheckInConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-auto p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                Would you like to check-in now?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSkipCheckIn}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Later
              </button>
              <button
                onClick={handleCheckInAfterPayment}
                disabled={isCheckingIn}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCheckingIn ? "Checking in..." : "Check-in Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Reservation ID */}
      {showSuccessModal && reservationId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-auto p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Check-in Successful!
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                You are now checked in for this event.
              </p>
              
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Your Confirmation ID</p>
                <p className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400 select-all">
                  {reservationId}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewEventModal;
