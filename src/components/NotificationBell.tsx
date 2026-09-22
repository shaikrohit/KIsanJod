"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  X,
  ExternalLink,
  ShieldCheck,
  Truck,
  Scale,
  AlertTriangle,
  Info,
} from "lucide-react";
import { ClientPortal } from "@/components/ClientPortal";

export interface MandiNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: "gate" | "turn" | "weighment" | "standby" | "general";
  unread: boolean;
  url?: string;
}

const DEFAULT_NOTIFICATIONS: MandiNotification[] = [
  {
    id: "notif_welcome_1",
    title: "Mandi Arrival Pass Active",
    message: "Your e-token registration is confirmed. Please report within your designated window.",
    timestamp: Date.now() - 1000 * 60 * 30, // 30m ago
    type: "general",
    unread: false,
    url: "/farmer/dashboard",
  },
  {
    id: "notif_welcome_2",
    title: "Live Mandi Queue Telemetry",
    message: "Dynamic ripple ETA tracking is active. Real-time notifications will alert when your gate turn approaches.",
    timestamp: Date.now() - 1000 * 60 * 10, // 10m ago
    type: "gate",
    unread: true,
    url: "/farmer/queue",
  },
];

/**
 * Triggers both in-app notification history and native browser / PWA Service Worker notifications.
 */
export function triggerNativeNotification(
  title: string,
  message: string,
  type: "gate" | "turn" | "weighment" | "standby" | "general" = "general",
  url = "/farmer/queue"
) {
  if (typeof window === "undefined") return;

  const newNotif: MandiNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    message,
    timestamp: Date.now(),
    type,
    unread: true,
    url,
  };

  try {
    const raw = localStorage.getItem("kisanjod_notifications");
    const existing: MandiNotification[] = raw ? JSON.parse(raw) : DEFAULT_NOTIFICATIONS;
    existing.unshift(newNotif);
    localStorage.setItem("kisanjod_notifications", JSON.stringify(existing.slice(0, 40)));
    window.dispatchEvent(new CustomEvent("kisanjod_notification_update"));
  } catch {}

  // Trigger mobile vibration haptic feedback
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([250, 100, 250]);
    }
  } catch {}

  // Trigger in-app floating banner toast
  try {
    window.dispatchEvent(
      new CustomEvent("kisanjod_toast_alert", {
        detail: { title, message, type, url, timestamp: Date.now() },
      })
    );
  } catch {}

  // Native Browser / Service Worker Notification
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body: message,
            icon: "/icons/icon.svg",
            badge: "/icons/icon.svg",
            data: { url },
          });
        }).catch(() => {
          new Notification(title, { body: message, icon: "/icons/icon.svg" });
        });
      } else {
        new Notification(title, { body: message, icon: "/icons/icon.svg" });
      }
    } catch {}
  }
}

export function NotificationBell({ userRole }: { userRole?: "farmer" | "operator" | "admin" }) {
  const [notifications, setNotifications] = useState<MandiNotification[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [activeTab, setActiveTab] = useState<"all" | "queue" | "payments">("all");
  const [toastAlert, setToastAlert] = useState<{ title: string; message: string; type: string; url?: string } | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: "success" | "warning" | "error" | "info"; text: string } | null>(null);

  const drawerTitle =
    userRole === "operator"
      ? "Operator Alerts"
      : userRole === "admin"
      ? "Platform Alerts"
      : "Mandi Alerts & Updates";

  const syncNotifications = useCallback(() => {
    try {
      const raw = localStorage.getItem("kisanjod_notifications");
      if (raw) {
        setNotifications(JSON.parse(raw));
      } else {
        setNotifications(DEFAULT_NOTIFICATIONS);
        localStorage.setItem("kisanjod_notifications", JSON.stringify(DEFAULT_NOTIFICATIONS));
      }
    } catch {
      setNotifications(DEFAULT_NOTIFICATIONS);
    }
  }, []);

  useEffect(() => {
    syncNotifications();

    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setPermission(Notification.permission);
      } else {
        setPermission("unsupported");
      }
    }

    const handleUpdate = () => syncNotifications();
    const handleToast = (e: any) => {
      if (e.detail) {
        setToastAlert(e.detail);
        setTimeout(() => setToastAlert(null), 6000);
      }
    };

    window.addEventListener("kisanjod_notification_update", handleUpdate);
    window.addEventListener("kisanjod_toast_alert", handleToast);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("kisanjod_notification_update", handleUpdate);
      window.removeEventListener("kisanjod_toast_alert", handleToast);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [syncNotifications]);

  const requestPermission = async () => {
    if (typeof window === "undefined") return;

    const isSecure = window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    const isStandalone = (window.navigator as any).standalone || window.matchMedia?.("(display-mode: standalone)")?.matches;

    // Check insecure context (e.g. mobile accessing local IP via http://)
    if (!isSecure) {
      setFeedbackNotice({
        type: "warning",
        text: "Local IP (HTTP) detected. Native push requires HTTPS, but KisanJod has activated instant in-app sound, vibration, and floating alerts for this device!",
      });
      triggerNativeNotification(
        "🌾 Mobile In-App Alert Active",
        "In-app notifications and haptics are active for this session.",
        "general",
        "/farmer/queue"
      );
      return;
    }

    // Check iOS Safari non-PWA
    if (isIOS && !isStandalone) {
      setFeedbackNotice({
        type: "info",
        text: "iOS Safari Notice: Tap the Share button (square with arrow) and choose 'Add to Home Screen' to enable lock-screen notifications. In-app alerts are active now!",
      });
      triggerNativeNotification(
        "📱 PWA Alert Enabled",
        "In-app alerts are active. Add to Home Screen for background lock-screen alerts.",
        "general",
        "/farmer/queue"
      );
      return;
    }

    if (!("Notification" in window)) {
      setPermission("unsupported");
      setFeedbackNotice({
        type: "warning",
        text: "This browser does not support the Web Push API. KisanJod in-app notifications and phone vibration are active instead.",
      });
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setFeedbackNotice({
          type: "success",
          text: "Push notifications active! You will receive lock-screen alerts with vibration.",
        });
        triggerNativeNotification(
          "🌾 Mobile Notifications Enabled",
          "You will receive instant native alerts for gate calls, turn numbers, and J-Form payouts.",
          "general",
          "/farmer/queue"
        );
      } else if (result === "denied") {
        setFeedbackNotice({
          type: "error",
          text: "Notification permission was denied. Please allow notifications in your browser site settings.",
        });
      }
    } catch (err: any) {
      setFeedbackNotice({
        type: "warning",
        text: "Could not request native permission: " + (err?.message || "Insecure origin. In-app alerts active."),
      });
      triggerNativeNotification(
        "🌾 In-App Alerts Active",
        "Instant queue notifications and vibration are working in your session.",
        "general",
        "/farmer/queue"
      );
    }
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, unread: false }));
    setNotifications(updated);
    try {
      localStorage.setItem("kisanjod_notifications", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("kisanjod_notification_update"));
    } catch {}
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.setItem("kisanjod_notifications", JSON.stringify([]));
      window.dispatchEvent(new CustomEvent("kisanjod_notification_update"));
    } catch {}
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, unread: false } : n));
    setNotifications(updated);
    try {
      localStorage.setItem("kisanjod_notifications", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("kisanjod_notification_update"));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "queue") return n.type === "gate" || n.type === "turn" || n.type === "standby";
    if (activeTab === "payments") return n.type === "weighment";
    return true;
  });

  const formatTimestamp = (ts: number) => {
    const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  const getNotificationIcon = (type: MandiNotification["type"]) => {
    switch (type) {
      case "turn":
        return <BellRing size={16} className="text-purple-600" />;
      case "gate":
        return <Truck size={16} className="text-emerald-700" />;
      case "weighment":
        return <Scale size={16} className="text-blue-600" />;
      case "standby":
        return <AlertTriangle size={16} className="text-amber-600" />;
      default:
        return <Info size={16} className="text-teal-600" />;
    }
  };

  return (
    <>
      {/* Header Notification Bell Button */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-[#cfded5] bg-white text-[#17382d] shadow-2xs hover:bg-[#edf5ef] hover:border-emerald-300 transition-all active:scale-95"
        aria-label="View Mandi Notifications"
        title="Mandi Queue & Token Notifications"
      >
        <Bell size={16} className="text-[#176b4b]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over Notifications History Drawer */}
      {drawerOpen && (
        <ClientPortal>
          <div className="fixed inset-0 z-[99995] flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-over Drawer Panel */}
            <aside
              className="relative z-10 w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-5 sm:p-6 transition-transform duration-300 ease-out animate-in slide-in-from-right overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Mandi Notifications Panel"
            >
              {/* Drawer Top Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                      <BellRing size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-gray-900 leading-tight">
                        {drawerTitle}
                      </h2>
                      <p className="text-[11px] font-bold text-gray-500">
                        {unreadCount > 0 ? `${unreadCount} unread update(s)` : "All updates read"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    aria-label="Close Notifications"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Feedback Notice Banner */}
                {feedbackNotice && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-medium space-y-1 ${
                      feedbackNotice.type === "success"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                        : feedbackNotice.type === "error"
                        ? "bg-red-50 border-red-300 text-red-950"
                        : "bg-amber-50 border-amber-300 text-amber-950"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Info size={15} className="shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[11px] leading-relaxed font-semibold">{feedbackNotice.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeedbackNotice(null)}
                        className="text-gray-400 hover:text-gray-700 p-0.5"
                        aria-label="Dismiss message"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile Notification Status / Request Card */}
                {permission === "granted" ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 flex items-center justify-between text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white text-[11px] font-black shrink-0">
                        ✓
                      </span>
                      <div>
                        <strong className="text-emerald-950 font-black block text-xs">
                          Push Notifications Active
                        </strong>
                        <p className="text-emerald-800 text-[10px]">
                          Native lock-screen alerts & vibration enabled for this device
                        </p>
                      </div>
                    </div>
                  </div>
                ) : permission === "unsupported" ? (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/90 p-3 space-y-2 text-xs shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0">📱</span>
                      <div>
                        <strong className="text-teal-950 font-black block text-xs">
                          In-App Mobile Alerts & Haptics Active
                        </strong>
                        <p className="text-teal-800 text-[10px] mt-0.5">
                          Instant floating banners and phone vibration are running for all gate calls and queue turns.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 space-y-2.5 text-xs shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg">🔔</span>
                      <div>
                        <strong className="text-amber-950 font-black block">
                          Enable Native Mobile Notifications
                        </strong>
                        <p className="text-amber-800 text-[11px] mt-0.5">
                          Get instant alerts with vibration when your token is called to the weighing bay.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestPermission}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs shadow-xs transition-colors"
                    >
                      Allow Push Notifications
                    </button>
                  </div>
                )}
                {/* Category Filter Tabs */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
                        activeTab === "all"
                          ? "bg-emerald-800 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("queue")}
                      className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
                        activeTab === "queue"
                          ? "bg-emerald-800 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Queue
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("payments")}
                      className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
                        activeTab === "payments"
                          ? "bg-emerald-800 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      J-Form
                    </button>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] font-extrabold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                    >
                      <CheckCheck size={13} />
                      Mark read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 space-y-2">
                      <Bell size={32} className="mx-auto text-gray-300 stroke-1" />
                      <p className="text-xs font-bold">No notifications in this tab</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          notif.unread
                            ? "bg-emerald-50/60 border-emerald-200 shadow-2xs"
                            : "bg-gray-50/70 border-gray-200/80 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-xl bg-white border border-gray-200 shrink-0 mt-0.5 shadow-2xs">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-gray-900 leading-snug">
                                  {notif.title}
                                </h4>
                                {notif.unread && (
                                  <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-gray-600 leading-relaxed">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-3 pt-1 text-[10px] font-extrabold text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} />
                                  {formatTimestamp(notif.timestamp)}
                                </span>
                                {notif.url && (
                                  <Link
                                    href={notif.url}
                                    onClick={() => setDrawerOpen(false)}
                                    className="text-emerald-800 hover:text-emerald-950 font-black inline-flex items-center gap-1"
                                  >
                                    <span>View Details</span>
                                    <ExternalLink size={10} />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  disabled={notifications.length === 0}
                  className="text-xs font-extrabold text-gray-400 hover:text-red-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Clear All
                </button>
                <span className="text-[10px] font-extrabold text-emerald-800 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  KisanJod Mandi Telemetry
                </span>
              </div>
            </aside>
          </div>
        </ClientPortal>
      )}

      {/* Real-Time Floating Notification Toast Banner */}
      {toastAlert && (
        <ClientPortal>
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[92vw] max-w-md animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
            <div className="flex items-start gap-3 p-4 bg-gray-950/95 text-white rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
                <BellRing size={18} className="animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                    Live Alert
                  </span>
                  <p className="text-xs font-black text-white leading-tight truncate">
                    {toastAlert.title}
                  </p>
                </div>
                <p className="text-[11px] text-gray-200 mt-1 leading-relaxed">
                  {toastAlert.message}
                </p>
                {toastAlert.url && (
                  <Link
                    href={toastAlert.url}
                    onClick={() => setToastAlert(null)}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-black text-emerald-300 hover:text-emerald-200 underline"
                  >
                    <span>View Mandi Queue</span>
                    <ExternalLink size={11} />
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setToastAlert(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
                aria-label="Dismiss alert"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </ClientPortal>
      )}
    </>
  );
}

