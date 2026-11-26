"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import {
  Mixtape,
  Note,
  Reaction,
  SongReply,
  StoryUser,
  SUGGESTED_TAGS,
  SWISS_SWATCHES,
  UserProfile,
} from "./types/archive";
import { VinylAmbienceEngine } from "./utils/vinylAudio";
import Navbar from "./components/Navbar";
import StoriesStrip from "./components/StoriesStrip";
import NoteCard from "./components/NoteCard";
import StoryViewerModal from "./components/StoryViewerModal";
import ReaderModal from "./components/ReaderModal";
import ComposerModal from "./components/ComposerModal";
import ProfileModal from "./components/ProfileModal";
import AuthModal from "./components/AuthModal";
import RadioBar from "./components/RadioBar";
import NameVaultModal from "./components/NameVaultModal";
import MixtapeDrawerModal from "./components/MixtapeDrawerModal";

export default function SwissUnsentPlatform() {
  const [darkMode, setDarkMode] = useState(false);
  const [vinylMode, setVinylMode] = useState(false);
  const vinylEngineRef = useRef<VinylAmbienceEngine | null>(null);
  const [listenerCount, setListenerCount] = useState(1);

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [nowTick, setNowTick] = useState<number>(0);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const logUserActivity = async (type: string, summary: string, noteId?: number) => {
    if (!currentUser?.username) return;
    try {
      await fetch(`/api/users/${encodeURIComponent(currentUser.username)}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, summary, noteId }),
      });
    } catch {}
  };
  const [unlockedNoteIds, setUnlockedNoteIds] = useState<number[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isNameVaultOpen, setIsNameVaultOpen] = useState(false);
  const [isMixtapeModalOpen, setIsMixtapeModalOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);

  // Stories & Synchronized Radio / Mixtape Queue
  const [activeStoryUserIdx, setActiveStoryUserIdx] = useState<number | null>(null);
  const [seenNoteIds, setSeenNoteIds] = useState<number[]>([]);
  const [followingHandles, setFollowingHandles] = useState<string[]>([]);

  const markStoryNoteSeen = useCallback((noteId?: number) => {
    if (!noteId) return;
    setSeenNoteIds((prev) => {
      if (prev.includes(noteId)) return prev;
      const next = [...prev, noteId];
      try {
        localStorage.setItem("sideb_seen_stories", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [isRadioActive, setIsRadioActive] = useState(false);
  const [radioNote, setRadioNote] = useState<Note | null>(null);
  const [mixtapeQueue, setMixtapeQueue] = useState<Note[]>([]);
  const [mixtapeIdx, setMixtapeIdx] = useState(0);

  // Audio Playback State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clipBoundsRef = useRef<{ start: number; end: number; noteId?: number }>({
    start: 0,
    end: 30,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [sentSignals, setSentSignals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setNowTick(Date.now());
    const interval = setInterval(() => setNowTick(Date.now()), 1000);

    const savedSeen = localStorage.getItem("sideb_seen_stories");
    if (savedSeen) {
      try {
        setSeenNoteIds(JSON.parse(savedSeen));
      } catch {}
    }

    const savedTheme = localStorage.getItem("liner_notes_theme");
    if (savedTheme === "dark") setDarkMode(true);

    const savedUser = localStorage.getItem("liner_notes_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {}
    }

    const sessionId =
      sessionStorage.getItem("ln_sid") || Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("ln_sid", sessionId);

    const pingPresence = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.count) setListenerCount(d.count);
        })
        .catch(() => {});
    };

    pingPresence();
    const presenceInterval = setInterval(pingPresence, 12000);

  return () => {
      clearInterval(interval);
      clearInterval(presenceInterval);
      vinylEngineRef.current?.stop();
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("liner_notes_theme", next ? "dark" : "light");
      return next;
    });
  };

  const toggleVinylMode = () => {
    setVinylMode((prev) => {
      const next = !prev;
      if (next) {
        if (!vinylEngineRef.current) vinylEngineRef.current = new VinylAmbienceEngine();
        vinylEngineRef.current.start();
      } else {
        vinylEngineRef.current?.stop();
      }
      return next;
    });
  };

  const fetchArchive = useCallback(async () => {
    setIsLoadingNotes(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterColor) params.set("color", filterColor);
      if (filterTag) params.set("tag", filterTag);
      if (unlockedNoteIds.length > 0) params.set("unlocked", unlockedNoteIds.join(","));

      const res = await fetch(`/api/notes?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.notes) setNotes(data.notes);
      if (data.stories) setStories(data.stories);
      if (data.availableColors) setAvailableColors(data.availableColors);
      if (data.availableTags) setAvailableTags(data.availableTags);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [searchQuery, filterColor, filterTag, unlockedNoteIds]);

  const refreshFollowing = useCallback(async () => {
    if (!currentUser?.username) {
      setFollowingHandles([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(currentUser.username)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.following)) {
        setFollowingHandles(
          data.following
            .map((f: any) => f.following?.username)
            .filter(Boolean)
        );
      }
    } catch {}
  }, [currentUser?.username]);

  useEffect(() => {
    refreshFollowing();
  }, [refreshFollowing, viewedProfile]);

  useEffect(() => {
    const timer = setTimeout(() => fetchArchive(), 180);
    return () => clearTimeout(timer);
  }, [fetchArchive]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteParam = params.get("note");
    const userParam = params.get("u");

    if (noteParam) {
      fetch(`/api/notes?id=${encodeURIComponent(noteParam)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.notes?.[0]) setActiveNote(d.notes[0]);
        });
    } else if (userParam) {
      openProfile(userParam);
    }
  }, []);

  const isNoteLocked = (note: Note) => {
    if (!note.unlockAt || nowTick === 0) return false;
    return new Date(note.unlockAt).getTime() > nowTick;
  };

  const isNotePasscodeLocked = (note: Note) => {
    return Boolean(note.isPasscodeProtected && !unlockedNoteIds.includes(note.id));
  };

  const playPreview = useCallback(
    (
      url: string | null | undefined,
      trackId: string,
      startSec = 0,
      endSec = 30,
      forceRestart = false,
      noteId?: number
    ) => {
      if (!url || !audioRef.current) return;
      if (!forceRestart && playingTrackId === trackId && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      // iTunes previews are 30s max; prevent startSec >= 28 from jumping straight to onEnded
      const safeStart = startSec >= 28 ? startSec % 15 : Math.max(0, startSec);
      const safeEnd = endSec <= safeStart || endSec > 30 ? 30 : endSec;

      clipBoundsRef.current = { start: safeStart, end: safeEnd, noteId };
      audioRef.current.src = url;
      audioRef.current.currentTime = safeStart;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setPlayingTrackId(trackId);
        })
        .catch(() => setIsPlaying(false));
    },
    [playingTrackId, isPlaying]
  );

  const handleSeekAudio = (pct: number) => {
    if (!audioRef.current) return;
    const { start, end } = clipBoundsRef.current;
    const target = start + ((end - start) * pct) / 100;
    audioRef.current.currentTime = target;
    setProgress(pct);
  };

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setPlayingTrackId(null);
      setProgress(0);
      setCurrentTime(0);
    }
  }, []);

  const registerListenCompleted = useCallback(
    (noteId?: number) => {
      if (!noteId) return;
      const target = notes.find((n) => n.id === noteId);
      if (!target || !target.maxListens) return;

      fetch(`/api/notes/${noteId}/listen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listen" }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.burned) {
            setActiveNote((prev) => (prev?.id === noteId ? null : prev));
            fetchArchive();
          } else if (typeof d.listenCount === "number") {
            setNotes((prev) =>
              prev.map((n) => (n.id === noteId ? { ...n, listenCount: d.listenCount } : n))
            );
            setActiveNote((prev) =>
              prev?.id === noteId ? { ...prev, listenCount: d.listenCount } : prev
            );
          }
        })
        .catch(() => {});
    },
    [notes, fetchArchive]
  );

  const activeStoryUser =
    activeStoryUserIdx !== null && stories[activeStoryUserIdx]
      ? stories[activeStoryUserIdx]
      : null;

  const advanceStory = useCallback(() => {
    if (activeStoryUserIdx === null || !stories[activeStoryUserIdx]) return;
    const currentUserStories = stories[activeStoryUserIdx].notes;

    if (storyIndex + 1 < currentUserStories.length) {
      setStoryIndex((i) => i + 1);
      setStoryProgress(0);
    } else if (activeStoryUserIdx + 1 < stories.length) {
      setActiveStoryUserIdx((u) => (u !== null ? u + 1 : null));
      setStoryIndex(0);
      setStoryProgress(0);
    } else {
      setActiveStoryUserIdx(null);
      setStoryIndex(0);
      setStoryProgress(0);
      stopAudio();
    }
  }, [activeStoryUserIdx, stories, storyIndex, stopAudio]);

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setStoryProgress(0);
    } else if (activeStoryUserIdx !== null && activeStoryUserIdx > 0) {
      const prevUserIdx = activeStoryUserIdx - 1;
      setActiveStoryUserIdx(prevUserIdx);
      setStoryIndex(Math.max(0, stories[prevUserIdx].notes.length - 1));
      setStoryProgress(0);
    }
  };

  useEffect(() => {
    if (activeStoryUser && activeStoryUser.notes[storyIndex]) {
      const sNote = activeStoryUser.notes[storyIndex];
      markStoryNoteSeen(sNote.id);
      setStoryProgress(0);
      setIsStoryPaused(false);
      if (sNote.previewUrl) {
        playPreview(
          sNote.previewUrl,
          sNote.trackId,
          sNote.clipStart ?? 0,
          sNote.clipEnd ?? 30,
          true,
          sNote.id
        );
      } else {
        stopAudio();
      }
    }
  }, [activeStoryUserIdx, storyIndex]);

  useEffect(() => {
    if (!activeStoryUser || isStoryPaused) return;
    const sNote = activeStoryUser.notes[storyIndex];
    if (!sNote || sNote.previewUrl) return;

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          advanceStory();
          return 0;
        }
        return prev + 1.25;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [activeStoryUser, storyIndex, isStoryPaused, advanceStory]);

  useEffect(() => {
    if (!activeStoryUser || !audioRef.current) return;
    if (isStoryPaused) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (activeStoryUser.notes[storyIndex]?.previewUrl && audioRef.current.src) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isStoryPaused]);

  useEffect(() => {
    if (activeNote?.previewUrl) {
      playPreview(
        activeNote.previewUrl,
        activeNote.trackId,
        activeNote.clipStart ?? 0,
        activeNote.clipEnd ?? 30,
        true,
        activeNote.id
      );
    } else if (!activeStoryUser && !isRadioActive) {
      stopAudio();
    }
  }, [activeNote]);

  const playNextRadioTrack = useCallback(() => {
    if (mixtapeQueue.length > 0) {
      const nextIdx = (mixtapeIdx + 1) % mixtapeQueue.length;
      setMixtapeIdx(nextIdx);
      const nextTrackNote = mixtapeQueue[nextIdx];
      setRadioNote(nextTrackNote);
      playPreview(
        nextTrackNote.previewUrl,
        nextTrackNote.trackId,
        nextTrackNote.clipStart ?? 0,
        nextTrackNote.clipEnd ?? 30,
        true,
        nextTrackNote.id
      );
      return;
    }

    const playable = notes.filter((n) => n.previewUrl && !isNoteLocked(n) && !n.isPasscodeProtected);
    if (playable.length === 0) return;

    const currentIdx = radioNote ? playable.findIndex((n) => n.id === radioNote.id) : -1;
    const slotIndex = currentIdx >= 0
      ? (currentIdx + 1) % playable.length
      : Math.floor(Date.now() / 30000) % playable.length;
    const syncedNote = playable[slotIndex];
    setRadioNote(syncedNote);
    playPreview(
      syncedNote.previewUrl,
      syncedNote.trackId,
      syncedNote.clipStart ?? 0,
      syncedNote.clipEnd ?? 30,
      true,
      syncedNote.id
    );
  }, [notes, radioNote, mixtapeQueue, mixtapeIdx, playPreview]);

  const toggleRadioMode = () => {
    if (isRadioActive) {
      setIsRadioActive(false);
      setRadioNote(null);
      setMixtapeQueue([]);
      stopAudio();
    } else {
      setMixtapeQueue([]);
      setIsRadioActive(true);
      playNextRadioTrack();
    }
  };

  const handlePlayMixtape = (tape: Mixtape) => {
    const queue = tape.items.map((i) => i.note).filter((n) => n.previewUrl);
    if (queue.length === 0) return;
    setMixtapeQueue(queue);
    setMixtapeIdx(0);
    setIsRadioActive(true);
    setRadioNote(queue[0]);
    playPreview(
      queue[0].previewUrl,
      queue[0].trackId,
      queue[0].clipStart ?? 0,
      queue[0].clipEnd ?? 30,
      true,
      queue[0].id
    );
  };

  const handleNoteUnlocked = (noteId: number, message: string, lyricExcerpt: string | null) => {
    setUnlockedNoteIds((prev) => [...prev, noteId]);
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, message, lyricExcerpt } : n))
    );
    setActiveNote((prev) => (prev?.id === noteId ? { ...prev, message, lyricExcerpt } : prev));
  };


  useEffect(() => {
    if (!currentUser?.id || !notes.length) return;
    const hydrated: Record<string, boolean> = {};
    for (const n of notes) {
      for (const r of (n.reactions || []) as Array<Reaction & { userId?: number | null }>) {
        if (r.userId === currentUser.id) {
          hydrated[`${n.id}-${r.type}`] = true;
        }
      }
    }
    setSentSignals((prev) => ({ ...prev, ...hydrated }));
  }, [notes, currentUser?.id]);

  const sendSignal = async (noteId: number, type: string) => {
    const key = `${noteId}-${type}`;
    const isAlreadySent = Boolean(sentSignals[key]);

    // Toggle active button state immediately
    setSentSignals((prev) => {
      const next = { ...prev };
      if (isAlreadySent) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });

    const optimisticReaction: Reaction = { id: Date.now(), type, userId: currentUser?.id } as Reaction;

    const updateNoteReactions = (n: Note) => {
      if (n.id !== noteId) return n;
      const current = n.reactions || [];
      if (isAlreadySent) {
        let removed = false;
        const filtered = current.filter((r) => {
          if (!removed && r.type === type && (!currentUser?.id || (r as Reaction & { userId?: number | null }).userId === currentUser.id || !(r as Reaction & { userId?: number | null }).userId)) {
            removed = true;
            return false;
          }
          return true;
        });
        return { ...n, reactions: filtered };
      }
      return { ...n, reactions: [...current, optimisticReaction] };
    };

    setNotes((prev) => prev.map(updateNoteReactions));
    setStories((prev) =>
      prev.map((su) => ({
        ...su,
        notes: su.notes.map(updateNoteReactions),
      }))
    );
    if (activeNote?.id === noteId) {
      setActiveNote((prev) => (prev ? updateNoteReactions(prev) : null));
    }

    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, type, userId: currentUser?.id, username: currentUser?.username }),
    });
  };

  const handleReplyAdded = (noteId: number, reply: unknown) => {
    const typedReply = reply as SongReply;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, replies: [...(n.replies || []), typedReply] } : n
      )
    );
    if (activeNote?.id === noteId) {
      setActiveNote((prev) =>
        prev ? { ...prev, replies: [...(prev.replies || []), typedReply] } : null
      );
    }
    const targetNote = notes.find((n) => n.id === noteId);
    const rep = reply as { trackName?: string };
    logUserActivity(
      "REPLIED",
      `Replied with "${rep?.trackName || "a track"}" on note to ${targetNote?.recipient || "Archive"}`,
      noteId
    );
  };

  const openProfile = async (username: string) => {
    const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
    if (res.ok) {
      const profileData = await res.json();
      setViewedProfile(profileData);
    }
  };

  const handleAuthSuccess = (userWithPass: UserProfile) => {
    setCurrentUser(userWithPass);
    localStorage.setItem("liner_notes_user", JSON.stringify(userWithPass));
    fetchArchive();
    if (viewedProfile?.username === userWithPass.username) {
      openProfile(userWithPass.username);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("liner_notes_user");
  };

  // Merge core Swiss swatches with any custom hex colors in the archive
  const coreHexes = new Set(SWISS_SWATCHES.map((s) => s.hex.toUpperCase()));
  const customArchiveColors = availableColors.filter((hex) => !coreHexes.has(hex.toUpperCase()));
  const allSurfaceSwatches = [
    ...SWISS_SWATCHES.map((s) => s.hex.toUpperCase()),
    ...customArchiveColors,
  ];

  // Merge live archive tags with default suggestions (up to 10 unique tags)
  const displayTags = Array.from(new Set([...availableTags, ...SUGGESTED_TAGS])).slice(0, 10);

  const pageBg = darkMode ? "bg-[#0D0D0D] text-[#F4F4F0]" : "bg-[#F4F4F0] text-[#111111]";
  const borderClass = darkMode ? "border-neutral-700" : "border-[#111111]";
  const inputBg = darkMode
    ? "border-neutral-700 bg-[#171717] text-[#F4F4F0]"
    : "border-[#111111] bg-white text-[#111111]";

  return (
    <div
      className={`min-h-screen ${pageBg} font-sans antialiased selection:bg-[#E11D2A] selection:text-white pb-16 transition-colors`}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          const cur = audioRef.current.currentTime;
          setCurrentTime(cur);

          const { start, end, noteId } = clipBoundsRef.current;
          const duration = Math.max(1, end - start);
          const pct = Math.min(100, Math.max(0, ((cur - start) / duration) * 100));

          setProgress(pct);
          if (activeStoryUser) setStoryProgress(pct);

          if (cur >= end) {
            registerListenCompleted(noteId);
            if (activeStoryUser) {
              advanceStory();
            } else if (isRadioActive) {
              playNextRadioTrack();
            } else {
              setIsPlaying(false);
              setProgress(0);
              audioRef.current.pause();
            }
          }
        }}
        onEnded={() => {
          registerListenCompleted(clipBoundsRef.current.noteId);
          if (activeStoryUser) advanceStory();
          else if (isRadioActive) playNextRadioTrack();
          else {
            setIsPlaying(false);
            setProgress(0);
          }
        }}
      />

      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        vinylMode={vinylMode}
        onToggleVinylMode={toggleVinylMode}
        isRadioActive={isRadioActive}
        onToggleRadio={toggleRadioMode}
        listenerCount={listenerCount}
        currentUser={currentUser}
        onOpenProfile={openProfile}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenComposer={() => setIsComposerOpen(true)}
        onOpenNameVault={() => setIsNameVaultOpen(true)}
        onOpenMixtapes={() => setIsMixtapeModalOpen(true)}
      />

      <StoriesStrip
        stories={stories}
        darkMode={darkMode}
        seenNoteIds={seenNoteIds}
        followingHandles={followingHandles}
        currentUsername={currentUser?.username || null}
        onSelectStory={(idx, startSlideIdx = 0) => {
          setIsRadioActive(false);
          setStoryIndex(startSlideIdx);
          setActiveStoryUserIdx(idx);
        }}
      />

      {/* Editorial Header & Search */}
      <section className={`border-b ${borderClass}`}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-12">
          <div
            className={`border-b ${borderClass} p-5 sm:p-6 md:col-span-8 md:border-b-0 md:border-r md:p-10`}
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#E11D2A]">
              PUBLIC ARCHIVE / ARCHIVE HANDLES &amp; UNLISTED NOTES
            </p>
            <h1 className="text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              UNSENT WORDS.
              <br />
              SOUNDTRACKED.
            </h1>
          </div>

          <div className="flex flex-col justify-between p-5 sm:p-6 md:col-span-4 md:p-10">
            <p className="text-xs leading-relaxed opacity-75">
              Pair unsent confessions with trimmed audio clips, pinned lyric excerpts, song-only
              replies, encrypted pins, and curated cassettes.
            </p>

            <div className="mt-6">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
                SEARCH ARCHIVE, TAGS &amp; HANDLES
              </label>
              <div className={`relative flex items-center border ${inputBg}`}>
                <Search className="ml-3 h-4 w-4 opacity-50" />
                <input
                  type="text"
                  placeholder="Recipient, @handle, #tag, lyric, or song..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent px-3 py-2.5 text-xs font-medium outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Surface & Live Tags Filter Strip */}
      <section className={`border-b ${borderClass}`}>
        <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-6 overflow-x-auto px-4 py-2.5 sm:px-6">
          <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">
              SURFACE:
            </span>
            <button
              onClick={() => setFilterColor("")}
              className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase ${
                filterColor === "" ? "border-[#E11D2A] bg-[#E11D2A] text-white" : inputBg
              }`}
            >
              ALL
            </button>
            {allSurfaceSwatches.slice(0, 8).map((hex) => (
              <button
                key={hex}
                onClick={() =>
                  setFilterColor(filterColor.toUpperCase() === hex ? "" : hex)
                }
                style={{ backgroundColor: hex }}
                title={hex}
                className={`h-5 w-5 shrink-0 border ${borderClass} ${
                  filterColor.toUpperCase() === hex
                    ? "ring-2 ring-[#E11D2A] ring-offset-1"
                    : ""
                }`}
              />
            ))}
            <label
              title="Filter by custom hex color"
              className={`flex h-5 shrink-0 cursor-pointer items-center gap-1 border px-1.5 font-mono text-[9px] font-bold uppercase ${inputBg}`}
            >
              <input
                type="color"
                value={filterColor || "#111111"}
                onChange={(e) => setFilterColor(e.target.value.toUpperCase())}
                className="h-3.5 w-3.5 cursor-pointer border-0 bg-transparent p-0"
              />
              HEX
            </label>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
            <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">
              TAGS:
            </span>
            <button
              onClick={() => setFilterTag("")}
              className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase ${
                filterTag === "" ? "border-[#E11D2A] bg-[#E11D2A] text-white" : inputBg
              }`}
            >
              ALL
            </button>
            {displayTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase ${
                  filterTag === tag ? "border-[#E11D2A] bg-[#E11D2A] text-white" : inputBg
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Modular Archive Grid */}
      <main className="mx-auto max-w-7xl">
        {isLoadingNotes && notes.length === 0 ? (
          <div className={`grid grid-cols-1 border-l ${borderClass} sm:grid-cols-2 lg:grid-cols-3`}>
            {[
              { code: "CH-01", w1: "w-4/5", w2: "w-1/2", l1: "w-full", l2: "w-10/12", l3: "w-3/5", delay: "0ms" },
              { code: "CH-02", w1: "w-2/3", w2: "w-3/5", l1: "w-11/12", l2: "w-4/5", l3: "w-1/2", delay: "110ms" },
              { code: "CH-03", w1: "w-3/4", w2: "w-2/5", l1: "w-full", l2: "w-9/12", l3: "w-2/3", delay: "220ms" },
              { code: "CH-04", w1: "w-3/5", w2: "w-1/2", l1: "w-10/12", l2: "w-full", l3: "w-4/6", delay: "330ms" },
              { code: "CH-05", w1: "w-4/5", w2: "w-1/3", l1: "w-9/12", l2: "w-11/12", l3: "w-3/4", delay: "440ms" },
              { code: "CH-06", w1: "w-2/3", w2: "w-1/2", l1: "w-full", l2: "w-3/4", l3: "w-1/2", delay: "550ms" },
            ].map((sk) => (
              <div
                key={sk.code}
                className={`group border-r border-b ${borderClass} p-5 transition-colors`}
              >
                <div className="mb-4 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                  <span className="opacity-70">{sk.code} // SCANNING</span>
                  <span className="border border-[#E11D2A] px-1.5 py-0.5 text-[#E11D2A]">
                    SYNC
                  </span>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`sideb-shimmer h-14 w-14 shrink-0 border ${borderClass} ${darkMode ? "bg-white/10" : "bg-black/[0.06]"}`}
                    style={{ animationDelay: sk.delay }}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div
                      className={`sideb-shimmer h-3.5 ${sk.w1} ${darkMode ? "bg-white/15" : "bg-black/10"}`}
                      style={{ animationDelay: sk.delay }}
                    />
                    <div
                      className={`sideb-shimmer h-3 ${sk.w2} ${darkMode ? "bg-white/10" : "bg-black/[0.07]"}`}
                      style={{ animationDelay: sk.delay }}
                    />
                  </div>
                </div>

                <div className="mb-5 space-y-2">
                  <div
                    className={`sideb-shimmer h-3 ${sk.l1} ${darkMode ? "bg-white/10" : "bg-black/[0.07]"}`}
                    style={{ animationDelay: sk.delay }}
                  />
                  <div
                    className={`sideb-shimmer h-3 ${sk.l2} ${darkMode ? "bg-white/10" : "bg-black/[0.07]"}`}
                    style={{ animationDelay: sk.delay }}
                  />
                  <div
                    className={`sideb-shimmer h-3 ${sk.l3} ${darkMode ? "bg-white/10" : "bg-black/[0.07]"}`}
                    style={{ animationDelay: sk.delay }}
                  />
                </div>

                <div className={`flex items-center justify-between border-t ${borderClass} pt-3`}>
                  <div
                    className={`sideb-shimmer h-3 w-20 ${darkMode ? "bg-white/10" : "bg-black/[0.07]"}`}
                    style={{ animationDelay: sk.delay }}
                  />
                  <div
                    className={`sideb-shimmer h-3 w-14 ${darkMode ? "bg-white/10" : "bg-black/[0.07]"}`}
                    style={{ animationDelay: sk.delay }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className={`border-b ${borderClass} px-6 py-24 text-center`}>
            <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
              NO ARCHIVE ENTRIES MATCH CURRENT FILTER
            </p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 border-l ${borderClass} sm:grid-cols-2 lg:grid-cols-3`}>
            {notes.map((note) => {
              const locked = isNoteLocked(note);
              const pinLocked = isNotePasscodeLocked(note);
              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  locked={locked}
                  isPasscodeLocked={pinLocked}
                  nowTick={nowTick}
                  isPlaying={isPlaying}
                  playingTrackId={playingTrackId}
                  darkMode={darkMode}
                  onOpenProfile={openProfile}
                  onCardClick={() => {
                    if (locked) {
                      playPreview(
                        note.previewUrl,
                        note.trackId,
                        note.clipStart,
                        note.clipEnd,
                        false,
                        note.id
                      );
                    } else {
                      setActiveNote(note);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </main>

      {isRadioActive && radioNote && (
        <RadioBar
          radioNote={radioNote}
          isPlaying={isPlaying}
          progress={progress}
          onPlayToggle={() =>
            playPreview(
              radioNote.previewUrl,
              radioNote.trackId,
              radioNote.clipStart,
              radioNote.clipEnd,
              false,
              radioNote.id
            )
          }
          onNext={playNextRadioTrack}
          onClose={toggleRadioMode}
        />
      )}

      {activeStoryUser && (
        <StoryViewerModal
          storyUser={activeStoryUser}
          storyIndex={storyIndex}
          storyProgress={storyProgress}
          isStoryPaused={isStoryPaused}
          setIsStoryPaused={setIsStoryPaused}
          currentTime={currentTime}
          isPlaying={isPlaying}
          sentSignals={sentSignals}
          onSendSignal={sendSignal}
          onPrev={prevStory}
          onNext={advanceStory}
          onClose={() => {
            setActiveStoryUserIdx(null);
            stopAudio();
          }}
          onOpenProfile={openProfile}
          onPlayPreview={playPreview}
        />
      )}

      {activeNote && (
        <ReaderModal
          note={activeNote}
          currentUser={currentUser}
          currentTime={currentTime}
          isPlaying={isPlaying}
          playingTrackId={playingTrackId}
          progress={progress}
          sentSignals={sentSignals}
          onSendSignal={sendSignal}
          onPlayPreview={(url, id, start, end) =>
            playPreview(url, id, start, end, false, activeNote.id)
          }
          onSeekAudio={handleSeekAudio}
          onNoteUnlocked={handleNoteUnlocked}
          onReplyAdded={handleReplyAdded}
          onClose={() => setActiveNote(null)}
        />
      )}

      {isNameVaultOpen && (
        <NameVaultModal
          notes={notes}
          onSelectNote={(n) => setActiveNote(n)}
          onClose={() => setIsNameVaultOpen(false)}
        />
      )}

      {isMixtapeModalOpen && (
        <MixtapeDrawerModal
          notes={notes}
          currentUser={currentUser}
          onPlayMixtape={handlePlayMixtape}
          onClose={() => setIsMixtapeModalOpen(false)}
        />
      )}

      {isComposerOpen && (
        <ComposerModal
          currentUser={currentUser}
          onClose={() => setIsComposerOpen(false)}
          onSuccess={() => {
            fetchArchive();
            if (viewedProfile && currentUser && viewedProfile.username === currentUser.username) {
              openProfile(currentUser.username);
            }
          }}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onPlayPreview={playPreview}
          onStopAudio={stopAudio}
        />
      )}

      {viewedProfile && (
        <ProfileModal
          profile={viewedProfile}
          currentUser={currentUser}
          isPlaying={isPlaying}
          playingTrackId={playingTrackId}
          progress={progress}
          currentTime={currentTime}
          onPlayPreview={(url, id, start = 0, end = 30) => playPreview(url, id, start, end)}
          onSeekAudio={handleSeekAudio}
          onEdit={() => setIsEditProfileOpen(true)}
          onSelectNote={(n) => setActiveNote(n)}
          onPinChanged={(nextPinnedId) => {
            setViewedProfile((prev) =>
              prev ? { ...prev, pinnedNoteId: nextPinnedId } : null
            );
            setCurrentUser((prev) => {
              if (!prev) return null;
              const updated = { ...prev, pinnedNoteId: nextPinnedId };
              localStorage.setItem("liner_notes_user", JSON.stringify(updated));
              return updated;
            });
          }}
          onClose={() => setViewedProfile(null)}
        />
      )}

      {(isAuthModalOpen || isEditProfileOpen) && (
        <AuthModal
          isEditMode={isEditProfileOpen}
          currentUser={currentUser}
          onSuccess={handleAuthSuccess}
          onClose={() => {
            setIsAuthModalOpen(false);
            setIsEditProfileOpen(false);
          }}
        />
      )}
    </div>
  );
}
