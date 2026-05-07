// Domain types shared between the page, dialogs, and the Puter helper.
// Kept tiny on purpose — this is a demo, not a study-platform.

export type Flashcard = {
  id: string;
  front: string;
  back: string;
};

export type Deck = {
  id: string;
  name: string;
  description?: string;
  cards: Flashcard[];
  createdAt: number;
};
