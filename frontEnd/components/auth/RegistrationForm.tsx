"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSignUp } from "@/app/hooks/useAuth";

interface RegistrationFormProps {
  onToggleForm: () => void;
}

interface RegistrationData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  birthday: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onToggleForm,
}) => {
  const { mutate: signUp, isPending, error } = useSignUp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!agreeTerms) {
      setValidationError("Please agree to the terms and conditions");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters long");
      return;
    }

    const formData = {
      firstName,
      lastName,
      phone: phoneNumber,
      age: birthday,
      email,
      password,
    };

    signUp(formData);
  };

  return (
    <div className="p-4 h-full flex flex-col justify-start bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 overflow-y-auto">
      {/* Logo/Brand Section */}
      <div className="text-center mb-6 sticky top-0 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 pt-2 pb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <div className="text-white text-xl font-bold">G</div>
        </div>
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
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
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

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                         placeholder:text-gray-400 dark:placeholder:text-slate-500
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                           placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                           transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Use 8+ characters with letters, numbers & symbols
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                           placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 
                           transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start gap-3 py-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-cyan-500 border-gray-300 dark:border-slate-600 rounded focus:ring-cyan-500 bg-white dark:bg-slate-900"
            />
            <label
              htmlFor="terms"
              className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed"
            >
              I Agree{" "}
              <span className="text-cyan-500 dark:text-cyan-400 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors">
                Terms and conditions.
              </span>
            </label>
          </div>

          {(validationError || error) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
              {validationError ||
                (error as any)?.message ||
                "Registration failed"}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 
                       disabled:opacity-60 disabled:cursor-not-allowed 
                       text-white py-2.5 px-4 rounded-lg transition-colors font-medium shadow-sm hover:shadow-md text-sm"
          >
            {isPending ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
