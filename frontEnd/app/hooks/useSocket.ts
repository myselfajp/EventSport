"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { tokenStore } from "../lib/token-store";

/** NEXT_PUBLIC_API_V1_BASE'ten sadece origin kısmını çıkarır (…/api/v1 atılır). */
function getSocketOrigin(): string {
  const base = (process.env.NEXT_PUBLIC_API_V1_BASE || "").replace(/\/+$/, "");
  const origin = base.replace(/\/api\/v1\/?$/i, "");
  if (origin) return origin;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

// Singleton: uygulama boyunca tek socket instance.
let socketSingleton: Socket | null = null;

function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = tokenStore.get();
  if (!token) return null;

  if (socketSingleton) {
    // Token rotate olmuşsa handshake auth'ı güncelle.
    socketSingleton.auth = { token };
    if (!socketSingleton.connected) {
      socketSingleton.connect();
    }
    return socketSingleton;
  }

  socketSingleton = io(getSocketOrigin(), {
    path: "/socket.io",
    auth: { token },
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  return socketSingleton;
}

export interface UseSocketResult {
  socket: Socket | null;
  isConnected: boolean;
}

/**
 * Singleton socket bağlantısını yönetir.
 * Dışarıya socket instance'ı ve canlı bağlantı durumunu döndürür.
 */
export function useSocket(): UseSocketResult {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    setSocket(s);
    setIsConnected(s.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (err: Error) => {
      console.warn("Socket connect_error:", err.message);
      setIsConnected(false);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
    };
  }, []);

  return { socket, isConnected };
}

/** Oturum kapanışında singleton'ı temizlemek için (isteğe bağlı). */
export function disconnectSocket() {
  if (socketSingleton) {
    socketSingleton.disconnect();
    socketSingleton = null;
  }
}
