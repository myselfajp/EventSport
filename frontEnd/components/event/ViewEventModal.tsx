"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ImageIcon,
  UserPlus,
  CheckCircle,
  CreditCard,
  Copy,
  Check,
  QrCode,
  ClipboardList,
  Upload,
  Pencil,
  Share2,
  Ban,
} from "lucide-react";
import AddEventModal from "@/components/event/AddEventModal";
import ShareEventDialog from "@/components/event/ShareEventDialog";
import type { EventSharePayload } from "@/app/lib/event-share";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import GamerProfileRequiredBanner from "@/components/GamerProfileRequiredBanner";
import { apiFetch, fetchJSON } from "@/app/lib/api";

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
  style?:
    | string
    | {
        _id?: string;
        name?: string;
        checkInOpensHoursBeforeStart?: number;
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
  eventDetails?: string;
  eventLink?: string;
  private?: boolean;
  isRecurring?: boolean;
  series?: string | {
    _id: string;
    name?: string;
    frequency?: string;
    interval?: number;
    sessionCount?: number;
    priceType?: string;
    participationFeePerSession?: number;
  };
  sessionIndex?: number;
  status?: "active" | "cancelled";
  cancelledAt?: string;
  checkInOpensHoursBeforeStart?: number;
  checkInOpensAt?: string;
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

type EndPhotoGalleryItem = {
  _id: string;
  createdAt: string;
  photo: { path: string; originalName?: string; mimeType?: string };
  author:
    | {
        kind: "gamer";
        firstName?: string;
        lastName?: string;
        photo?: { path?: string };
      }
    | { kind: "coach"; name?: string }
    | { kind: "unknown" };
};

interface ViewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onCoachClick: (coachId: string) => void;
  onFacilityClick?: (facility: Event['facility']) => void;
  onClubClick?: (club: Event['club']) => void;
  onGroupClick?: (group: Event['group']) => void;
  onEventUpdated?: () => void;
}

const ViewEventModal: React.FC<ViewEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onCoachClick,
  onFacilityClick,
  onClubClick,
  onGroupClick,
  onEventUpdated,
}) => {
  const { data: user } = useMe();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInitialData, setEditInitialData] = useState<Record<string, unknown> | null>(
    null
  );
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState(false);
  const [showCancelScopeModal, setShowCancelScopeModal] = useState(false);
  const [cancelScope, setCancelScope] = useState<"single" | "following">("single");
  const [seriesInfo, setSeriesInfo] = useState<Record<string, unknown> | null>(null);
  const [seriesSessions, setSeriesSessions] = useState<
    Array<{
      _id: string;
      name?: string;
      sessionIndex?: number;
      startTime: string;
      endTime?: string;
      status?: string;
    }>
  >([]);
  const [seriesEnrollment, setSeriesEnrollment] = useState<{
    _id: string;
    sessionCount?: number;
    totalFee?: number;
  } | null>(null);
  const [joinMode, setJoinMode] = useState<"single" | "series">("single");
  const [enrollingInSeries, setEnrollingInSeries] = useState(false);
  const [resolvedCheckInHours, setResolvedCheckInHours] = useState(48);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinStatus, setJoinStatus] = useState<{
    _id?: string;
    isWaitListed?: boolean;
    isApproved?: boolean;
    isCheckedIn?: boolean;
    isPaid?: boolean;
    qr?: string;
  } | null>(null);
  const [showJoinConsentModal, setShowJoinConsentModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [hasEndPhotoSubmission, setHasEndPhotoSubmission] = useState(false);
  const [hasCoachEndPhotoSubmission, setHasCoachEndPhotoSubmission] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [uploadingEndPhoto, setUploadingEndPhoto] = useState(false);
  const [consent, setConsent] = useState({
    acceptHealthNoIllness: false,
    acceptHealthNoDisability: false,
    acceptHealthNoMedication: false,
    acceptHealthSportOk: false,
    acceptDistantSelling: false,
    acceptEventPurchaseTerms: false,
  });
  const [legalVersions, setLegalVersions] = useState<{
    distanceSellingId: string | null;
    eventContractId: string | null;
  }>({ distanceSellingId: null, eventContractId: null });
  const [legalVersionsLoading, setLegalVersionsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showCheckInConfirm, setShowCheckInConfirm] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isWithinDeadline, setIsWithinDeadline] = useState(false);
  const [endPhotosGallery, setEndPhotosGallery] = useState<EndPhotoGalleryItem[]>([]);
  const [loadingEndPhotos, setLoadingEndPhotos] = useState(false);
  const [galleryLightboxUrl, setGalleryLightboxUrl] = useState<string | null>(null);

  // Calculate if within deadline (less than 2 days to event start)
  const isFreeEvent = event?.priceType === 'Free';
  
  useEffect(() => {
    if (!event?.startTime) return;
    const hours =
      event.checkInOpensHoursBeforeStart ??
      (typeof event.style === "object" && event.style !== null
        ? event.style.checkInOpensHoursBeforeStart
        : undefined) ??
      48;
    setResolvedCheckInHours(hours);
  }, [
    event?.startTime,
    event?.checkInOpensHoursBeforeStart,
    event?.style,
  ]);

  useEffect(() => {
    if (event?.startTime) {
      const now = new Date();
      const eventStart = new Date(event.startTime);
      const windowMs = resolvedCheckInHours * 60 * 60 * 1000;
      const opensAt = event.checkInOpensAt
        ? new Date(event.checkInOpensAt)
        : new Date(eventStart.getTime() - windowMs);
      const timeDiff = eventStart.getTime() - now.getTime();
      setIsWithinDeadline(
        now >= opensAt && timeDiff < windowMs && timeDiff > 0
      );
    }
  }, [event?.startTime, event?.checkInOpensAt, resolvedCheckInHours]);

  // Check if user is owner or backupCoach
  const ownerId = typeof event?.owner === 'object' && event?.owner !== null ? event.owner._id : event?.owner;
  const backupCoachId = typeof event?.backupCoach === 'object' && event?.backupCoach !== null ? event.backupCoach._id : event?.backupCoach;
  const isOwner =
    !!ownerId && !!user?._id && String(ownerId) === String(user._id);
  const isBackupCoach =
    !!backupCoachId &&
    !!user?._id &&
    String(backupCoachId) === String(user._id);
  const isCancelled = event?.status === "cancelled";
  const seriesId =
    typeof event?.series === "object" && event?.series !== null
      ? String(event.series._id)
      : event?.series
        ? String(event.series)
        : null;
  const isPartOfSeries = !!(event?.isRecurring && seriesId);
  const canEditEvent = isOwner && !isCancelled;
  const canCancelEvent = isOwner && !isCancelled;
  const isEventStaff = isOwner || isBackupCoach;
  const isParticipant = !!user?.participant;

  const getOwnerDisplayName = () => {
    const o = event?.owner;
    if (o && typeof o === "object") {
      const name = [o.firstName, o.lastName].filter(Boolean).join(" ").trim();
      if (name) return name;
    }
    return "A coach";
  };

  const shareInviterName = (() => {
    const self = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    if (self) return self;
    return getOwnerDisplayName();
  })();

  const sharePayload: EventSharePayload | null =
    event?._id && event?.name
      ? {
          eventId: String(event._id),
          eventName: event.name,
          inviterName: shareInviterName,
          groupName: event.group?.name,
        }
      : null;

  const handleShareClick = () => {
    if (event?.private) {
      alert("Private events cannot be shared with a public link.");
      return;
    }
    if (isCancelled) {
      alert("Cancelled events cannot be shared.");
      return;
    }
    setShowShareDialog(true);
  };

  const handleCancelEvent = () => {
    if (!event?._id || !canCancelEvent || cancellingEvent) return;
    if (isPartOfSeries) {
      setCancelScope("single");
      setShowCancelScopeModal(true);
      return;
    }
    if (
      !confirm(
        "Cancel this event? It will be hidden from public listings. Participants will no longer be able to join."
      )
    ) {
      return;
    }
    void performCancel("single");
  };

  const performCancel = async (scope: "single" | "following") => {
    if (!event?._id) return;
    try {
      setCancellingEvent(true);
      const response = await apiFetch(EP.COACH.cancelEvent(String(event._id)), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = await response.json();
      if (response.ok && data?.success) {
        alert(data.message || "Event cancelled successfully");
        setShowCancelScopeModal(false);
        onClose();
        onEventUpdated?.();
      } else {
        alert(data?.message || data?.error || "Failed to cancel event");
      }
    } catch {
      alert("Failed to cancel event");
    } finally {
      setCancellingEvent(false);
    }
  };

  const openEditModal = async () => {
    if (!event?._id || !canEditEvent) return;
    try {
      setLoadingEditData(true);
      const response = await apiFetch(`${EP.EVENTS.getEvents}/${String(event._id)}`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data?.success && data.data) {
        setEditInitialData(data.data);
        setShowEditModal(true);
      } else {
        alert(data?.message || data?.error || "Could not load event for editing");
      }
    } catch {
      alert("Could not load event for editing");
    } finally {
      setLoadingEditData(false);
    }
  };

  // Reservation + end-photo flags (gamers + coaches)
  useEffect(() => {
    if (!isOpen || !event || !user) return;

    const fetchEventSideInfo = async () => {
      try {
        const response = await apiFetch(`${EP.EVENTS.getEvents}/${String(event._id)}`, {
          method: "POST",
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setHasEndPhotoSubmission(!!data.hasEndPhotoSubmission);
          setHasCoachEndPhotoSubmission(!!data.hasCoachEndPhotoSubmission);

          if (
            typeof data.data?.checkInOpensHoursBeforeStart === "number"
          ) {
            setResolvedCheckInHours(data.data.checkInOpensHoursBeforeStart);
          }

          if (user.participant) {
            if (data.reservation) {
              setHasJoined(true);
              setJoinStatus({
                _id: data.reservation._id,
                isWaitListed: data.reservation.isWaitListed,
                isApproved: data.reservation.isApproved,
                isCheckedIn: data.reservation.isCheckedIn,
                isPaid: data.reservation.isPaid,
                qr: data.reservation.qr,
              });
              if (data.reservation.isCheckedIn) {
                setReservationId(data.reservation._id);
              }
            } else {
              setHasJoined(false);
              setJoinStatus(null);
            }
          }

          if (data.series) setSeriesInfo(data.series);
          else setSeriesInfo(null);
          if (Array.isArray(data.seriesSessions)) {
            setSeriesSessions(data.seriesSessions);
          } else {
            setSeriesSessions([]);
          }
          setSeriesEnrollment(data.seriesEnrollment ?? null);
        } else {
          setHasEndPhotoSubmission(false);
          setHasCoachEndPhotoSubmission(false);
          if (user.participant) {
            setHasJoined(false);
            setJoinStatus(null);
          }
        }
      } catch (error) {
        console.error("Error fetching event detail:", error);
        setHasEndPhotoSubmission(false);
        setHasCoachEndPhotoSubmission(false);
        if (user.participant) {
          setHasJoined(false);
          setJoinStatus(null);
        }
      }
    };

    void fetchEventSideInfo();
  }, [isOpen, event, user]);

  const loadEndPhotoGallery = useCallback(async () => {
    if (!event?._id) {
      setEndPhotosGallery([]);
      return;
    }
    const eventIdStr = String(event._id);
    setLoadingEndPhotos(true);
    try {
      const res = await apiFetch(EP.EVENTS.eventEndPhotos(eventIdStr), {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setEndPhotosGallery(data.data as EndPhotoGalleryItem[]);
      } else {
        setEndPhotosGallery([]);
      }
    } catch {
      setEndPhotosGallery([]);
    } finally {
      setLoadingEndPhotos(false);
    }
  }, [event?._id]);

  useEffect(() => {
    if (!isOpen) {
      setEndPhotosGallery([]);
      setGalleryLightboxUrl(null);
      return;
    }
    void loadEndPhotoGallery();
  }, [isOpen, loadEndPhotoGallery]);

  useEffect(() => {
    if (!galleryLightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGalleryLightboxUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryLightboxUrl]);

  const allRegistrationConsentsChecked = Object.values(consent).every(Boolean);
  const legalVersionsReady =
    !!legalVersions.distanceSellingId && !!legalVersions.eventContractId;

  useEffect(() => {
    if (!showJoinConsentModal) return;
    let cancelled = false;
    (async () => {
      setLegalVersionsLoading(true);
      try {
        const [distRes, eventRes] = await Promise.all([
          fetchJSON(EP.LEGAL.getActive("distance_selling"), { method: "GET" }, { skipAuth: true }),
          fetchJSON(EP.LEGAL.getActive("event_contract"), { method: "GET" }, { skipAuth: true }),
        ]);
        if (cancelled) return;
        setLegalVersions({
          distanceSellingId:
            distRes?.success && distRes?.data?._id ? String(distRes.data._id) : null,
          eventContractId:
            eventRes?.success && eventRes?.data?._id ? String(eventRes.data._id) : null,
        });
      } catch {
        if (!cancelled) {
          setLegalVersions({ distanceSellingId: null, eventContractId: null });
        }
      } finally {
        if (!cancelled) setLegalVersionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showJoinConsentModal]);

  useEffect(() => {
    const token = joinStatus?.qr;
    if (!showReservationModal || !token) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void import("qrcode").then(({ default: QR }) => {
      void QR.toDataURL(`eventsport:ticket:${token}`, { width: 260, margin: 2 }).then(
        (url) => {
          if (!cancelled) setQrDataUrl(url);
        }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [showReservationModal, joinStatus?.qr]);

  const submitJoinWithConsents = async () => {
    if (
      !event ||
      !user?.participant ||
      isJoining ||
      enrollingInSeries ||
      !allRegistrationConsentsChecked ||
      !legalVersionsReady
    ) {
      return;
    }

    if (joinMode === "series" && !seriesId) return;

    if (joinMode === "series") {
      setEnrollingInSeries(true);
    } else {
      setIsJoining(true);
    }

    try {
      const body = {
        acceptHealthNoIllness: true,
        acceptHealthNoDisability: true,
        acceptHealthNoMedication: true,
        acceptHealthSportOk: true,
        acceptDistantSelling: true,
        acceptEventPurchaseTerms: true,
        distanceSellingVersionId: legalVersions.distanceSellingId,
        eventContractVersionId: legalVersions.eventContractId,
      };

      const response =
        joinMode === "series"
          ? await apiFetch(EP.PARTICIPANT.enrollSeries, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...body, seriesId }),
            })
          : await apiFetch(EP.PARTICIPANT.makeReservation, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...body, eventId: event._id }),
            });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowJoinConsentModal(false);
        if (joinMode === "series") {
          alert(
            data.message ||
              `Enrolled in ${data.data?.reservationCount ?? ""} session(s).`
          );
          setSeriesEnrollment({
            _id: String(data.data?.enrollmentId ?? ""),
            sessionCount: data.data?.reservationCount,
            totalFee: data.data?.totalFee,
          });
          setHasJoined(true);
          setJoinMode("single");
        } else {
          setHasJoined(true);

          if (data.isWithinDeadline && data.requiresPayment) {
            setJoinStatus({
              _id: String(data.reservationId ?? ""),
              isWaitListed: false,
              isApproved: false,
              isCheckedIn: false,
              isPaid: false,
              qr: data.qrToken,
            });
            setShowPaymentModal(true);
            return;
          }

          if (data.autoCheckedIn) {
            setJoinStatus({
              _id: String(data.reservationId ?? ""),
              isWaitListed: false,
              isApproved: true,
              isCheckedIn: true,
              isPaid: true,
              qr: data.qrToken,
            });
            alert("Successfully joined and checked in!");
            return;
          }

          try {
            const statusResponse = await apiFetch(`${EP.EVENTS.getEvents}/${event._id}`, {
              method: "POST",
            });
            const statusData = await statusResponse.json();
            if (statusResponse.ok && statusData.success && statusData.reservation) {
              setJoinStatus({
                _id: statusData.reservation._id,
                isWaitListed: statusData.reservation.isWaitListed,
                isApproved: statusData.reservation.isApproved,
                isCheckedIn: statusData.reservation.isCheckedIn,
                isPaid: statusData.reservation.isPaid,
                qr: statusData.reservation.qr,
              });
              setHasEndPhotoSubmission(!!statusData.hasEndPhotoSubmission);
              const message = statusData.reservation?.isWaitListed
                ? "You have been added to the waitlist."
                : "Successfully joined the event!";
              alert(message);
            } else {
              setJoinStatus({
                qr: data.qrToken,
                _id: data.reservationId ? String(data.reservationId) : undefined,
              });
              alert("Successfully joined the event!");
            }
          } catch (statusError) {
            console.error("Error fetching reservation status:", statusError);
            setJoinStatus({
              qr: data.qrToken,
              _id: data.reservationId ? String(data.reservationId) : undefined,
            });
            alert("Successfully joined the event!");
          }
        }
      } else {
        alert(data.error || data.message || "Failed to join event");
      }
    } catch (error) {
      console.error("Error joining event:", error);
      alert("An error occurred while joining the event");
    } finally {
      setIsJoining(false);
      setEnrollingInSeries(false);
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

        try {
          const statusResponse = await apiFetch(`${EP.EVENTS.getEvents}/${event._id}`, {
            method: "POST",
          });
          const statusData = await statusResponse.json();
          if (statusResponse.ok && statusData.success && statusData.reservation) {
            setJoinStatus({
              _id: statusData.reservation._id,
              isWaitListed: statusData.reservation.isWaitListed,
              isApproved: statusData.reservation.isApproved,
              isCheckedIn: statusData.reservation.isCheckedIn,
              isPaid: statusData.reservation.isPaid,
              qr: statusData.reservation.qr,
            });
            setHasEndPhotoSubmission(!!statusData.hasEndPhotoSubmission);
          }
        } catch {
          /* keep prior joinStatus */
        }

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

  const handleEndPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;
    setUploadingEndPhoto(true);
    try {
      const fd = new FormData();
      fd.append("event-end-photo", file);
      fd.append("data", JSON.stringify({ eventId: String(event._id) }));
      const response = await apiFetch(EP.PARTICIPANT.addEndPhoto, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHasEndPhotoSubmission(true);
        await loadEndPhotoGallery();
        alert("Photo uploaded successfully.");
      } else {
        alert((data as { message?: string }).message || (data as { error?: string }).error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploadingEndPhoto(false);
      e.target.value = "";
    }
  };

  const handleCoachEndPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;
    setUploadingEndPhoto(true);
    try {
      const fd = new FormData();
      fd.append("event-end-photo", file);
      fd.append("data", JSON.stringify({ eventId: String(event._id) }));
      const response = await apiFetch(EP.COACH.addEndPhoto, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHasCoachEndPhotoSubmission(true);
        await loadEndPhotoGallery();
        alert("Photo uploaded successfully.");
      } else {
        alert((data as { message?: string }).message || (data as { error?: string }).error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploadingEndPhoto(false);
      e.target.value = "";
    }
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

  const eventEnded =
    !!event?.endTime && new Date(event.endTime).getTime() <= Date.now();
  const showPhotoMemories =
    eventEnded || endPhotosGallery.length > 0 || loadingEndPhotos;
  const canCheckIn = !!(
    event &&
    hasJoined &&
    joinStatus &&
    joinStatus.isPaid &&
    !joinStatus.isWaitListed &&
    !joinStatus.isCheckedIn
  );

  if (!isOpen || !event) return null;

  const getImageUrl = (photo?: { path?: string }) => {
    if (photo?.path) {
      return EP.assetUrl(photo.path);
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
            {isCancelled && (
              <div
                role="alert"
                className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
              >
                <strong className="font-semibold">This event has been cancelled.</strong>
                {event.cancelledAt ? (
                  <span className="block mt-1 text-amber-800/90 dark:text-amber-200/90">
                    Cancelled on{" "}
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(event.cancelledAt))}
                  </span>
                ) : null}
              </div>
            )}

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
                  {event.club?._id && event.club?.name ? (
                    onClubClick ? (
                      <button
                        type="button"
                        onClick={() => onClubClick(event.club)}
                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:underline font-medium"
                      >
                        {event.club.name}
                      </button>
                    ) : (
                      event.club.name
                    )
                  ) : (
                    "-"
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Sport Community
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                  {event.group?._id && event.group?.name ? (
                    onGroupClick ? (
                      <button
                        type="button"
                        onClick={() => onGroupClick(event.group)}
                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:underline font-medium"
                      >
                        {event.group.name}
                      </button>
                    ) : (
                      event.group.name
                    )
                  ) : (
                    "-"
                  )}
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
                  Gamer Fee
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
              <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 min-h-[80px] whitespace-pre-wrap">
                {event.equipment || "—"}
              </div>
            </div>

            {event.eventLink?.trim() ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Event link
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
                  <a
                    href={event.eventLink.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:underline font-medium break-all"
                  >
                    {event.eventLink.trim()}
                  </a>
                </div>
              </div>
            ) : null}

            {event.eventDetails?.trim() ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Event details &amp; rules
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 min-h-[80px] whitespace-pre-wrap">
                  {event.eventDetails.trim()}
                </div>
              </div>
            ) : null}

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
                  <span className="text-sm font-medium">
                    Recurring
                    {event.sessionIndex
                      ? ` · Session ${event.sessionIndex}${
                          seriesInfo && typeof seriesInfo.sessionCount === "number"
                            ? `/${seriesInfo.sessionCount}`
                            : ""
                        }`
                      : ""}
                  </span>
                </div>
              )}

              {seriesEnrollment && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Enrolled in series ({seriesEnrollment.sessionCount ?? "?"}{" "}
                    sessions)
                  </span>
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

            {seriesSessions.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/90 dark:bg-slate-900/50 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Series sessions
                </h3>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {seriesSessions.map((s) => (
                    <li
                      key={s._id}
                      className={`flex justify-between gap-2 text-sm px-3 py-2 rounded-lg ${
                        s._id === event._id
                          ? "bg-cyan-100 dark:bg-cyan-900/40 font-medium"
                          : "bg-white dark:bg-slate-800"
                      } ${s.status === "cancelled" ? "opacity-50 line-through" : ""}`}
                    >
                      <span>
                        {s.sessionIndex != null ? `#${s.sessionIndex} ` : ""}
                        {s.name || "Session"}
                      </span>
                      <span className="text-gray-500 dark:text-slate-400 shrink-0">
                        {formatDate(s.startTime)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Created On
              </label>
              <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                {formatDate(event.createdAt)}
              </div>
            </div>

            {showPhotoMemories && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/90 dark:bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-baseline gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    Photo memories
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    Shared after the event
                  </span>
                </div>
                {loadingEndPhotos ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-9 w-9 border-2 border-cyan-500 border-t-transparent" />
                  </div>
                ) : endPhotosGallery.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No shared photos yet.
                  </p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1 pt-1 snap-x snap-mandatory scrollbar-thin -mx-1 px-1">
                    {endPhotosGallery.map((item) => {
                      const thumbUrl = item.photo?.path
                        ? EP.assetUrl(item.photo.path)
                        : null;
                      const authorLabel =
                        item.author.kind === "gamer"
                          ? `${item.author.firstName ?? ""} ${(item.author.lastName ?? "").charAt(0)}.`.trim() ||
                            "Gamer"
                          : item.author.kind === "coach"
                            ? `Coach · ${item.author.name ?? "Staff"}`
                            : "Participant";
                      const avatarUrl =
                        item.author.kind === "gamer" && item.author.photo?.path
                          ? EP.assetUrl(item.author.photo.path)
                          : null;
                      const initial =
                        item.author.kind === "gamer"
                          ? (item.author.firstName?.[0] || "?").toUpperCase()
                          : "C";
                      return (
                        <div
                          key={item._id}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              thumbUrl && setGalleryLightboxUrl(thumbUrl);
                            }
                          }}
                          onClick={() => thumbUrl && setGalleryLightboxUrl(thumbUrl)}
                          className="flex-shrink-0 w-[148px] snap-start rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-md transition-all cursor-pointer text-left"
                        >
                          <div className="relative aspect-square bg-gray-100 dark:bg-slate-700">
                            {thumbUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- dynamic URLs from API
                              <img
                                src={thumbUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-10 h-10" />
                              </div>
                            )}
                          </div>
                          <div className="p-2.5 flex items-start gap-2 border-t border-gray-100 dark:border-slate-700">
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={avatarUrl}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-600 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {initial}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-800 dark:text-slate-100 truncate leading-tight">
                                {authorLabel}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                                {formatDate(item.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isEventStaff &&
            isParticipant &&
            hasJoined &&
            eventEnded &&
            !hasEndPhotoSubmission && (
              <div className="rounded-xl border border-dashed border-cyan-300 dark:border-cyan-700 bg-cyan-50/50 dark:bg-cyan-950/20 p-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Photo after the event
                </label>
                <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
                  Upload opens after the scheduled end time. Share a moment from the event.
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg cursor-pointer text-sm hover:bg-cyan-700">
                  <Upload className="w-4 h-4" />
                  {uploadingEndPhoto ? "Uploading…" : "Choose image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingEndPhoto}
                    onChange={handleEndPhotoUpload}
                  />
                </label>
              </div>
            )}

          {isEventStaff &&
            (!!user?.coach || user?.role === 0) &&
            eventEnded &&
            !hasCoachEndPhotoSubmission && (
              <div className="rounded-xl border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 p-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Coach: photo after the event
                </label>
                <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
                  One photo per event organizer. Visible to everyone after the event ends.
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg cursor-pointer text-sm hover:bg-violet-700">
                  <Upload className="w-4 h-4" />
                  {uploadingEndPhoto ? "Uploading…" : "Choose image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingEndPhoto}
                    onChange={handleCoachEndPhotoUpload}
                  />
                </label>
              </div>
            )}

          <div className="flex flex-col gap-4 pt-6 mt-6 pb-6 px-6 -mx-6 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
            {!isEventStaff && user && !isParticipant && (
              <GamerProfileRequiredBanner />
            )}
            {!isEventStaff && isParticipant && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJoinMode("single");
                    setShowJoinConsentModal(true);
                  }}
                  disabled={hasJoined || isJoining || isCancelled}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {isCancelled
                    ? "Cancelled"
                    : hasJoined
                      ? "Joined"
                      : isJoining
                        ? "Joining…"
                        : "Join this session"}
                </button>
                {isPartOfSeries &&
                  !seriesEnrollment &&
                  !isCancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        setJoinMode("series");
                        setShowJoinConsentModal(true);
                      }}
                      disabled={enrollingInSeries}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-40 flex items-center gap-2 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      {enrollingInSeries
                        ? "Enrolling…"
                        : "Enroll in full series"}
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setShowReservationModal(true)}
                  disabled={!hasJoined}
                  className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Reservation
                </button>
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={!canCheckIn || isCheckingIn}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isCheckingIn ? "Checking in..." : "Check-in"}
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 justify-end">
              {hasJoined && joinStatus?.isWaitListed && (
                <div className="px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                  Waitlisted
                </div>
              )}
              {hasJoined &&
                joinStatus &&
                !joinStatus.isPaid &&
                !joinStatus.isWaitListed &&
                !joinStatus.isCheckedIn && (
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay {event.participationFee ? `$${event.participationFee}` : ""}
                  </button>
                )}
              {hasJoined && joinStatus?.isCheckedIn && (
                <button
                  type="button"
                  onClick={() => joinStatus._id && copyToClipboard(joinStatus._id)}
                  className="px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                  title="Copy check-in ID"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Checked in</span>
                  {joinStatus._id && (
                    <>
                      <span className="opacity-50">|</span>
                      <span className="font-mono text-xs">{joinStatus._id.slice(-8)}</span>
                      {copied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </>
                  )}
                </button>
              )}
              {canEditEvent && (
                <button
                  type="button"
                  onClick={() => void openEditModal()}
                  disabled={loadingEditData}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Pencil className="w-4 h-4" />
                  {loadingEditData ? "Loading…" : "Edit event"}
                </button>
              )}
              {canCancelEvent && (
                <button
                  type="button"
                  onClick={handleCancelEvent}
                  disabled={cancellingEvent}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  {cancellingEvent ? "Cancelling…" : "Cancel event"}
                </button>
              )}
              {!event.private && !isCancelled && sharePayload && (
                <button
                  type="button"
                  onClick={handleShareClick}
                  className="px-4 py-2.5 text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-800 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <ShareEventDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        payload={sharePayload}
      />

      {showCancelScopeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Cancel recurring session
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Choose which sessions to cancel.
            </p>
            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cancelScope"
                  checked={cancelScope === "single"}
                  onChange={() => setCancelScope("single")}
                />
                This session only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cancelScope"
                  checked={cancelScope === "following"}
                  onChange={() => setCancelScope("following")}
                />
                This and following sessions
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelScopeModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg"
                disabled={cancellingEvent}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void performCancel(cancelScope)}
                disabled={cancellingEvent}
                className="px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
              >
                {cancellingEvent ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddEventModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditInitialData(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setEditInitialData(null);
          onClose();
          onEventUpdated?.();
        }}
        initialData={editInitialData ?? undefined}
      />

      {showJoinConsentModal && event && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {joinMode === "series"
                  ? "Enroll in full series"
                  : "Join this session"}
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinConsentModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Tick all boxes to register. Opening a contract link does not count as acceptance—you must check each box.
            </p>
            {legalVersionsLoading && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                Sözleşme sürümleri yükleniyor…
              </p>
            )}
            {!legalVersionsLoading && !legalVersionsReady && (
              <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-3">
                Mesafeli satış veya etkinlik sözleşmesi için aktif Legal belgesi yok. Admin → Legal
                bölümünden yayına alın.
              </p>
            )}
            <div className="space-y-3 text-sm text-gray-800 dark:text-slate-200 mb-6">
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.acceptHealthNoIllness}
                  onChange={(e) =>
                    setConsent((c) => ({ ...c, acceptHealthNoIllness: e.target.checked }))
                  }
                  className="mt-1 rounded border-gray-300"
                />
                <span>I confirm I have no illness that prevents safe participation.</span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.acceptHealthNoDisability}
                  onChange={(e) =>
                    setConsent((c) => ({ ...c, acceptHealthNoDisability: e.target.checked }))
                  }
                  className="mt-1 rounded border-gray-300"
                />
                <span>I confirm I have no disability that prevents safe participation.</span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.acceptHealthNoMedication}
                  onChange={(e) =>
                    setConsent((c) => ({ ...c, acceptHealthNoMedication: e.target.checked }))
                  }
                  className="mt-1 rounded border-gray-300"
                />
                <span>I confirm I am not using medication that conflicts with this activity.</span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.acceptHealthSportOk}
                  onChange={(e) =>
                    setConsent((c) => ({ ...c, acceptHealthSportOk: e.target.checked }))
                  }
                  className="mt-1 rounded border-gray-300"
                />
                <span>I confirm there is no medical restriction on my taking part in sport.</span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.acceptDistantSelling}
                  onChange={(e) =>
                    setConsent((c) => ({ ...c, acceptDistantSelling: e.target.checked }))
                  }
                  className="mt-1 rounded border-gray-300"
                />
                <span>
                  I accept the{" "}
                  <a
                    href="/sozlesmeler#mesafeli-satis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 dark:text-cyan-400 underline font-medium"
                  >
                    distance selling agreement
                  </a>
                  .
                </span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.acceptEventPurchaseTerms}
                  onChange={(e) =>
                    setConsent((c) => ({ ...c, acceptEventPurchaseTerms: e.target.checked }))
                  }
                  className="mt-1 rounded border-gray-300"
                />
                <span>
                  I accept the{" "}
                  <a
                    href="/sozlesmeler#etkinlik-satin-alma"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 dark:text-cyan-400 underline font-medium"
                  >
                    event and purchase conditions
                  </a>{" "}
                  (logged on the server when you join).
                </span>
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowJoinConsentModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitJoinWithConsents()}
                disabled={
                  !allRegistrationConsentsChecked ||
                  isJoining ||
                  legalVersionsLoading ||
                  !legalVersionsReady
                }
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isJoining ? "Joining…" : "Confirm & join"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReservationModal && event && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center z-[62] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Reservation & ticket
              </h3>
              <button
                type="button"
                onClick={() => setShowReservationModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {!hasJoined ? (
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Join the event first to create a reservation and QR ticket.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  {joinStatus?.isWaitListed && (
                    <span className="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
                      Waitlisted
                    </span>
                  )}
                  {joinStatus?.isPaid && (
                    <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                      Paid
                    </span>
                  )}
                  {joinStatus?.isCheckedIn && (
                    <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                      Checked in
                    </span>
                  )}
                  {!joinStatus?.isPaid &&
                    !joinStatus?.isWaitListed &&
                    !joinStatus?.isCheckedIn && (
                    <span className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">
                      Payment pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Show this QR at check-in. It encodes your ticket token.
                </p>
                {joinStatus?.qr ? (
                  <div className="flex flex-col items-center gap-3">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode package
                      <img
                        src={qrDataUrl}
                        alt="Ticket QR code"
                        className="w-56 h-56 rounded-lg border border-gray-200 dark:border-slate-600 bg-white p-2"
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-900 text-sm text-gray-500">
                        Generating QR…
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => joinStatus.qr && copyToClipboard(joinStatus.qr)}
                      className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-4 h-4" />
                      Copy ticket token
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    No ticket token yet. Try refreshing after completing payment.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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

      {galleryLightboxUrl && (
        <div
          role="presentation"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setGalleryLightboxUrl(null)}
        >
          <button
            type="button"
            aria-label="Close photo"
            className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              setGalleryLightboxUrl(null);
            }}
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- full-size API asset */}
          <img
            src={galleryLightboxUrl}
            alt=""
            className="max-h-[92vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ViewEventModal;
