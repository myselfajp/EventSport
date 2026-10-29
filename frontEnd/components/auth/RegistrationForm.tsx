"use client";

import React, { useState, useRef, useEffect } from "react";
import PasswordInput from "./PasswordInput";
import AuthLogo from "./AuthLogo";
import { useSignUp } from "@/app/hooks/useAuth";
import { sendRegistrationOtp } from "@/app/lib/auth-api";
import {
  PHONE_PREFIX,
  PHONE_DIGITS_LENGTH,
  processPhoneInput,
  getPhoneDigits,
} from "@/app/lib/phone-utils";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import LegalContentModal from "./LegalContentModal";
import RegistrationConsentLabel from "./RegistrationConsentLabel";
import { emptyLocationValue } from "@/components/location/LocationFields";
import RegistrationLocationFields from "@/components/location/RegistrationLocationFields";
import type { LocationValue } from "@/app/lib/location-api";
import type { SignupConsentDocument, SignupConsentItem } from "@/app/lib/contract-documents";

interface RegistrationFormProps {
  onToggleForm: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onToggleForm,
}) => {
  const { mutate: signUp, isPending, error } = useSignUp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(PHONE_PREFIX);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedItems, setAgreedItems] = useState<Record<string, boolean>>({});
  const [validationError, setValidationError] = useState("");
  const [consentItems, setConsentItems] = useState<SignupConsentItem[]>([]);
  const [consentsReady, setConsentsReady] = useState(false);
  const [legalModal, setLegalModal] = useState<{ title: string; content: string } | null>(null);
  const [legalLoading, setLegalLoading] = useState(true);
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [locationValue, setLocationValue] = useState<LocationValue>(emptyLocationValue());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLegalLoading(true);
      try {
        const res = await fetchJSON(
          EP.LEGAL.registrationConsents,
          { method: "GET" },
          { skipAuth: true }
        );
        if (cancelled) return;
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        setConsentItems(items);
        setConsentsReady(Boolean(res?.data?.ready));
        setAgreedItems({});
      } catch {
        if (!cancelled) {
          setConsentItems([]);
          setConsentsReady(false);
        }
      } finally {
        if (!cancelled) setLegalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!consentsReady) {
      setValidationError("Required agreements are not available. Please try again later.");
      return;
    }

    const missingRequired = consentItems.find(
      (item) => item.required && !agreedItems[item._id]
    );
    if (missingRequired) {
      setValidationError("Please agree to all required agreements.");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    const PASSWORD_RULE_MESSAGE =
      "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one digit, and one symbol.";
    const passwordRulesValid =
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
    if (!passwordRulesValid) {
      setValidationError(PASSWORD_RULE_MESSAGE);
      return;
    }

    const phoneDigits = getPhoneDigits(phoneNumber);
    if (phoneDigits.length < PHONE_DIGITS_LENGTH) {
      setValidationError(
        `Please enter a complete phone number (9 digits after ${PHONE_PREFIX}).`
      );
      return;
    }

    const otpDigits = otp.replace(/\D/g, "");
    if (otpDigits.length !== 6) {
      setValidationError("Enter the 6-digit verification code sent to your email.");
      return;
    }

    const acceptances: Array<{ docType: string; versionId: string; agreed: boolean }> = [];
    for (const item of consentItems) {
      if (!agreedItems[item._id]) continue;
      for (const doc of item.documents) {
        if (acceptances.some((row) => row.docType === doc.docType)) continue;
        acceptances.push({
          docType: doc.docType,
          versionId: doc._id,
          agreed: true,
        });
      }
    }

    const termsDoc = acceptances.find((row) => row.docType === "terms");
    const kvkkDoc = acceptances.find((row) => row.docType === "kvkk");
    const commercialDoc = acceptances.find((row) => row.docType === "commercial_messages");
    if (!termsDoc || !kvkkDoc) {
      setValidationError("Terms and KVKK are not available. Please try again later.");
      return;
    }

    const country = (locationValue.country || "TR").toUpperCase() === "US" ? "US" : "TR";
    const city = (locationValue.city || "").trim();
    const postalCode = (locationValue.postalCode || "").trim();
    const state = (locationValue.state || "").trim();
    const districtName = (locationValue.districtName || "").trim();
    const isTurkey = country === "TR";

    if (isTurkey) {
      if (!city) {
        setValidationError("Please select a city (province).");
        return;
      }
      if (!districtName) {
        setValidationError("Please select a district.");
        return;
      }
      if (!postalCode) {
        setValidationError("Please enter your postal code.");
        return;
      }
    } else {
      if (!state) {
        setValidationError("Please select your state.");
        return;
      }
      if (!city) {
        setValidationError("Please enter your city.");
        return;
      }
      if (!postalCode) {
        setValidationError("Please enter your ZIP code.");
        return;
      }
    }

    signUp({
      firstName,
      lastName,
      phone: phoneNumber,
      age: birthday,
      email: email.trim().toLowerCase(),
      password,
      otp: otpDigits,
      country,
      state,
      city,
      postalCode,
      districtName: districtName || undefined,
      agreeTerms: true,
      agreeKvkk: true,
      termsVersionId: termsDoc.versionId,
      kvkkVersionId: kvkkDoc.versionId,
      marketingConsent: Boolean(commercialDoc),
      ...(commercialDoc
        ? { commercialMessagesVersionId: commercialDoc.versionId }
        : {}),
      acceptances,
    });
  };

  const handleSendOtp = async () => {
    setValidationError("");
    setOtpMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    setSendingOtp(true);
    try {
      const result = await sendRegistrationOtp({
        email: normalizedEmail,
        firstName: firstName.trim() || undefined,
      });
      setOtpMessage(result.message);
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : "Could not send verification code."
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const openConsentDocument = (doc: SignupConsentDocument) => {
    setLegalModal({ title: doc.title, content: doc.content });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(processPhoneInput(e.target.value));
  };

  useEffect(() => {
    if (!phoneInputRef.current) return;
    const len = phoneNumber.length;
    phoneInputRef.current.setSelectionRange(len, len);
  }, [phoneNumber]);

  return (
    <div className="p-4 h-full flex flex-col justify-start bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 overflow-y-auto">
      {/* Logo/Brand Section */}
      <div className="text-center mb-6 sticky top-0 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 pt-2 pb-4">
        <AuthLogo />
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">
          Create an Account
        </h1>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Already have an account?{" "}
          <span
            onClick={onToggleForm}
            className="text-cyan-500 dark:text-cyan-400 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors font-medium"
          >
            Sign in here
          </span>
        </p>
      </div>

      {/* Registration Form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                           placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                           transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                           placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                           transition-colors"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              ref={phoneInputRef}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder={`${PHONE_PREFIX}XX XXX XX XX`}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                         placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                         transition-colors"
              required
            />
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Birthday <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                         focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                         transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <RegistrationLocationFields
              value={locationValue}
              onChange={setLocationValue}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                           placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                           transition-colors"
                required
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                className="shrink-0 px-3 py-2.5 text-xs font-medium border border-cyan-500 text-cyan-600 dark:text-cyan-400 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 disabled:opacity-60 whitespace-nowrap"
              >
                {sendingOtp ? "..." : "Send code"}
              </button>
            </div>
            {otpMessage && (
              <p className="text-xs text-cyan-700 dark:text-cyan-400 mt-1">{otpMessage}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Email verification code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="w-full px-3 py-2.5 text-sm tracking-[0.3em] border border-gray-200 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                         placeholder:tracking-normal placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                         transition-colors"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              At least 8 characters with one uppercase letter, one lowercase letter, one digit, and one symbol. No upper limit.
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
            />
          </div>

          {consentItems.map((item) => (
            <div key={item._id} className="flex items-start gap-3 py-2">
              <input
                type="checkbox"
                id={`consent-${item._id}`}
                checked={Boolean(agreedItems[item._id])}
                onChange={(e) =>
                  setAgreedItems((prev) => ({
                    ...prev,
                    [item._id]: e.target.checked,
                  }))
                }
                className="mt-0.5 w-4 h-4 text-cyan-500 border-gray-300 dark:border-slate-600 rounded focus:ring-cyan-500 bg-white dark:bg-slate-900"
              />
              <label
                htmlFor={`consent-${item._id}`}
                className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed"
              >
                <RegistrationConsentLabel
                  label={item.checkboxLabel}
                  documents={item.documents}
                  onOpen={openConsentDocument}
                />
              </label>
            </div>
          ))}

          {legalLoading && (
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Loading agreements...
            </p>
          )}
          {!legalLoading && !consentsReady && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Required agreements are not available. Registration is temporarily disabled.
            </p>
          )}

          {(validationError || error) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
              {validationError ||
                (error as any)?.message ||
                "Registration failed. Please check your details and try again."}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || legalLoading || !consentsReady}
            className="w-full bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 
                       disabled:opacity-60 disabled:cursor-not-allowed 
                       text-white py-2.5 px-4 rounded-lg transition-colors font-medium shadow-sm hover:shadow-md text-sm"
          >
            {isPending ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>

      {legalModal && (
        <LegalContentModal
          title={legalModal.title}
          content={legalModal.content}
          onClose={() => setLegalModal(null)}
        />
      )}
    </div>
  );
};

export default RegistrationForm;
