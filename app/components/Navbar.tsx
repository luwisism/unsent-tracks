"use client";

import { useState } from "react";
import {
  Plus,
  Radio,
  Moon,
  Sun,
  Disc,
  User,
  LogOut,
  Search,
  CassetteTape,
  Menu,
  X,
} from "lucide-react";
import { UserProfile } from "../types/archive";
import { getContrastText, getMonogram } from "../utils/poster";
import { CubeGuyIcon } from "./ManifestoModal";

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  vinylMode: boolean;
  onToggleVinylMode: () => void;
  isRadioActive: boolean;
  onToggleRadio: () => void;
  listenerCount: number;
  currentUser: UserProfile | null;
  onOpenProfile: (username: string) => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenComposer: () => void;
  onOpenNameVault: () => void;
  onOpenMixtapes: () => void;
}

export default function Navbar({
  darkMode,
  onToggleDarkMode,
  vinylMode,
  onToggleVinylMode,
  isRadioActive,
  onToggleRadio,
  listenerCount,
  currentUser,
  onOpenProfile,
  onLogout,
  onOpenAuth,
  onOpenComposer,
  onOpenNameVault,
  onOpenMixtapes,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const borderClass = darkMode ? "border-neutral-700" : "border-[#111111]";
  const navBg = darkMode ? "bg-[#0D0D0D]/95" : "bg-[#F4F4F0]/95";
  const drawerBg = darkMode ? "bg-[#121212]" : "bg-[#F4F4F0]";
  const btnBase = darkMode
    ? "border-neutral-700 bg-[#171717] text-[#F4F4F0] hover:bg-neutral-800"
    : "border-[#111111] bg-white text-[#111111] hover:bg-neutral-200";

  const uniformBtn = `inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border px-3 text-[11px] font-bold uppercase tracking-wider transition ${btnBase}`;
  const iconOnlyBtn = `inline-flex h-8 w-8 shrink-0 items-center justify-center border transition ${btnBase}`;

  const closeAndRun = (fn: () => void) => {
    setMobileMenuOpen(false);
    fn();
  };

  return (
    <header className={`sticky top-0 z-30 border-b ${borderClass} ${navBg} backdrop-blur-sm`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:py-3.5">
        {/* Brand + Live Indicator */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-block h-3 w-3 shrink-0 bg-[#E11D2A]" />
          <span className="truncate text-xs sm:text-sm font-bold uppercase tracking-[0.16em] sm:tracking-[0.2em]">
            SIDE B // 026
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 border border-[#E11D2A] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-[#E11D2A]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E11D2A]" />
            {listenerCount} LIVE
          </span>
        </div>

        {/* Desktop Navigation (Uniform Height & Monochrome Icons) */}
        <div className="hidden lg:flex items-center gap-2">
          <button onClick={onOpenNameVault} className={uniformBtn}>
            <Search className="h-3.5 w-3.5" />
            Vault
          </button>

          <button onClick={onOpenMixtapes} className={uniformBtn}>
            <CassetteTape className="h-3.5 w-3.5" />
            Mixtapes
          </button>

          <button
            onClick={onToggleRadio}
            className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border px-3 text-[11px] font-bold uppercase tracking-wider transition ${
              isRadioActive ? "border-[#E11D2A] bg-[#E11D2A] text-white" : btnBase
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {isRadioActive ? "Radio On" : "Radio"}
          </button>

          <button
            onClick={onToggleVinylMode}
            title="Toggle Vinyl Crackle"
            className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border px-3 text-[11px] font-bold uppercase tracking-wider transition ${
              vinylMode ? "border-[#0047AB] bg-[#0047AB] text-white" : btnBase
            }`}
          >
            <CubeGuyIcon compact className={`h-3.5 w-3.5 ${vinylMode ? "animate-spin" : ""}`} />
            Vinyl
          </button>

          <button
            onClick={onToggleDarkMode}
            title="Toggle Midnight Mode"
            className={iconOnlyBtn}
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {currentUser ? (
            <>
              <button
                onClick={() => onOpenProfile(currentUser.username)}
                className={uniformBtn}
              >
                <span
                  style={{
                    backgroundColor: currentUser.monogramColor,
                    color: getContrastText(currentUser.monogramColor),
                  }}
                  className="flex h-4 w-4 items-center justify-center font-mono text-[9px] font-bold"
                >
                  {getMonogram(currentUser.username)}
                </span>
                @{currentUser.username}
              </button>
              <button
                onClick={onLogout}
                title="Sign Out"
                className={`${iconOnlyBtn} hover:border-[#E11D2A] hover:text-[#E11D2A]`}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button onClick={onOpenAuth} className={uniformBtn}>
              <User className="h-3.5 w-3.5" />
              Identity
            </button>
          )}

          <button
            onClick={onOpenComposer}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border border-[#111111] bg-[#111111] px-4 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-[#E11D2A]"
          >
            <Plus className="h-3.5 w-3.5" />
            Post Note
          </button>
        </div>

        {/* Mobile Compact Actions (+ Post & Collapsible Menu Toggle) */}
        <div className="flex lg:hidden shrink-0 items-center gap-1.5">
          <button
            onClick={onOpenComposer}
            className="inline-flex h-8 items-center justify-center gap-1 border border-[#111111] bg-[#111111] px-2.5 text-[11px] font-bold uppercase tracking-wider text-white active:bg-[#E11D2A]"
          >
            <Plus className="h-3.5 w-3.5" />
            Post
          </button>
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            className={iconOnlyBtn}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={`lg:hidden border-t ${borderClass} ${drawerBg} px-4 py-4`}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => closeAndRun(onOpenNameVault)}
              className="flex h-10 items-center justify-center gap-2 border border-current/30 bg-white/5 px-3 text-xs font-bold uppercase tracking-wider"
            >
              <Search className="h-3.5 w-3.5" />
              Name Vault
            </button>

            <button
              onClick={() => closeAndRun(onOpenMixtapes)}
              className="flex h-10 items-center justify-center gap-2 border border-current/30 bg-white/5 px-3 text-xs font-bold uppercase tracking-wider"
            >
              <CassetteTape className="h-3.5 w-3.5" />
              Mixtapes
            </button>

            <button
              onClick={() => closeAndRun(onToggleRadio)}
              className={`flex h-10 items-center justify-center gap-2 border px-3 text-xs font-bold uppercase tracking-wider ${
                isRadioActive
                  ? "border-[#E11D2A] bg-[#E11D2A] text-white"
                  : "border-current/30 bg-white/5"
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              {isRadioActive ? "Radio On" : "Live Radio"}
            </button>

            <button
              onClick={() => closeAndRun(onToggleVinylMode)}
              className={`flex h-10 items-center justify-center gap-2 border px-3 text-xs font-bold uppercase tracking-wider ${
                vinylMode
                  ? "border-[#0047AB] bg-[#0047AB] text-white"
                  : "border-current/30 bg-white/5"
              }`}
            >
              <CubeGuyIcon compact className={`h-3.5 w-3.5 ${vinylMode ? "animate-spin" : ""}`} />
              Vinyl Audio
            </button>
          </div>

          <div className={`mt-3 flex items-center gap-2 border-t ${borderClass} pt-3`}>
            <button
              onClick={() => closeAndRun(onToggleDarkMode)}
              className="flex h-10 flex-1 items-center justify-center gap-2 border border-current/30 px-3 text-xs font-bold uppercase tracking-wider"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {darkMode ? "Paper Mode" : "Midnight"}
            </button>

            {currentUser ? (
              <>
                <button
                  onClick={() => closeAndRun(() => onOpenProfile(currentUser.username))}
                  className="flex h-10 flex-[2] items-center justify-center gap-2 border border-current/30 px-3 text-xs font-bold uppercase tracking-wider truncate"
                >
                  <span
                    style={{
                      backgroundColor: currentUser.monogramColor,
                      color: getContrastText(currentUser.monogramColor),
                    }}
                    className="flex h-4 w-4 shrink-0 items-center justify-center font-mono text-[9px] font-bold"
                  >
                    {getMonogram(currentUser.username)}
                  </span>
                  <span className="truncate">@{currentUser.username}</span>
                </button>
                <button
                  onClick={() => closeAndRun(onLogout)}
                  title="Sign Out"
                  className="flex h-10 w-10 shrink-0 items-center justify-center border border-current/30 text-[#E11D2A]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => closeAndRun(onOpenAuth)}
                className="flex h-10 flex-[2] items-center justify-center gap-2 border border-current/30 px-3 text-xs font-bold uppercase tracking-wider"
              >
                <User className="h-3.5 w-3.5" />
                Identity / Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
