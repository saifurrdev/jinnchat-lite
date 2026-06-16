"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(identity: {
  userId: string;
  username: string;
  image?: string | null;
} | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!identity) return;

    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit("identify", identity);
    };
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [identity?.userId, identity?.username, identity?.image]);

  return { socket: socketRef.current, connected };
}
