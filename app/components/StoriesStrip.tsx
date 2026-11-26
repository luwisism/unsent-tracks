"use client";

import { StoryUser } from "../types/archive";
import { getContrastText, getMonogram } from "../utils/poster";

interface StoriesStripProps {
  stories: StoryUser[];
  darkMode: boolean;
  seenNoteIds: number[];
  followingHandles: string[];
  currentUsername?: string | null;
  onSelectStory: (originalIdx: number, startSlideIdx?: number) => void;
}

export default function StoriesStrip({
  stories,
  darkMode,
  seenNoteIds,
  followingHandles,
  currentUsername,
  onSelectStory,
}: StoriesStripProps) {
  const borderClass = darkMode ? "border-neutral-700" : "border-[#111111]";
  const sectionBg = darkMode ? "bg-[#121212] text-[#F4F4F0]" : "bg-white text-[#111111]";

  const seenSet = new Set(seenNoteIds);
  const followSet = new Set(followingHandles.map((h) => h.toLowerCase()));

  // Enrich with seen + following status and sort: Unseen first, Following prioritized
  const enriched = stories
    .map((storyUser, originalIdx) => {
      const unseenCount = storyUser.notes.filter((n) => !seenSet.has(n.id)).length;
      const isSeenAll = unseenCount === 0;
      const firstUnseenIdx = storyUser.notes.findIndex((n) => !seenSet.has(n.id));
      const isSelf =
        Boolean(currentUsername) &&
        storyUser.username.toLowerCase() === currentUsername!.toLowerCase();
      const isFollowing = followSet.has(storyUser.username.toLowerCase());

      return {
        storyUser,
        originalIdx,
        unseenCount,
        isSeenAll,
        startSlideIdx: firstUnseenIdx >= 0 ? firstUnseenIdx : 0,
        isSelf,
        isFollowing,
      };
    })
    .sort((a, b) => {
      if (a.isSeenAll !== b.isSeenAll) return a.isSeenAll ? 1 : -1;
      const aCircle = a.isSelf || a.isFollowing;
      const bCircle = b.isSelf || b.isFollowing;
      if (aCircle !== bCircle) return aCircle ? -1 : 1;
      return a.originalIdx - b.originalIdx;
    });

  return (
    <section className={`border-b ${borderClass} ${sectionBg} transition-colors`}>
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E11D2A]">
              ● 24H ACTIVE TRANSMISSIONS ({stories.length})
            </span>
            <div className="hidden sm:flex items-center gap-2 font-mono text-[9px] uppercase opacity-70">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 bg-[#E11D2A]" /> UNSEEN
              </span>
              <span>/</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 border border-current opacity-50" /> SEEN
              </span>
              <span>/</span>
              <span>SOLID = FOLLOWING · DASHED = PUBLIC</span>
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase opacity-50">
            AUTO-ADVANCING AUDIO STORIES // TAP MONOGRAM
          </span>
        </div>

        {enriched.length === 0 ? (
          <p className="py-2 font-mono text-xs opacity-60">
            No profile transmissions logged in the past 24 hours. Post under a profile to appear here.
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-1">
            {enriched.map(
              ({
                storyUser,
                originalIdx,
                unseenCount,
                isSeenAll,
                startSlideIdx,
                isSelf,
                isFollowing,
              }) => {
                const isCircle = isSelf || isFollowing;
                const borderStyle = isCircle ? "border-solid" : "border-dashed";

                const cardSurface = isSeenAll
                  ? darkMode
                    ? "border-neutral-700 bg-[#161616] text-neutral-400 opacity-65 hover:opacity-100"
                    : "border-neutral-400 bg-neutral-100/80 text-neutral-500 opacity-70 hover:opacity-100"
                  : darkMode
                  ? "border-neutral-600 bg-[#1B1B1B] text-[#F4F4F0] hover:bg-white hover:text-[#111111]"
                  : "border-[#111111] bg-[#F4F4F0] text-[#111111] hover:bg-[#111111] hover:text-white";

                const ringClass = isSeenAll
                  ? "ring-1 ring-neutral-400 ring-offset-1 grayscale-[45%]"
                  : isCircle
                  ? "ring-2 ring-[#E11D2A] ring-offset-1"
                  : "ring-2 ring-[#0047AB] ring-offset-1";

                return (
                  <button
                    key={storyUser.id}
                    onClick={() => onSelectStory(originalIdx, startSlideIdx)}
                    className={`group flex shrink-0 items-center gap-3 border ${borderStyle} p-2 pr-4 text-left transition ${cardSurface}`}
                  >
                    <div
                      style={{
                        backgroundColor: storyUser.monogramColor,
                        color: getContrastText(storyUser.monogramColor),
                      }}
                      className={`relative flex h-11 w-11 items-center justify-center border border-[#111111] font-mono text-sm font-bold tracking-tighter ${ringClass}`}
                    >
                      {getMonogram(storyUser.username)}
                      <span
                        className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center border px-1 font-mono text-[9px] font-bold ${
                          isSeenAll
                            ? "border-neutral-400 bg-neutral-200 text-neutral-600"
                            : "border-[#111111] bg-[#E11D2A] text-white"
                        }`}
                      >
                        {isSeenAll ? "✓" : unseenCount}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider">
                          @{storyUser.username}
                        </p>
                        {isSelf ? (
                          <span className="border border-current/40 px-1 py-0.2 font-mono text-[8px] font-bold uppercase">
                            YOU
                          </span>
                        ) : isFollowing ? (
                          <span className="bg-[#111111] px-1 py-0.2 font-mono text-[8px] font-bold uppercase text-white group-hover:bg-[#E11D2A]">
                            FOLLOWING
                          </span>
                        ) : (
                          <span className="border border-dashed border-current/40 px-1 py-0.2 font-mono text-[8px] uppercase opacity-75">
                            PUBLIC
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] opacity-70">
                        {storyUser.archetype} {isSeenAll ? "• SEEN" : `• ${unseenCount} NEW`}
                      </p>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </section>
  );
}
