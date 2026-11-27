"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  Sparkles,
  Bug,
  MessageSquare,
  Lightbulb,
  Share2,
  Check,
  GripVertical,
} from "lucide-react";
import { UserProfile } from "../types/archive";
import { shareSideBLink } from "../utils/share";

interface ManifestoCommentItem {
  id: number;
  category: "COMMENT" | "SUGGESTION" | "BUG" | string;
  authorHandle: string;
  message: string;
  createdAt: string;
}

interface ManifestoDispatchProps {
  currentUser: UserProfile | null;
}

const REACTION_ITEMS = [
  { key: "RESONATES", label: "RESONATES" },
  { key: "NEW_TRACK", label: "FOUND NEW MUSIC" },
  { key: "FREE_SPACE", label: "LOVE THAT IT'S FREE" },
  { key: "CO_SIGN", label: "CO-SIGN TEAM" },
] as const;

export function CubeEyesIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 12"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
    >
      <rect x="2" y="2" width="3" height="8" />
      <rect x="11" y="2" width="3" height="8" />
    </svg>
  );
}

export function FloatingEyesOnly({ onWink }: { onWink?: () => void }) {
  const eyesRef = useRef<HTMLSpanElement | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [winking, setWinking] = useState(false);

  useEffect(() => {
    const updateLook = (clientX: number, clientY: number) => {
      const el = eyesRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const maxShift = 2.5;
      const factor = Math.min(1, dist / 140) * maxShift;
      setOffset({
        x: Math.round((dx / dist) * factor * 10) / 10,
        y: Math.round((dy / dist) * factor * 10) / 10,
      });
    };

    const onMouseMove = (e: MouseEvent) => updateLook(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) updateLook(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 120);
      }, 2400 + Math.random() * 2400);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWinking(true);
    setTimeout(() => setWinking(false), 300);
    onWink?.();
  };

  return (
    <span
      ref={eyesRef}
      onClick={handleClick}
      role="img"
      aria-label="Tracking expressive eyes"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className="inline-flex items-center gap-1.5 px-0.5 text-current transition-transform duration-75 ease-out"
    >
      <span
        className={`block w-1.5 bg-current transition-all duration-100 ${
          blinking ? "h-[2px]" : "h-3"
        }`}
      />
      <span
        className={`block w-1.5 bg-current transition-all duration-100 ${
          blinking || winking ? "h-[2px]" : "h-3"
        }`}
      />
    </span>
  );
}

export function CubeGuyIcon({
  className = "h-16 w-16",
  interactive = true,
  compact = false,
}: {
  className?: string;
  interactive?: boolean;
  compact?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [pupilOffset, setPupilOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isWinking, setIsWinking] = useState(false);

  useEffect(() => {
    if (!interactive || compact) return;
    const handleMove = (clientX: number, clientY: number) => {
      const el = boxRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const maxShift = 4.5;
      const scale = Math.min(1, dist / 140) * maxShift;
      setPupilOffset({
        x: Math.round((dx / dist) * scale * 10) / 10,
        y: Math.round((dy / dist) * scale * 10) / 10,
      });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [interactive, compact]);

  useEffect(() => {
    if (!interactive) return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const delay = 2200 + Math.random() * 2800;
      timer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          if (Math.random() < 0.25) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => setIsBlinking(false), 110);
            }, 130);
          }
          scheduleBlink();
        }, 120);
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(timer);
  }, [interactive]);

  const triggerWink = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    setIsWinking(true);
    setTimeout(() => setIsWinking(false), 320);
  };

  if (compact) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center border border-current bg-transparent ${className}`}
      >
        <span className="flex items-center gap-[2px]">
          <span className="block h-[5px] w-[3px] bg-current" />
          <span className="block h-[5px] w-[3px] bg-current" />
        </span>
      </span>
    );
  }

  return (
    <div
      ref={boxRef}
      onClick={triggerWink}
      title={interactive ? "Tap Cube Guy to wink" : undefined}
      role="img"
      aria-label="Cube Guy mascot with animated eyes"
      className={`relative flex select-none items-center justify-center border-2 border-current bg-transparent transition-transform active:scale-95 ${
        interactive ? "cursor-pointer" : ""
      } ${className}`}
    >
      <span className="absolute left-1 top-1 h-1 w-1 bg-current opacity-60" />
      <span className="absolute right-1 top-1 h-1 w-1 bg-current opacity-60" />

      <div
        style={{
          transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
        }}
        className="flex items-center gap-3.5 transition-transform duration-75 ease-out"
      >
        <span
          className={`block w-2 bg-current transition-all duration-100 ${
            isBlinking ? "h-[2px]" : "h-3.5"
          }`}
        />
        <span
          className={`block w-2 bg-current transition-all duration-100 ${
            isBlinking || isWinking ? "h-[2px]" : "h-3.5"
          }`}
        />
      </div>
    </div>
  );
}

export default function ManifestoDispatch({ currentUser }: ManifestoDispatchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dockSide, setDockSide] = useState<"left" | "right">("right");
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
  } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const [counts, setCounts] = useState<Record<string, number>>({
    RESONATES: 0,
    NEW_TRACK: 0,
    FREE_SPACE: 0,
    CO_SIGN: 0,
  });
  const [myReactions, setMyReactions] = useState<Record<string, boolean>>({});
  const [visitorId, setVisitorId] = useState<string>("");
  const [comments, setComments] = useState<ManifestoCommentItem[]>([]);
  const [filterTab, setFilterTab] = useState<"ALL" | "COMMENT" | "SUGGESTION" | "BUG">("ALL");

  const [category, setCategory] = useState<"COMMENT" | "SUGGESTION" | "BUG">("COMMENT");
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const savedSide = localStorage.getItem("sideb_manifesto_dock");
    if (savedSide === "left" || savedSide === "right") {
      setDockSide(savedSide);
    }

    let vid = localStorage.getItem("sideb_visitor_id");
    if (!vid) {
      vid = `v_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem("sideb_visitor_id", vid);
    }
    setVisitorId(vid);

    try {
      const savedReacts = JSON.parse(localStorage.getItem("sideb_manifesto_reacts") || "{}");
      setMyReactions(savedReacts);
    } catch {
      // ignore
    }

    if (typeof window !== "undefined" && window.location.hash === "#liner-00") {
      setIsOpen(true);
    }
  }, []);

  const fetchDispatch = async () => {
    try {
      const res = await fetch("/api/manifesto");
      if (!res.ok) return;
      const data = await res.json();
      if (data.counts) setCounts(data.counts);
      if (Array.isArray(data.comments)) setComments(data.comments);
    } catch (err) {
      console.error("Failed to load manifesto dispatch:", err);
    }
  };

  useEffect(() => {
    fetchDispatch();
  }, []);

  useEffect(() => {
    if (isOpen) fetchDispatch();
  }, [isOpen]);

  // Draggable pointer handlers with bottom-left / bottom-right edge snapping
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const st = dragState.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.moved && Math.hypot(dx, dy) > 6) {
      st.moved = true;
    }
    if (st.moved) {
      const btnW = btnRef.current?.offsetWidth || 140;
      const btnH = btnRef.current?.offsetHeight || 44;
      const nextX = Math.max(12, Math.min(window.innerWidth - btnW - 12, st.originLeft + dx));
      const nextY = Math.max(12, Math.min(window.innerHeight - btnH - 12, st.originTop + dy));
      setDragPos({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const st = dragState.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (st.moved) {
      const btnW = btnRef.current?.offsetWidth || 140;
      const centerX = (dragPos?.x ?? st.originLeft) + btnW / 2;
      const nextSide: "left" | "right" = centerX < window.innerWidth / 2 ? "left" : "right";
      setDockSide(nextSide);
      localStorage.setItem("sideb_manifesto_dock", nextSide);
      setDragPos(null);
    } else {
      setIsOpen(true);
    }
    dragState.current = null;
  };

  const handleReact = async (type: string) => {
    if (!visitorId) return;
    const optimisticActive = !myReactions[type];
    setMyReactions((prev) => {
      const next = { ...prev, [type]: optimisticActive };
      localStorage.setItem("sideb_manifesto_reacts", JSON.stringify(next));
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [type]: Math.max(0, (prev[type] || 0) + (optimisticActive ? 1 : -1)),
    }));

    try {
      const res = await fetch("/api/manifesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", type, visitorId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCounts((prev) => ({ ...prev, [type]: data.count }));
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      const handleToSend = currentUser
        ? `@${currentUser.username}`
        : authorName.trim() || "ANONYMOUS";
      const res = await fetch("/api/manifesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          category,
          authorHandle: handleToSend,
          message: message.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => [data.comment, ...prev]);
        }
        setMessage("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const visibleComments =
    filterTab === "ALL" ? comments : comments.filter((c) => c.category === filterTab);

  return (
    <>
      {/* Draggable Floating Stamp Button (Snaps Bottom-Left or Bottom-Right) */}
      <button
        ref={btnRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={
          dragPos
            ? {
                left: `${dragPos.x}px`,
                top: `${dragPos.y}px`,
                touchAction: "none",
              }
            : {
                touchAction: "none",
              }
        }
        title="Open SIDE B // 00 Manifesto, Team & Feedback (Drag to snap left or right)"
        className={`fixed z-40 flex select-none items-center gap-2 border-2 border-[#111111] bg-[#F4F4F0] px-3 py-2 text-[#111111] shadow-[4px_4px_0px_#111111] active:translate-x-[1px] active:translate-y-[1px] ${
          dragPos
            ? "cursor-grabbing transition-none"
            : `cursor-grab transition-all duration-200 bottom-[max(1rem,env(safe-area-inset-bottom))] ${
                dockSide === "left" ? "left-4" : "right-4"
              }`
        }`}
      >
        <GripVertical className="h-3.5 w-3.5 opacity-45" />
        <FloatingEyesOnly />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
          LINER // 00
        </span>
      </button>

      {/* Featured Manifesto, Team & Feedback Modal */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-dvh w-full max-w-none overflow-y-auto border-0 bg-[#F4F4F0] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] text-[#111111] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:border-2 sm:border-[#111111] sm:p-7 sm:shadow-[8px_8px_0px_#111111]"
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#111111] pb-4">
              <div>
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11D2A]">
                  <CubeEyesIcon className="h-3.5 w-3.5" /> PINNED DISPATCH // ENTRY NO. 000
                </span>
                <h2 className="mt-1 text-2xl font-bold uppercase tracking-tight">
                  ABOUT SIDE B // 026
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await shareSideBLink({ kind: "archive" });
                    if (res === "copied") {
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 1800);
                    }
                  }}
                  className="flex items-center gap-1 border border-[#111111] bg-white px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-[#111111] hover:text-white"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? "COPIED" : "SHARE"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="border border-[#111111] bg-white p-1.5 hover:bg-[#111111] hover:text-white"
                  aria-label="Close dispatch"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Hero Manifesto Card with Monochrome 8-Bit Peace-Sign Vector */}
            <div className="mb-6 border-2 border-[#111111] bg-[#111111] p-5 text-[#F4F4F0]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F4F4F0]/70">
                    100% FREE • OPEN ARCHIVE • BUILT BY BCKN
                  </p>
                  <h3 className="text-lg font-bold uppercase leading-snug">
                    A free space for unsent feelings &amp; discovering songs you haven&apos;t heard yet.
                  </h3>
                  <p className="text-xs leading-relaxed text-[#F4F4F0]/85">
                    SIDE B // 026 is built by a small independent crew who believe everyone deserves a
                    quiet, ad-free corner of the internet to leave words for someone, attach a 30-second
                    track that says what you couldn&apos;t, and stumble onto new music curated by real
                    people. No paywalls, no subscriptions—always free for everybody.
                  </p>
                </div>

                {/* Pure Monochrome Vector (inherits currentColor: white on dark, black on light) */}
                <div className="flex shrink-0 flex-col items-center justify-center border border-current/30 px-4 py-3 text-[#F4F4F0]">
                  <CubeGuyIcon className="h-16 w-16" />
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-widest opacity-75">
                    PEACE // TEAM BCKN
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-white/20 pt-3 font-mono text-[10px] uppercase sm:grid-cols-3">
                <div className="border border-white/20 p-2">
                  <span className="block opacity-60">01 // EXPRESS</span>
                  <span className="font-bold">SEND ANONYMOUS OR SIGNED NOTES</span>
                </div>
                <div className="border border-white/20 p-2">
                  <span className="block opacity-60">02 // DISCOVER</span>
                  <span className="font-bold">EXPLORE TRACKS &amp; MIXTAPES</span>
                </div>
                <div className="border border-white/20 p-2">
                  <span className="block opacity-60">03 // COMMUNITY</span>
                  <span className="font-bold">FREE FOREVER • BUILT WITH YOU</span>
                </div>
              </div>
            </div>

            {/* Live Reactions Bar */}
            <div className="mb-6">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
                STAMP YOUR REACTION
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REACTION_ITEMS.map((item) => {
                  const active = !!myReactions[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleReact(item.key)}
                      className={`flex flex-col items-start justify-between border border-[#111111] p-2.5 text-left transition ${
                        active
                          ? "bg-[#E11D2A] text-white"
                          : "bg-white text-[#111111] hover:bg-[#111111] hover:text-white"
                      }`}
                    >
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                        {item.label}
                      </span>
                      <span className="mt-1 font-mono text-sm font-bold">
                        {counts[item.key] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments, Suggestions & Bug Reports Composer */}
            <form
              onSubmit={handlePostComment}
              className="mb-6 border-2 border-[#111111] bg-white p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
                  DROP A NOTE, SUGGESTION, OR BUG REPORT
                </span>

                <div className="flex gap-1">
                  {(
                    [
                      { id: "COMMENT", label: "COMMENT", Icon: MessageSquare },
                      { id: "SUGGESTION", label: "IDEA", Icon: Lightbulb },
                      { id: "BUG", label: "BUG", Icon: Bug },
                    ] as const
                  ).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCategory(id)}
                      className={`flex items-center gap-1 border border-[#111111] px-2 py-1 font-mono text-[9px] font-bold uppercase ${
                        category === id
                          ? "bg-[#111111] text-white"
                          : "bg-[#F4F4F0] text-[#111111] hover:bg-neutral-200"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {!currentUser && (
                <input
                  type="text"
                  placeholder="Your handle or nickname (optional)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="mb-2 w-full border border-[#111111] bg-[#F4F4F0] px-3 py-1.5 font-mono text-xs outline-none"
                />
              )}

              <textarea
                rows={3}
                required
                maxLength={600}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === "SUGGESTION"
                    ? "What feature or vibe should we build next for SIDE B?"
                    : category === "BUG"
                    ? "Found a glitch or mobile layout issue? Tell us what happened..."
                    : "Say hi to the team, share a song you found here, or leave your thoughts..."
                }
                className="w-full resize-none border border-[#111111] bg-[#F4F4F0] p-2.5 text-xs outline-none"
              />

              <div className="mt-2.5 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase opacity-65">
                  POSTING AS {currentUser ? `@${currentUser.username}` : authorName.trim() || "ANONYMOUS"}
                </span>
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="flex items-center gap-1.5 border border-[#111111] bg-[#111111] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#E11D2A] disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                  {submitting ? "POSTING..." : "POST TO BOARD"}
                </button>
              </div>
            </form>

            {/* Filterable Community Wall */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#111111] pb-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
                  COMMUNITY BOARD ({visibleComments.length})
                </span>
                <div className="flex gap-1">
                  {(["ALL", "COMMENT", "SUGGESTION", "BUG"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilterTab(tab)}
                      className={`border border-[#111111] px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                        filterTab === tab
                          ? "bg-[#111111] text-white"
                          : "bg-white text-[#111111] hover:bg-neutral-200"
                      }`}
                    >
                      {tab === "ALL" ? "ALL" : tab === "SUGGESTION" ? "IDEAS" : tab === "BUG" ? "BUGS" : "COMMENTS"}
                    </button>
                  ))}
                </div>
              </div>

              {visibleComments.length === 0 ? (
                <div className="border border-dashed border-[#111111] bg-white p-6 text-center font-mono text-[11px] uppercase opacity-70">
                  NO ENTRIES IN THIS FILTER YET. BE THE FIRST TO LEAVE ONE ABOVE.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visibleComments.map((item) => (
                    <div
                      key={item.id}
                      className="border border-[#111111] bg-white p-3"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase">
                            {item.authorHandle}
                          </span>
                          <span
                            className={`border border-[#111111] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${
                              item.category === "BUG"
                                ? "bg-[#E11D2A] text-white"
                                : item.category === "SUGGESTION"
                                ? "bg-[#111111] text-white"
                                : "bg-[#F4F4F0] text-[#111111]"
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] uppercase opacity-60">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
