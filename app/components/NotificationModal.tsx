"use client";

import { useEffect, useState } from "react";
import { X, Bell, CheckCheck, RefreshCw } from "lucide-react";
import { UserProfile } from "../types/archive";

export interface NotificationItem {
  id: number;
  type: string;
  actorHandle: string;
  noteId: number | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  onOpenNote?: (noteId: number) => void;
}

export default function NotificationModal({
  currentUser,
  onClose,
  onUnreadChange,
  onOpenNote,
}: NotificationModalProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications || []);
        onUnreadChange?.(data.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    if (!currentUser?.id) return;
    const timer = window.setInterval(loadNotifications, 5000);
    return () => window.clearInterval(timer);
  }, [currentUser?.id]);

  const handleMarkAllRead = async () => {
    if (!currentUser?.id) return;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onUnreadChange?.(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, markAllRead: true }),
    });
  };

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.isRead && currentUser?.id) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, notificationId: item.id }),
      });
      loadNotifications();
    }
    if (item.noteId && onOpenNote) {
      onClose();
      onOpenNote(item.noteId);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-dvh w-full max-w-none overflow-y-auto border-0 bg-[#F4F4F0] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(3.5rem,calc(env(safe-area-inset-bottom)+2.5rem))] text-[#111111] sm:h-auto sm:max-h-[82vh] sm:max-w-lg sm:border-2 sm:border-[#111111] sm:p-6 sm:shadow-[8px_8px_0px_#111111]"
      >
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#111111] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#E11D2A]" />
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em]">
              SIGNAL ALERTS
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadNotifications}
              title="Refresh alerts"
              className="flex items-center gap-1 border border-[#111111] bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase hover:bg-[#111111] hover:text-white"
            >
              <RefreshCw className="h-3 w-3" />
              SYNC
            </button>
            {items.some((i) => !i.isRead) && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 border border-[#111111] bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase hover:bg-[#111111] hover:text-white"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                MARK READ
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="border border-[#111111] bg-white p-1.5 hover:bg-[#111111] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!currentUser ? (
          <div className="border border-dashed border-[#111111] bg-white p-6 text-center font-mono text-xs uppercase opacity-75">
            SIGN IN TO YOUR SIDE B IDENTITY TO RECEIVE ALERTS ON REACTIONS, REPLIES &amp; STAMPS.
          </div>
        ) : loading ? (
          <div className="p-6 text-center font-mono text-xs uppercase opacity-65">
            SCANNING FREQUENCY...
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-[#111111] bg-white p-6 text-center font-mono text-xs uppercase opacity-75">
            NO ALERTS YET. WHEN SOMEONE STAMPS, REPLIES, OR FOLLOWS YOU, IT SHOWS UP HERE.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClickItem(item)}
                className={`flex w-full items-start justify-between gap-3 border border-[#111111] p-3 text-left transition ${
                  item.isRead
                    ? "bg-white opacity-75 hover:opacity-100"
                    : "bg-white shadow-[3px_3px_0px_#111111] hover:bg-[#F4F4F0]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase">
                    {!item.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#E11D2A]" />
                    )}
                    <span>@{item.actorHandle.replace(/^@+/, "")}</span>
                    <span className="opacity-50">• {item.type}</span>
                  </div>
                  <p className="mt-1 text-xs leading-snug">{item.message}</p>
                </div>
                <span className="shrink-0 font-mono text-[9px] uppercase opacity-60">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
