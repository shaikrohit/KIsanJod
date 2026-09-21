"use client";

import { useEffect, useRef, useCallback } from "react";

export interface SyncMessage {
  type: string;
  centerId?: string;
  farmerId?: string;
  bookingId?: string;
  tokenNumber?: string;
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Dispatches an instant broadcast across all local tabs, windows, and the active session.
 */
export function broadcastInstantSync(payload?: SyncMessage) {
  if (typeof window === "undefined") return;

  const data: SyncMessage = payload || { type: "SYNC", timestamp: Date.now() };

  // 1. Same-window local event
  try {
    window.dispatchEvent(new CustomEvent("kisanjod_sync", { detail: data }));
  } catch {}

  // 2. Cross-tab localStorage trigger
  try {
    localStorage.setItem("kisanjod_sync_ping", String(Date.now()));
  } catch {}

  // 3. Multi-tab BroadcastChannel for 0ms same-origin cross-tab sync
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("kisanjod_sync");
      bc.postMessage(data);
      bc.close();
    }
  } catch {}
}

/**
 * Hook that listens to Server-Sent Events (SSE), BroadcastChannel, and local events,
 * triggering the callback immediately (0ms delay) whenever any queue, booking, or
 * weighment action occurs anywhere on the platform.
 */
export function useInstantSync(onSync: (msg?: SyncMessage) => void) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const trigger = useCallback((msg?: SyncMessage) => {
    try {
      onSyncRef.current(msg);
      if (typeof window !== "undefined" && msg?.type) {
        import("@/components/NotificationBell").then(({ triggerNativeNotification }) => {
          if (msg.type === "QUEUE_CALL" || msg.type === "TURN_CALLED") {
            triggerNativeNotification(
              "Gate Call: Your Turn is Active!",
              `Token ${msg.tokenNumber || ""} has been called to the weighing bay. Proceed immediately.`,
              "turn",
              "/farmer/queue"
            );
          } else if (msg.type === "QUEUE_STANDBY" || msg.type === "STANDBY") {
            triggerNativeNotification(
              "Token on Standby",
              `Token ${msg.tokenNumber || ""} was placed on standby. Please report to the gate operator.`,
              "standby",
              "/farmer/queue"
            );
          } else if (msg.type === "WEIGHMENT_COMPLETED" || msg.type === "J_FORM_GENERATED") {
            triggerNativeNotification(
              "Procurement Recorded: J-Form Generated",
              "Weighment has been recorded. Digital J-Form bill is generated and queued for DBT bank credit.",
              "weighment",
              "/farmer/payments"
            );
          } else if (msg.type === "BOOKING_CREATED") {
            triggerNativeNotification(
              "Mandi Slot Confirmed",
              `Your token ${msg.tokenNumber || ""} has been scheduled successfully.`,
              "general",
              "/farmer/dashboard"
            );
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Sync callback error:", e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. BroadcastChannel (0ms multi-tab instant sync)
    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("kisanjod_sync");
        bc.onmessage = (event) => {
          trigger(event.data);
        };
      }
    } catch {}

    // 2. Storage event listener (cross-tab fallback)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "kisanjod_sync_ping") {
        trigger();
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Same-window CustomEvent listener
    const handleLocalSync = (e: Event) => {
      const customEvent = e as CustomEvent<SyncMessage>;
      trigger(customEvent.detail);
    };
    window.addEventListener("kisanjod_sync", handleLocalSync);

    // 4. Server-Sent Events (SSE) stream for instant server-to-client push across different devices
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource("/api/sync/stream");

        es.addEventListener("sync", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            trigger(data);
          } catch {
            trigger();
          }
        });

        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          // Exponential backoff reconnect
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch {}
    };

    connectSSE();

    return () => {
      if (bc) {
        bc.close();
      }
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kisanjod_sync", handleLocalSync);
      if (es) {
        es.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [trigger]);
}
