"use client";

import React, { useState } from "react";
import { resetPassword, sendPasswordResetOtp } from "@/app/lib/auth-api";
import PasswordInput from "./PasswordInput";

interface ForgotPasswordFormProps {
  onBackToSignIn: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToSignIn,
}) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSendOtp = async () => {
    setValidationError("");
    setOtpMessage("");
    setSuccessMessage("");

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setValidationError("Please enter a valid email address.");
      return;
    }

    setSendingOtp(true);
    try {
      const result = await sendPasswordResetOtp({ email: normalizedEmail });
      setOtpMessage(result.message);
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : "Could not send verification code."
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    setSuccessMessage("");

    const otpDigits = otp.replace(/\D/g, "");
    if (otpDigits.length !== 6) {
      setValidationError("Enter the 6-digit verification code sent to your email.");
      return;
    }
    if (!password) {
      setValidationError("Please enter a new password.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setResetting(true);
    try {
      const result = await resetPassword({
        email: normalizedEmail,
        otp: otpDigits,
        password,
        confirmPassword,
      });
      setSuccessMessage(result.message);
      setPassword("");
      setConfirmPassword("");
      setOtp("");
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : "Could not reset password."
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col justify-start bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 overflow-y-auto">
      <div className="text-center mb-6 sticky top-0 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 pt-2 pb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <div className="text-white text-xl font-bold">G</div>
        </div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">
          Reset Password
        </h1>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Remember your password?{" "}
          <button
            type="button"
            onClick={onBackToSignIn}
            className="text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors font-medium"
          >
            Sign in
          </button>
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Registered email <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
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
              <p className="text-xs text-cyan-700 dark:text-cyan-400 mt-1">
                {otpMessage}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Verification code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6-digit code"
              className="w-full px-3 py-2.5 text-sm tracking-[0.3em] border border-gray-200 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                         placeholder:tracking-normal placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                         transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              New password <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Enter new password"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Confirm new password <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
            />
          </div>

          {validationError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
              {validationError}
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-sm px-3 py-2 rounded-lg">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={resetting}
            className="w-full bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 
                       disabled:opacity-60 disabled:cursor-not-allowed 
                       text-white py-2.5 px-4 rounded-lg transition-colors font-medium shadow-sm hover:shadow-md text-sm"
          >
            {resetting ? "Updating password..." : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
