import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Texto sin acentos y en minúsculas (igual que shangai_private.normalizar). */
export function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function slugify(t: string): string {
  return normalizar(t)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
