"use client";

import { useState, useEffect } from "react";
import { X, Check, MapPin, Tag, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { CubeGuyIcon } from "./ManifestoModal";
import { SUGGESTED_TAGS, SWISS_SWATCHES, Track, UserProfile } from "../types/archive";
import { getContrastText, getMonogram } from "../utils/poster";

interface AuthModalProps {
  isEditMode: boolean;
  currentUser: UserProfile | null;
  onSuccess: (user: UserProfile) => void;
  onClose: () => void;
}

const WIZARD_STEPS = [
  { num: "01", label: "HANDLE" },
  { num: "02", label: "BADGE" },
  { num: "03", label: "GPS & SONG" },
  { num: "04", label: "OVERVIEW" },
];

export default function AuthModal({
  isEditMode,
  currentUser,
  onSuccess,
  onClose,
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Credentials
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");

  // Step 2: Visual Identity & Tags
  const [monogramColor, setMonogramColor] = useState("#111111");
  const [tagsList, setTagsList] = useState<string[]>(["LATE NIGHTS"]);
  const [tagInput, setTagInput] = useState("");

  // Step 3: Encoded Coordinates, Anthem & Liner Bio
  const [cityQuery, setCityQuery] = useState("");
  const [geoResults, setGeoResults] = useState<{ coords: string; hint: string }[]>([]);
  const [coordinates, setCoordinates] = useState("00.0000° N, 00.0000° E");
  const [frequency, setFrequency] = useState("02:00 AM");
  const [bio, setBio] = useState("");

  const [anthemQuery, setAnthemQuery] = useState("");
  const [anthemResults, setAnthemResults] = useState<Track[]>([]);
  const [selectedAnthem, setSelectedAnthem] = useState<Track | null>(null);

  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode && currentUser) {
      setMonogramColor(currentUser.monogramColor);
      setBio(currentUser.bio);
      const parsedTags = (currentUser.tags || currentUser.archetype || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      setTagsList(parsedTags.length > 0 ? parsedTags : ["LATE NIGHTS"]);
      setFrequency(currentUser.frequency);
      setCoordinates(currentUser.coordinates);
      if (currentUser.anthemTrackId && currentUser.anthemTrackName) {
        setSelectedAnthem({
          id: currentUser.anthemTrackId,
          name: currentUser.anthemTrackName,
          artist: currentUser.anthemArtist || "",
          albumArt: currentUser.anthemAlbumArt || "",
          previewUrl: currentUser.anthemPreview || "",
        });
      }
    }
  }, [isEditMode, currentUser]);

  // Debounced City -> Coordinates Lookup
  useEffect(() => {
    if (!cityQuery.trim()) {
      setGeoResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(cityQuery)}`);
      const data = await res.json();
      setGeoResults(data.results || []);
    }, 350);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  // Debounced Anthem Search
  useEffect(() => {
    if (!anthemQuery.trim()) {
      setAnthemResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/spotify?q=${encodeURIComponent(anthemQuery)}`);
      const data = await res.json();
      setAnthemResults(data.tracks || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [anthemQuery]);

  const addTag = (rawTag: string) => {
    const clean = rawTag.trim().toUpperCase();
    if (!clean || tagsList.includes(clean) || tagsList.length >= 4) return;
    setTagsList([...tagsList, clean]);
    setTagInput("");
  };

  const removeTag = (target: string) => {
    setTagsList(tagsList.filter((t) => t !== target));
  };

  const handleNextStep = () => {
    setAuthError("");
    if (step === 1) {
      if (!username.trim()) {
        setAuthError("Please enter a handle.");
        return;
      }
      if (!passcode.trim()) {
        setAuthError("Please enter a passcode.");
        return;
      }
      if (passcode !== confirmPasscode) {
        setAuthError("Passcodes do not match. Retype to confirm.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "login",
        username,
        passcode,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || "Invalid handle or passcode.");
      setSubmitting(false);
      return;
    }

    onSuccess({ ...data.user, passcode });
    onClose();
    setSubmitting(false);
  };

  const handleCreateAccount = async () => {
    setAuthError("");
    setSubmitting(true);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "register",
        username,
        passcode,
        monogramColor,
        tags: tagsList,
        coordinates,
        frequency,
        bio,
        anthemTrackId: selectedAnthem?.id || null,
        anthemTrackName: selectedAnthem?.name || null,
        anthemArtist: selectedAnthem?.artist || null,
        anthemAlbumArt: selectedAnthem?.albumArt || null,
        anthemPreview: selectedAnthem?.previewUrl || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || "Registration failed.");
      if (data.error?.toLowerCase().includes("claimed")) setStep(1);
      setSubmitting(false);
      return;
    }

    onSuccess({ ...data.user, passcode });
    onClose();
    setSubmitting(false);
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    const res = await fetch(`/api/users/${encodeURIComponent(currentUser.username)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monogramColor,
        bio,
        tags: tagsList,
        frequency,
        coordinates,
        anthemTrackId: selectedAnthem?.id || null,
        anthemTrackName: selectedAnthem?.name || null,
        anthemArtist: selectedAnthem?.artist || null,
        anthemAlbumArt: selectedAnthem?.albumArt || null,
        anthemPreview: selectedAnthem?.previewUrl || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onSuccess({ ...updated, passcode: currentUser.passcode });
      onClose();
    }
    setSubmitting(false);
  };

  const previewHandle = (username.trim() || currentUser?.username || "LN")
    .replace(/^@/, "")
    .replace(/\s+/g, "_");

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-dvh w-full max-w-none overflow-y-auto border-0 bg-[#F4F4F0] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:border-2 sm:border-[#111111] sm:p-8 text-[#111111] sm:shadow-[8px_8px_0px_#111111]"
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between border-b border-[#111111] pb-5">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11D2A]">
              {isEditMode
                ? "IDENTITY CONFIGURATION"
                : authMode === "register"
                ? `STEP 0${step} OF 04 // CLAIM HANDLE`
                : "ARCHIVE ACCESS"}
            </span>
            <h2 className="mt-1 text-2xl font-bold uppercase tracking-tight">
              {isEditMode
                ? `@${currentUser?.username}`
                : authMode === "login"
                ? "Sign In"
                : "Claim Handle"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#111111] bg-white p-2 hover:bg-[#111111] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        {!isEditMode && (
          <div className="mb-6 grid grid-cols-2 border border-[#111111]">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`py-2.5 text-xs font-bold uppercase tracking-widest transition ${
                authMode === "login" ? "bg-[#111111] text-white" : "bg-white text-[#111111]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setStep(1);
                setAuthError("");
              }}
              className={`py-2.5 text-xs font-bold uppercase tracking-widest transition ${
                authMode === "register" ? "bg-[#111111] text-white" : "bg-white text-[#111111]"
              }`}
            >
              Claim Handle
            </button>
          </div>
        )}

        {/* Swiss 4-Step Progress Strip (Register Wizard) */}
        {!isEditMode && authMode === "register" && (
          <div className="mb-7 grid grid-cols-4 border border-[#111111] bg-white divide-x divide-[#111111]">
            {WIZARD_STEPS.map((s, idx) => {
              const stepNum = (idx + 1) as 1 | 2 | 3 | 4;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (stepNum < step) {
                      setAuthError("");
                      setStep(stepNum);
                    }
                  }}
                  className={`p-2.5 text-left transition ${
                    isActive
                      ? "bg-[#111111] text-white"
                      : isDone
                      ? "bg-[#F4F4F0] text-[#111111] hover:bg-neutral-200"
                      : "bg-white text-neutral-400 cursor-default"
                  }`}
                >
                  <p className="font-mono text-[10px] font-bold">
                    {isDone ? "✓" : s.num}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] font-bold tracking-wider">
                    {s.label}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ==================== SIGN IN VIEW ==================== */}
        {!isEditMode && authMode === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                Handle
              </label>
              <input
                type="text"
                required
                placeholder="e.g. velvet_02"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-[#111111] bg-white px-4 py-3 text-sm font-medium outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                Passcode
              </label>
              <input
                type="password"
                required
                placeholder="••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full border border-[#111111] bg-white px-4 py-3 text-sm font-medium outline-none"
              />
            </div>

            {authError && (
              <p className="font-mono text-xs font-bold text-[#E11D2A]">{authError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full border border-[#111111] bg-[#111111] py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#E11D2A] disabled:opacity-50"
            >
              {submitting ? "VERIFYING..." : "ENTER ARCHIVE"}
            </button>
          </form>
        )}

        {/* ==================== 4-STEP REGISTRATION WIZARD ==================== */}
        {!isEditMode && authMode === "register" && (
          <div className="space-y-6">
            {/* STEP 1: HANDLE & DOUBLE-CHECK PASSCODE */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                    Choose a Unique Handle
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. paper_ghost, midnight_k"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleNextStep();
                      }
                    }}
                    className="w-full border border-[#111111] bg-white px-4 py-3 text-sm font-medium outline-none"
                  />
                  <p className="mt-1.5 font-mono text-[10px] text-neutral-500">
                    Spaces automatically convert to underscores.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                    Create Passcode
                  </label>
                  <input
                    type="password"
                    placeholder="••••"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full border border-[#111111] bg-white px-4 py-3 text-sm font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                    Retype Passcode to Confirm
                  </label>
                  <input
                    type="password"
                    placeholder="••••"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleNextStep();
                      }
                    }}
                    className={`w-full border bg-white px-4 py-3 text-sm font-medium outline-none ${
                      confirmPasscode && passcode !== confirmPasscode
                        ? "border-[#E11D2A]"
                        : "border-[#111111]"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: BADGE COLOR & CUSTOM TAGS */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border border-[#111111] bg-white p-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      style={{
                        backgroundColor: monogramColor,
                        color: getContrastText(monogramColor),
                      }}
                      className="flex h-12 w-12 items-center justify-center border border-[#111111] font-mono text-lg font-bold transition-colors"
                    >
                      {getMonogram(previewHandle)}
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                        BADGE SPECIMEN
                      </p>
                      <p className="text-sm font-bold">@{previewHandle}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-neutral-600">
                    {monogramColor.toUpperCase()}
                  </span>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.15em]">
                    Select Swatch or Custom Hex
                  </label>
                  <div className="flex items-center gap-2.5">
                    <div className="grid flex-1 grid-cols-6 gap-2">
                      {SWISS_SWATCHES.map((s) => (
                        <button
                          key={s.hex}
                          type="button"
                          onClick={() => setMonogramColor(s.hex)}
                          style={{ backgroundColor: s.hex, color: s.text }}
                          className={`flex h-9 items-center justify-center border border-[#111111] ${
                            monogramColor.toLowerCase() === s.hex.toLowerCase()
                              ? "ring-2 ring-[#E11D2A] ring-offset-1"
                              : ""
                          }`}
                        >
                          {monogramColor.toLowerCase() === s.hex.toLowerCase() && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      ))}
                    </div>

                    <label
                      title="Pick any custom hex color"
                      className="flex h-9 cursor-pointer items-center gap-1.5 border border-[#111111] bg-white px-3 font-mono text-[11px] font-bold uppercase hover:bg-[#111111] hover:text-white"
                    >
                      <input
                        type="color"
                        value={monogramColor}
                        onChange={(e) => setMonogramColor(e.target.value)}
                        className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                      />
                      HEX
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em]">
                    <Tag className="h-3.5 w-3.5 text-[#E11D2A]" /> Personal Tags (Up to 4)
                  </label>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {tagsList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 border border-[#111111] bg-[#111111] px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-white"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-neutral-300 hover:text-[#E11D2A]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type custom tag (e.g. INDIE, MIDNIGHT)..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      className="flex-1 border border-[#111111] bg-white px-3.5 py-2 font-mono text-xs uppercase outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(tagInput)}
                      className="flex items-center gap-1 border border-[#111111] bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase hover:bg-[#111111] hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {SUGGESTED_TAGS.filter((t) => !tagsList.includes(t))
                      .slice(0, 6)
                      .map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => addTag(sug)}
                          className="border border-neutral-400 bg-white px-2 py-0.5 font-mono text-[10px] uppercase text-neutral-600 hover:border-[#111111] hover:text-[#111111]"
                        >
                          + {sug}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: COORDINATES ENCODER, PINNED ANTHEM & LINER BIO */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em]">
                    <MapPin className="h-3.5 w-3.5 text-[#E11D2A]" /> Coordinates Encoder
                  </label>

                  <div className="mb-2 border border-[#111111] bg-white px-3.5 py-2 font-mono text-xs font-bold text-[#0047AB]">
                    ENCODED GPS: {coordinates}
                  </div>

                  <input
                    type="text"
                    placeholder="Search any city to encode into GPS coordinates..."
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    className="w-full border border-[#111111] bg-white px-3.5 py-2 text-xs outline-none"
                  />
                  <p className="mt-1 font-mono text-[10px] text-neutral-500">
                    City names stay hidden—only Swiss coordinates display on your profile.
                  </p>

                  {geoResults.length > 0 && (
                    <div className="mt-1.5 border border-[#111111] bg-white divide-y divide-neutral-200">
                      {geoResults.map((g, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCoordinates(g.coords);
                            setCityQuery("");
                            setGeoResults([]);
                          }}
                          className="flex w-full items-center justify-between px-3.5 py-2 text-left font-mono text-[11px] hover:bg-[#F4F4F0]"
                        >
                          <span className="font-bold">{g.coords}</span>
                          <span className="text-[10px] text-neutral-500">
                            [{g.hint.toUpperCase()}]
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em]">
                    <CubeGuyIcon compact className="h-3.5 w-3.5 text-[#E11D2A]" /> Pinned Profile Anthem (Optional)
                  </label>
                  {selectedAnthem ? (
                    <div className="flex items-center justify-between border border-[#111111] bg-white p-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={selectedAnthem.albumArt}
                          alt=""
                          className="h-9 w-9 border border-[#111111] object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">{selectedAnthem.name}</p>
                          <p className="truncate text-[10px] text-neutral-500">
                            {selectedAnthem.artist}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAnthem(null)}
                        className="border border-[#111111] px-2 py-1 text-[10px] font-bold uppercase"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        placeholder="Search song for your profile anthem..."
                        value={anthemQuery}
                        onChange={(e) => setAnthemQuery(e.target.value)}
                        className="w-full border border-[#111111] bg-white px-3.5 py-2 text-xs outline-none"
                      />
                      {anthemResults.length > 0 && (
                        <div className="mt-1.5 max-h-32 overflow-y-auto border border-[#111111] bg-white divide-y divide-neutral-200">
                          {anthemResults.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedAnthem(t);
                                setAnthemResults([]);
                              }}
                              className="flex w-full items-center gap-2.5 p-2 text-left hover:bg-[#F4F4F0]"
                            >
                              <img src={t.albumArt} alt="" className="h-7 w-7 object-cover" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold">{t.name}</p>
                                <p className="truncate text-[10px] text-neutral-500">{t.artist}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                    Liner Bio (Optional • Max 140 Chars)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={140}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A short note on your frequency..."
                    className="w-full border border-[#111111] bg-white px-3.5 py-2 text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: PROFILE OVERVIEW SPECIMEN */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  IDENTITY SPECIMEN PREVIEW // VERIFY BEFORE COMMITTING
                </p>

                <div className="border-2 border-[#111111] bg-white pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5">
                  <div className="flex items-start gap-4 border-b border-[#111111] pb-4">
                    <div
                      style={{
                        backgroundColor: monogramColor,
                        color: getContrastText(monogramColor),
                      }}
                      className="flex h-14 w-14 shrink-0 items-center justify-center border border-[#111111] font-mono text-xl font-bold"
                    >
                      {getMonogram(previewHandle)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        {tagsList.map((t) => (
                          <span
                            key={t}
                            className="bg-[#111111] px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-white"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                      <h3 className="mt-1.5 truncate text-xl font-bold">@{previewHandle}</h3>
                      <p className="mt-1 text-xs text-neutral-600">
                        {bio.trim() || "No liner bio added yet."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-b border-[#111111] divide-x divide-[#111111]">
                    <div className="p-3">
                      <p className="font-mono text-[9px] uppercase text-neutral-500">
                        ACTIVE FREQUENCY
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-bold">{frequency}</p>
                    </div>
                    <div className="p-3">
                      <p className="font-mono text-[9px] uppercase text-neutral-500">
                        ENCODED COORDINATES
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-bold">{coordinates}</p>
                    </div>
                  </div>

                  <div className="pt-3">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#E11D2A]">
                      PINNED PROFILE ANTHEM
                    </p>
                    {selectedAnthem ? (
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <img
                          src={selectedAnthem.albumArt}
                          alt=""
                          className="h-9 w-9 border border-[#111111] object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">{selectedAnthem.name}</p>
                          <p className="truncate text-[10px] text-neutral-500">
                            {selectedAnthem.artist}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 font-mono text-xs text-neutral-400">
                        NONE SELECTED (CAN BE ADDED LATER)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {authError && (
              <p className="font-mono text-xs font-bold text-[#E11D2A]">{authError}</p>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthError("");
                    setStep((s) => (s === 4 ? 3 : s === 3 ? 2 : 1));
                  }}
                  className="flex items-center justify-center gap-1.5 border border-[#111111] bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex flex-1 items-center justify-center gap-2 border border-[#111111] bg-[#111111] py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#E11D2A]"
                >
                  Next Step <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCreateAccount}
                  className="flex-1 border border-[#111111] bg-[#E11D2A] py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#111111] disabled:opacity-50"
                >
                  {submitting ? "CREATING IDENTITY..." : "CREATE IDENTITY"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================== EDIT PROFILE MODE ==================== */}
        {isEditMode && (
          <form onSubmit={handleSaveProfileEdit} className="space-y-5">
            <div className="flex items-center justify-between border border-[#111111] bg-white p-4">
              <div className="flex items-center gap-3.5">
                <div
                  style={{
                    backgroundColor: monogramColor,
                    color: getContrastText(monogramColor),
                  }}
                  className="flex h-12 w-12 items-center justify-center border border-[#111111] font-mono text-lg font-bold"
                >
                  {getMonogram(previewHandle)}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                    BADGE SPECIMEN
                  </p>
                  <p className="text-sm font-bold">@{previewHandle}</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold uppercase text-neutral-600">
                {monogramColor.toUpperCase()}
              </span>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.15em]">
                Badge Color (Swatches or Custom Hex)
              </label>
              <div className="flex items-center gap-2.5">
                <div className="grid flex-1 grid-cols-6 gap-2">
                  {SWISS_SWATCHES.map((s) => (
                    <button
                      key={s.hex}
                      type="button"
                      onClick={() => setMonogramColor(s.hex)}
                      style={{ backgroundColor: s.hex, color: s.text }}
                      className={`flex h-9 items-center justify-center border border-[#111111] ${
                        monogramColor.toLowerCase() === s.hex.toLowerCase()
                          ? "ring-2 ring-[#E11D2A] ring-offset-1"
                          : ""
                      }`}
                    >
                      {monogramColor.toLowerCase() === s.hex.toLowerCase() && (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
                <label className="flex h-9 cursor-pointer items-center gap-1.5 border border-[#111111] bg-white px-3 font-mono text-[11px] font-bold uppercase hover:bg-[#111111] hover:text-white">
                  <input
                    type="color"
                    value={monogramColor}
                    onChange={(e) => setMonogramColor(e.target.value)}
                    className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                  />
                  HEX
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em]">
                <Tag className="h-3.5 w-3.5 text-[#E11D2A]" /> Personal Tags (Up to 4)
              </label>
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {tagsList.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 border border-[#111111] bg-[#111111] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-neutral-300 hover:text-[#E11D2A]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  className="flex-1 border border-[#111111] bg-white px-3 py-1.5 font-mono text-xs uppercase outline-none"
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="border border-[#111111] bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase hover:bg-[#111111] hover:text-white"
                >
                  + Add
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em]">
                <MapPin className="h-3.5 w-3.5 text-[#E11D2A]" /> Coordinates ({coordinates})
              </label>
              <input
                type="text"
                placeholder="Type city to encode new GPS coordinates..."
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                className="w-full border border-[#111111] bg-white px-3.5 py-2 text-xs outline-none"
              />
              {geoResults.length > 0 && (
                <div className="mt-1.5 border border-[#111111] bg-white divide-y divide-neutral-200">
                  {geoResults.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCoordinates(g.coords);
                        setCityQuery("");
                        setGeoResults([]);
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-[11px] hover:bg-[#F4F4F0]"
                    >
                      <span className="font-bold">{g.coords}</span>
                      <span className="text-[10px] text-neutral-500">[{g.hint.toUpperCase()}]</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                Active Frequency Hour
              </label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="02:30 AM"
                className="w-full border border-[#111111] bg-white px-3.5 py-2 font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                Liner Bio (Max 140 Chars)
              </label>
              <textarea
                rows={2}
                maxLength={140}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full border border-[#111111] bg-white px-3.5 py-2 text-xs outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em]">
                Pinned Profile Anthem
              </label>
              {selectedAnthem ? (
                <div className="flex items-center justify-between border border-[#111111] bg-white p-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={selectedAnthem.albumArt}
                      alt=""
                      className="h-9 w-9 border border-[#111111] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{selectedAnthem.name}</p>
                      <p className="truncate text-[10px] text-neutral-500">
                        {selectedAnthem.artist}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAnthem(null)}
                    className="border border-[#111111] px-2 py-1 text-[10px] font-bold uppercase"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder="Search song for your profile anthem..."
                    value={anthemQuery}
                    onChange={(e) => setAnthemQuery(e.target.value)}
                    className="w-full border border-[#111111] bg-white px-3.5 py-2 text-xs outline-none"
                  />
                  {anthemResults.length > 0 && (
                    <div className="mt-1.5 max-h-32 overflow-y-auto border border-[#111111] bg-white divide-y divide-neutral-200">
                      {anthemResults.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedAnthem(t);
                            setAnthemResults([]);
                          }}
                          className="flex w-full items-center gap-2.5 p-2 text-left hover:bg-[#F4F4F0]"
                        >
                          <img src={t.albumArt} alt="" className="h-7 w-7 object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">{t.name}</p>
                            <p className="truncate text-[10px] text-neutral-500">{t.artist}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full border border-[#111111] bg-[#111111] py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#E11D2A] disabled:opacity-50"
            >
              {submitting ? "SAVING..." : "SAVE PROFILE"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
