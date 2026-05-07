import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` merges Tailwind class strings while resolving conflicts (e.g. `p-2 p-4` -> `p-4`).
 * Standard shadcn/ui helper used by every UI primitive in this project.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
