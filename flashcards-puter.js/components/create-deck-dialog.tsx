"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, Trash2, Wand2, Loader2 } from "lucide-react";
import type { Deck, Flashcard } from "@/lib/types";
import { generateDeckWithAI } from "@/lib/puter";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (deck: Deck) => Promise<void> | void;
};

/**
 * Modal for creating a deck. Two paths:
 *   1. Manual — user types front/back pairs.
 *   2. AI    — user gives a topic + count; we ask Puter's AI for cards.
 *
 * Kept in a single component because the two flows share the deck-name
 * input and the same final "create" action — splitting would just
 * duplicate the wrapper without simplifying anything.
 */
export function CreateDeckDialog({ open, onOpenChange, onCreate }: Props) {
  const [tab, setTab] = React.useState<"manual" | "ai">("manual");

  // Shared
  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Manual mode
  const [cards, setCards] = React.useState<Flashcard[]>([
    { id: cryptoId(), front: "", back: "" },
  ]);

  // AI mode
  const [topic, setTopic] = React.useState("");
  const [count, setCount] = React.useState(8);

  // Reset when the dialog closes — keeps the form fresh next time.
  React.useEffect(() => {
    if (!open) {
      setName("");
      setCards([{ id: cryptoId(), front: "", back: "" }]);
      setTopic("");
      setCount(8);
      setTab("manual");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const updateCard = (id: string, patch: Partial<Flashcard>) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const addCard = () =>
    setCards((prev) => [...prev, { id: cryptoId(), front: "", back: "" }]);

  const removeCard = (id: string) =>
    setCards((prev) =>
      prev.length > 1 ? prev.filter((c) => c.id !== id) : prev,
    );

  const handleManualSubmit = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the deck a name.");
    const valid = cards
      .map((c) => ({ ...c, front: c.front.trim(), back: c.back.trim() }))
      .filter((c) => c.front && c.back);
    if (valid.length === 0)
      return setError("Add at least one card with both sides filled.");

    setSubmitting(true);
    try {
      await onCreate({
        id: cryptoId(),
        name: trimmed,
        cards: valid,
        createdAt: Date.now(),
      });
      onOpenChange(false);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAISubmit = async () => {
    setError(null);
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return setError("Tell the AI what to study.");

    setSubmitting(true);
    try {
      const generated = await generateDeckWithAI(trimmedTopic, count);
      if (generated.length === 0) {
        throw new Error("AI returned no usable cards. Try a different topic.");
      }
      await onCreate({
        id: cryptoId(),
        name: name.trim() || titleCase(trimmedTopic),
        description: `Generated from: ${trimmedTopic}`,
        cards: generated,
        createdAt: Date.now(),
      });
      onOpenChange(false);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-xl">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>New deck</DialogTitle>
            <DialogDescription>
              Build cards by hand or let AI draft them for you.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "manual" | "ai")}
          className="px-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <Plus /> Manual
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles /> AI generate
            </TabsTrigger>
          </TabsList>

          {/* ---------- MANUAL ---------- */}
          <TabsContent value="manual">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="deck-name">Deck name</Label>
                <Input
                  id="deck-name"
                  placeholder="e.g. Spanish verbs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Cards</Label>
                <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                  {cards.map((c, i) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border bg-muted/30 p-2"
                    >
                      <Input
                        placeholder={`Front ${i + 1}`}
                        value={c.front}
                        onChange={(e) =>
                          updateCard(c.id, { front: e.target.value })
                        }
                      />
                      <Input
                        placeholder={`Back ${i + 1}`}
                        value={c.back}
                        onChange={(e) =>
                          updateCard(c.id, { back: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCard(c.id)}
                        disabled={cards.length === 1}
                        aria-label="Remove card"
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCard}
                  className="w-full"
                >
                  <Plus /> Add card
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ---------- AI ---------- */}
          <TabsContent value="ai">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="deck-name-ai">Deck name (optional)</Label>
                <Input
                  id="deck-name-ai"
                  placeholder="Leave blank to use the topic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Textarea
                  id="topic"
                  placeholder="e.g. Key concepts in cellular respiration"
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="count">
                  Number of cards: <span className="font-mono">{count}</span>
                </Label>
                <input
                  id="count"
                  type="range"
                  min={3}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Powered by Puter AI — generation usually takes a few seconds.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mx-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          {tab === "manual" ? (
            <Button onClick={handleManualSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              Create deck
            </Button>
          ) : (
            <Button onClick={handleAISubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Wand2 />
              )}
              {submitting ? "Generating..." : "Generate"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- helpers ---------------------------------------------------------------

function cryptoId(): string {
  // crypto.randomUUID is available everywhere we care about (modern browsers)
  // but we fall back to a timestamp+random combo just in case.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Something went wrong. Try again.";
}
