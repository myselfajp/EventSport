"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, signIn, signOut, signUp, User } from "../lib/auth-api";

export function useMe() {
    return useQuery<User | null>({
        queryKey: ["auth", "me"],
        queryFn: getMe,
    });
}

export function useSignIn() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: signIn,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["auth", "me"] });
        },
    });
}

export function useSignUp() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: signUp,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["auth", "me"] });
        },
    });
}

export function useSignOut() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await signOut();
        },
        onSuccess: async () => {
            // clear user cash
            qc.removeQueries({ queryKey: ["auth", "me"], exact: true });

            await qc.invalidateQueries({ queryKey: ["auth", "me"] });
        },
    });
}
