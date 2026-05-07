"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import type { Deck } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  deck: Deck;
  onExit: () => void;
};

/**
 * Full-screen study experience for a single deck.
 *
 * UX:
 *   - Click/tap or press Space to flip the current card.
 *   - Arrow keys navigate prev/next.
 *   - "Shuffle" reshuffles in place; "Reset" goes back to card 0.
 *
 * The deck is shown once — there's no spaced-repetition logic on purpose
 * (this is a demo). Progress is tracked only as "card N of M".
 */
export function StudyMode({ deck, onExit }: Props) {
  // Local order lets us shuffle without mutating the deck itself.
  const [order, setOrder] = React.useState<number[]>(() =>
    Array.from({ length: deck.cards.length }, (_, i) => i),
  );
  const [pos, setPos] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);

  const current = deck.cards[order[pos]];
  const isLast = pos === order.length - 1;
  const isFirst = pos === 0;

  const next = React.useCallback(() => {
    if (isLast) return;
    setFlipped(false);
    setPos((p) => p + 1);
  }, [isLast]);

  const prev = React.useCallback(() => {
    if (isFirst) return;
    setFlipped(false);
    setPos((p) => p - 1);
  }, [isFirst]);

  const flip = React.useCallback(() => setFlipped((f) => !f), []);

  const shuffle = () => {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    setPos(0);
    setFlipped(false);
  };

  const reset = () => {
    setOrder(Array.from({ length: deck.cards.length }, (_, i) => i));
    setPos(0);
    setFlipped(false);
  };

  // Keyboard shortcuts — space/enter flip, arrows nav, esc exits.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        flip();
      } else if (e.code === "ArrowRight") {
        next();
      } else if (e.code === "ArrowLeft") {
        prev();
      } else if (e.code === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flip, next, prev, onExit]);

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">This deck has no cards.</p>
        <Button onClick={onExit} variant="outline">
          Back to decks
        </Button>
      </div>
    );
  }

  const progress = ((pos + 1) / order.length) * 100;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar — exit + progress */}
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft /> Decks
        </Button>
        <div className="hidden truncate text-sm font-medium sm:block">
          {deck.name}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={shuffle}
            aria-label="Shuffle"
            title="Shuffle"
          >
            <Shuffle />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={reset}
            aria-label="Reset"
            title="Reset"
          >
            <RotateCcw />
          </Button>
        </div>
      </header>

      {/* Progress bar — slim, sits under the header */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>

      {/* Card stage */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6 sm:px-8">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Card {pos + 1} of {order.length}
        </div>

        {/* Flippable card. The two faces are absolutely stacked; the
            outer wrapper rotates to reveal the back. */}
        <button
          type="button"
          onClick={flip}
          className="card-3d w-full max-w-2xl flex-1 cursor-pointer focus-visible:outline-none"
          style={{ minHeight: "280px", maxHeight: "60vh" }}
          aria-label={flipped ? "Show front" : "Show back"}
        >
          <div
            className={cn(
              "card-3d-inner rounded-2xl border bg-card shadow-sm",
              flipped && "is-flipped",
            )}
          >
            <CardFace label="Question">{current.front}</CardFace>
            <CardFace label="Answer" back>
              {current.back}
            </CardFace>
          </div>
        </button>

        <p className="text-xs text-muted-foreground">
          Tap card or press Space to flip
        </p>
      </main>

      {/* Bottom nav */}
      <footer className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3 sm:px-6">
        <Button
          variant="outline"
          size="lg"
          onClick={prev}
          disabled={isFirst}
          className="flex-1 sm:flex-none"
        >
          <ChevronLeft /> Prev
        </Button>
        <Button
          size="lg"
          onClick={next}
          disabled={isLast}
          className="flex-1 sm:flex-none"
        >
          Next <ChevronRight />
        </Button>
      </footer>
    </div>
  );
}

/** A single face of the flip card. `back` rotates 180deg via the css class. */
function CardFace({
  children,
  label,
  back,
}: {
  children: React.ReactNode;
  label: string;
  back?: boolean;
}) {
  return (
    <div
      className={cn(
        "card-3d-face flex flex-col items-center justify-center rounded-2xl bg-card p-6 sm:p-10",
        back && "card-3d-back bg-secondary",
      )}
    >
      <span className="absolute left-4 top-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:left-6 sm:top-6">
        {label}
      </span>
      <p className="text-balance text-center text-xl font-medium leading-relaxed sm:text-2xl">
        {children}
      </p>
    </div>
  );
}
