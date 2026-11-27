export type SideBShareTarget =
  | { kind: "note"; id: string | number; recipient?: string; title?: string }
  | { kind: "profile"; username: string; displayName?: string }
  | { kind: "mixtape"; id: string | number; title?: string }
  | { kind: "archive" };

export function buildSideBShareUrl(target: SideBShareTarget): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://sideb.bckn.software";

  if (target.kind === "note") {
    return `${origin}/?note=${encodeURIComponent(String(target.id))}`;
  }
  if (target.kind === "profile") {
    return `${origin}/?u=${encodeURIComponent(target.username)}`;
  }
  if (target.kind === "mixtape") {
    return `${origin}/?mixtape=${encodeURIComponent(String(target.id))}`;
  }
  return `${origin}/`;
}

export function buildSideBShareTitle(target: SideBShareTarget): string {
  if (target.kind === "note") {
    const num = String(target.id).padStart(3, "0");
    return target.recipient
      ? `TO: ${target.recipient} — SIDE B #${num}`
      : `SIDE B #${num}`;
  }
  if (target.kind === "profile") {
    return target.displayName
      ? `${target.displayName} (@${target.username}) — SIDE B // 026`
      : `@${target.username} — SIDE B // 026`;
  }
  if (target.kind === "mixtape") {
    return target.title
      ? `${target.title} — SIDE B // 026 Mixtape`
      : "SIDE B // 026 Mixtape";
  }
  return "SIDE B // 026";
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea fallback
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
}

export async function shareSideBLink(
  target: SideBShareTarget
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = buildSideBShareUrl(target);
  const title = buildSideBShareTitle(target);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const copied = await copyTextToClipboard(url);
  return copied ? "copied" : "failed";
}

export async function shareSideBStoryFile(
  target: SideBShareTarget,
  file: File | null,
  fallbackDownload?: () => Promise<void> | void
): Promise<"shared" | "downloaded" | "cancelled" | "failed"> {
  const url = buildSideBShareUrl(target);
  await copyTextToClipboard(url);

  const nav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { canShare?: (data?: ShareData) => boolean })
      : null;

  if (
    file &&
    nav &&
    typeof nav.share === "function" &&
    (!nav.canShare || nav.canShare({ files: [file] }))
  ) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  if (fallbackDownload) {
    await fallbackDownload();
    return "downloaded";
  }

  return "failed";
}
