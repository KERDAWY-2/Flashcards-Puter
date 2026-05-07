"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import { CreateDeckDialog } from "@/components/create-deck-dialog";
import { StudyMode } from "@/components/study-mode";
import {
  loadDecks,
  saveDeck,
  deleteDeck as deletePuterDeck,
} from "@/lib/puter";
import type { Deck } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Single-page Flashcards app.
 *
 * Three views, switched by local state — no router needed:
 *   - "list":  the home grid of decks
 *   - "study": full-screen flashcard viewer for a single deck
 * Plus a modal for creating a new deck (manual or AI-generated).
 *
 * All persistence runs through Puter KV (see lib/puter.ts).
 */
export default function FlashcardsPage() {
  const [decks, setDecks] = React.useState<Deck[]>([]);
  const [studyDeckId, setStudyDeckId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Initial load from Puter KV. Runs once on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fresh = await loadDecks();
        if (!cancelled) setDecks(fresh);
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Failed to load decks",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (deck: Deck) => {
    await saveDeck(deck);
    setDecks((prev) => [deck, ...prev]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deck? This cannot be undone.")) return;
    await deletePuterDeck(id);
    setDecks((prev) => prev.filter((d) => d.id !== id));
  };

  const studyDeck = decks.find((d) => d.id === studyDeckId) ?? null;

  // ---- Study view --------------------------------------------------------
  if (studyDeck) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        <StudyMode deck={studyDeck} onExit={() => setStudyDeckId(null)} />
      </div>
    );
  }

  // ---- List view ---------------------------------------------------------
  return (
    <div className="flex min-h-screen flex-col">
      {/* App-shell header: stays put on scroll, subtle blur for an iOS feel */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Flashcards</h1>
            <p className="text-xs text-muted-foreground">
              Powered by Puter.js
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus />
          <span className="hidden sm:inline">New deck</span>
        </Button>
      </header>

      {/* Body */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : decks.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <DeckGrid
            decks={decks}
            onStudy={(id) => setStudyDeckId(id)}
            onDelete={handleDelete}
          />
        )}
      </main>

      {/* Footer attribution — Puter requests this on apps built with their SDK. */}
      <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        <a
          href="https://developer.puter.com"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-foreground"
        >
          Powered by Puter
        </a>
      </footer>

      <CreateDeckDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}

// --- Subcomponents (kept in this file because they're tiny and only used here) ---

function DeckGrid({
  decks,
  onStudy,
  onDelete,
}: {
  decks: Deck[];
  onStudy: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck, i) => (
        <Card
          key={deck.id}
          className={cn(
            "group flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md",
            "animate-fade-in-up",
          )}
          // Stagger the entrance for a small bit of polish
          style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">
                  {deck.name}
                </CardTitle>
                {deck.description && (
                  <CardDescription className="mt-1 line-clamp-2 text-xs">
                    {deck.description}
                  </CardDescription>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onDelete(deck.id)}
                aria-label="Delete deck"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-end gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {deck.cards.length} card{deck.cards.length === 1 ? "" : "s"}
              <span className="mx-1">·</span>
              <span>{formatDate(deck.createdAt)}</span>
            </div>
            <Button
              onClick={() => onStudy(deck.id)}
              className="w-full"
              size="sm"
            >
              <BookOpen /> Study
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Sparkles className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">No decks yet</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Create your first deck by hand or let AI draft one for you on any
        topic in seconds.
      </p>
      <Button onClick={onCreate} className="mt-6">
        <Plus /> Create your first deck
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <strong className="font-semibold">Could not reach Puter.</strong>
      <p className="mt-1 opacity-90">{message}</p>
      <p className="mt-2 text-xs opacity-75">
        Check your connection, then reload the page.
      </p>
    </div>
  );
}

/** "Mar 5" / "Mar 5, 2025" — relative-ish display without a date library. */
function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
