"use client";

import { createContext, useContext } from "react";

type GamerProfilePromptContextValue = {
  openGamerProfile: () => void;
};

const GamerProfilePromptContext = createContext<GamerProfilePromptContextValue>({
  openGamerProfile: () => {},
});

export function GamerProfilePromptProvider({
  children,
  openGamerProfile,
}: {
  children: React.ReactNode;
  openGamerProfile: () => void;
}) {
  return (
    <GamerProfilePromptContext.Provider value={{ openGamerProfile }}>
      {children}
    </GamerProfilePromptContext.Provider>
  );
}

export function useGamerProfilePrompt() {
  return useContext(GamerProfilePromptContext);
}
