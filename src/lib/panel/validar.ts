import type { ZodError } from "zod";

/** Primer mensaje de error de Zod, para mostrar tal cual en el formulario. */
export function primerError(e: ZodError): string {
  return e.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.";
}

/** "1.234,50" / "1234.5" / "$ 1.500" → 1234.5 (montos tipeados en es-AR). */
export function parseMonto(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let t = v.replace(/[^\d.,-]/g, "").trim();
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
