import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { prisma } from "./lib/prisma";
import ArchiveClient from "./components/ArchiveClient";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const rawU = Array.isArray(params.u) ? params.u[0] : params.u;
  const rawNote = Array.isArray(params.note) ? params.note[0] : params.note;
  const rawMixtape = Array.isArray(params.mixtape) ? params.mixtape[0] : params.mixtape;

  const username = (rawU || "").trim().toLowerCase().replace(/^@+/, "");
  const noteId = Number(rawNote || 0);
  const mixtapeId = Number(rawMixtape || 0);

  if (username) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { username: true, bio: true, archetype: true },
    });
    const handle = user?.username || username;
    const title = `@${handle} — SIDE B // 026`;
    const description =
      (user?.bio || "").trim() ||
      `Listen to @${handle}'s frequency and unsent transmissions on SIDE B // 026.`;
    const ogUrl = `/api/og?u=${encodeURIComponent(handle)}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://sideb.bckn.software/?u=${encodeURIComponent(handle)}`,
        images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogUrl],
      },
    };
  }

  if (noteId > 0) {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        recipient: true,
        message: true,
        trackName: true,
        artistName: true,
        isHidden: true,
        passcode: true,
      },
    });
    if (note && !note.isHidden) {
      const no = String(note.id).padStart(3, "0");
      const title = `TO: ${note.recipient} — SIDE B #${no}`;
      const description = note.passcode
        ? `Encrypted transmission #${no} paired with ${note.trackName} — ${note.artistName}.`
        : `“${note.message.slice(0, 140)}” — ${note.trackName} by ${note.artistName}`;
      const ogUrl = `/api/og?note=${note.id}`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://sideb.bckn.software/?note=${note.id}`,
          images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [ogUrl],
        },
      };
    }
  }

  if (mixtapeId > 0) {
    const mixtape = await prisma.mixtape.findUnique({
      where: { id: mixtapeId },
      select: { id: true, title: true, subtitle: true, creatorName: true },
    });
    if (mixtape) {
      const title = `${mixtape.title} — SIDE B // 026 MIXTAPE`;
      const description =
        (mixtape.subtitle || "").trim() ||
        `Curated mixtape by ${mixtape.creatorName} on SIDE B // 026.`;
      const ogUrl = `/api/og?mixtape=${mixtape.id}`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://sideb.bckn.software/?mixtape=${mixtape.id}`,
          images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [ogUrl],
        },
      };
    }
  }

  return {
    title: "SIDE B // 026 — Unsent Notes & Soundtrack Archive",
    description:
      "An editorial archive of unsent transmissions, synced lyrics, mixtapes, and 24-hour frequencies.",
  };
}

async function DynamicMetadataGuard() {
  await connection();
  return null;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F4F0]" />}>
      <DynamicMetadataGuard />
      <ArchiveClient />
    </Suspense>
  );
}
