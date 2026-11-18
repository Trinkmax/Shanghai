import "server-only";
import { connection } from "next/server";
import { TZ_AR } from "@/lib/format";

/** Fecha de hoy en Córdoba (AAAA-MM-DD). Argentina no tiene horario de verano: -03:00 fijo. */
export async function hoyCordoba(): Promise<string> {
  await connection();
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ_AR, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}

export const inicioDia = (fecha: string) => `${fecha}T00:00:00-03:00`;

export type Rango = "hoy" | "7d" | "30d" | "mes";

export const RANGOS: { id: Rango; texto: string }[] = [
  { id: "hoy", texto: "Hoy" },
  { id: "7d", texto: "7 días" },
  { id: "30d", texto: "30 días" },
  { id: "mes", texto: "Este mes" },
];

export async function rangoFechas(r: Rango): Promise<{ desde: string; hasta: string; dias: number }> {
  const hoy = await hoyCordoba();
  const manana = sumarDias(hoy, 1);
  if (r === "hoy") return { desde: inicioDia(hoy), hasta: inicioDia(manana), dias: 1 };
  if (r === "30d") return { desde: inicioDia(sumarDias(hoy, -29)), hasta: inicioDia(manana), dias: 30 };
  if (r === "mes") {
    const primero = `${hoy.slice(0, 8)}01`;
    return { desde: inicioDia(primero), hasta: inicioDia(manana), dias: Number(hoy.slice(8, 10)) };
  }
  return { desde: inicioDia(sumarDias(hoy, -6)), hasta: inicioDia(manana), dias: 7 };
}
