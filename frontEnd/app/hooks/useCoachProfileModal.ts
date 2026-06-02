"use client";

import { useCallback, useState } from "react";
import CoachDetailModal from "@/components/CoachDetailModal";

export function useCoachProfileModal() {
  const [coachId, setCoachId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const onCoachClick = useCallback((id: string) => {
    const trimmed = id?.trim();
    if (!trimmed) return;
    setCoachId(trimmed);
    setIsOpen(true);
  }, []);

  const closeCoachProfile = useCallback(() => {
    setIsOpen(false);
    setCoachId(null);
  }, []);

  const coachProfileModal = (
    <CoachDetailModal
      isOpen={isOpen}
      onClose={closeCoachProfile}
      coachId={coachId}
    />
  );

  return { onCoachClick, coachProfileModal };
}
