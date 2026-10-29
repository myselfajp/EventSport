"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ACCEPT_ALL_CONSENT,
  applyConsentSideEffects,
  buildConsentState,
  ESSENTIAL_ONLY_CONSENT,
  readStoredConsent,
  type CookieConsentPreferences,
  type CookieConsentState,
  writeStoredConsent,
  syncCookieConsentAcceptance,
} from "@/app/lib/cookie-consent";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import CookieConsentBanner from "@/components/cookie/CookieConsentBanner";
import CookiePreferencesModal from "@/components/cookie/CookiePreferencesModal";

interface PolicyDocInfo {
  title: string;
  content: string;
  version?: number;
}

interface CookieConsentContextValue {
  consent: CookieConsentState | null;
  hasAnswered: boolean;
  showBanner: boolean;
  showPreferences: boolean;
  policyDoc: PolicyDocInfo | null;
  acceptAll: () => void;
  acceptEssentialOnly: () => void;
  savePreferences: (preferences: CookieConsentPreferences) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(
  undefined
);

function persistConsent(preferences: CookieConsentPreferences) {
  const state = buildConsentState(preferences);
  writeStoredConsent(state);
  applyConsentSideEffects(state);
  void syncCookieConsentAcceptance(state);
  return state;
}

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [policyDoc, setPolicyDoc] = useState<PolicyDocInfo | null>(null);

  const loadPolicy = useCallback(async () => {
    try {
      const res = (await fetchJSON(
        EP.LEGAL.getActive("cookie_policy"),
        { method: "GET" },
        { skipAuth: true }
      )) as {
        success: boolean;
        data?: PolicyDocInfo;
      };
      if (res?.success && res.data) {
        setPolicyDoc(res.data);
      } else {
        setPolicyDoc(null);
      }
    } catch {
      setPolicyDoc(null);
    }
  }, []);

  useEffect(() => {
    const stored = readStoredConsent();
    setConsent(stored);
    setShowBanner(!stored);
    setHydrated(true);

    void loadPolicy();

    const handleContractUpdate = () => {
      void loadPolicy();
    };

    window.addEventListener("eventsport:contracts-updated", handleContractUpdate);
    return () => {
      window.removeEventListener("eventsport:contracts-updated", handleContractUpdate);
    };
  }, [loadPolicy]);

  const acceptAll = useCallback(() => {
    const state = persistConsent(ACCEPT_ALL_CONSENT);
    setConsent(state);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const acceptEssentialOnly = useCallback(() => {
    const state = persistConsent(ESSENTIAL_ONLY_CONSENT);
    setConsent(state);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const savePreferences = useCallback((preferences: CookieConsentPreferences) => {
    const state = persistConsent(preferences);
    setConsent(state);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const openPreferences = useCallback(() => {
    setShowPreferences(true);
  }, []);

  const closePreferences = useCallback(() => {
    setShowPreferences(false);
  }, []);

  const value = useMemo(
    () => ({
      consent,
      hasAnswered: !!consent,
      showBanner: hydrated && showBanner,
      showPreferences,
      policyDoc,
      acceptAll,
      acceptEssentialOnly,
      savePreferences,
      openPreferences,
      closePreferences,
    }),
    [
      consent,
      hydrated,
      showBanner,
      showPreferences,
      policyDoc,
      acceptAll,
      acceptEssentialOnly,
      savePreferences,
      openPreferences,
      closePreferences,
    ]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {hydrated && showBanner && !showPreferences && policyDoc ? (
        <CookieConsentBanner
          onAcceptAll={acceptAll}
          onEssentialOnly={acceptEssentialOnly}
          onManagePreferences={openPreferences}
          policyDoc={policyDoc}
        />
      ) : null}
      <CookiePreferencesModal
        isOpen={showPreferences}
        onClose={closePreferences}
        initialPreferences={
          consent ?? {
            functional: false,
            analytics: false,
            marketing: false,
          }
        }
        onSave={savePreferences}
        onAcceptAll={acceptAll}
        policyDoc={policyDoc}
      />
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return context;
}
