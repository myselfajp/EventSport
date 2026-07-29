"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./lib/queryClient";
import { CookieConsentProvider } from "./context/CookieConsentContext";
import NoEventCreditsGate from "@/components/upgrade/NoEventCreditsGate";
import AppToastGate from "@/components/ui/AppToastGate";

export default function Providers({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            <CookieConsentProvider>
                {children}
                <NoEventCreditsGate />
                <AppToastGate />
            </CookieConsentProvider>
        </QueryClientProvider>
    );
}
