"use client";

import React, { useState } from "react";
import { useMe, useSignOut } from "@/app/hooks/useAuth";
import LoginForm from "./auth/LoginForm";
import RegistrationForm from "./auth/RegistrationForm";
import ProfileSidebar from "./profile/ProfileSidebar";

interface LeftSidebarProps {
  isOpen: boolean;
  onShowCalendar?: () => void;
  onShowFollowings?: () => void;
  onShowFavorites?: () => void;
}

// Fake user credentials for testing
const FAKE_USER = {
  email: "demo@example.com",
  password: "password123",
  participant: "p1a2b3c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o",
  coach: null,
  facility: [
    "a3f8c9d2-1e4b-4c7d-9a2f-8b5e3c1d6a4e",
    "b7e2d4f1-3a9c-4e8d-b5f2-9c6a1d8e4b7f",
  ],
  company: ["c1d3e5f7-2a4b-4d8e-9f1a-3c5b7d9e1f2a"],
};

const DUMMY_FACILITIES = [
  {
    id: "a3f8c9d2-1e4b-4c7d-9a2f-8b5e3c1d6a4e",
    name: "Downtown Sports Complex",
    address:
      "123 Main Street, Building A\nDowntown District, City Center\nFloor 2, Suite 205",
    phone: "+1 (555) 123-4567",
    email: "info@downtownsports.com",
    photo: "",
    mainSport: "Basketball",
    isPrivate: false,
  },
  {
    id: "b7e2d4f1-3a9c-4e8d-b5f2-9c6a1d8e4b7f",
    name: "Elite Fitness Academy",
    address: "456 Oak Avenue\nWestside, Metro Area\nBuilding 3",
    phone: "+1 (555) 987-6543",
    email: "contact@elitefitness.com",
    photo: "",
    mainSport: "CrossFit",
    isPrivate: true,
  },
];

const DUMMY_COMPANIES = [
  {
    id: "c1d3e5f7-2a4b-4d8e-9f1a-3c5b7d9e1f2a",
    name: "Tech Solutions Inc.",
    address: "789 Innovation Drive\nTech Park, Silicon Valley\nSuite 400",
    phone: "+1 (555) 456-7890",
    email: "info@techsolutions.com",
    photo: "",
  },
];

const LeftSidebar: React.FC<LeftSidebarProps> = ({ isOpen, onShowCalendar, onShowFollowings, onShowFavorites }) => {
  const { data: user, isLoading: userLoading } = useMe();
  const { mutate: signOut } = useSignOut();
  const isLoggedIn = !!user;

  const [showRegistration, setShowRegistration] = useState(false);

  const handleLogout = () => {
    signOut();
    setShowRegistration(false);
  };

  const toggleForm = () => {
    setShowRegistration(!showRegistration);
  };

  return (
    <div
      className={`${
        isOpen ? "w-full sm:w-96 md:w-[400px]" : "w-0"
      } h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 transition-all duration-300 overflow-hidden flex-shrink-0`}
    >
      {userLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      ) : isLoggedIn ? (
        <ProfileSidebar
          onLogout={handleLogout}
          onShowCalendar={onShowCalendar}
          onShowFollowings={onShowFollowings}
          onShowFavorites={onShowFavorites}
          initialFacilities={
            FAKE_USER.facility
              ? DUMMY_FACILITIES.filter((f) =>
                  FAKE_USER.facility.includes(f.id)
                )
              : []
          }
          initialCompanies={
            FAKE_USER.company
              ? DUMMY_COMPANIES.filter((c) => FAKE_USER.company.includes(c.id))
              : []
          }
        />
      ) : showRegistration ? (
        <RegistrationForm onToggleForm={toggleForm} />
      ) : (
        <LoginForm onToggleForm={toggleForm} onLogin={() => {}} loginError="" />
      )}
    </div>
  );
};

export default LeftSidebar;
