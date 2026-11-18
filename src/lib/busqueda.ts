import type { ItemIndice } from "@/lib/datos/catalogo";
import { normalizar } from "@/lib/utils";

export type Resultado = { item: ItemIndice; puntos: number; exacto: boolean };

type Preparado = { item: ItemIndice; texto: string; codigo: string; palabras: string[] };

const cachePreparado = new WeakMap<ItemIndice[], Preparado[]>();

function preparar(indice: ItemIndice[]): Preparado[] {
  const c = cachePreparado.get(indice);
  if (c) return c;
  const p = indice.map((item) => {
    const texto = normalizar(`${item.n} ${item.c}`);
    return { item, texto, codigo: normalizar(item.c), palabras: texto.split(/[^a-z0-9]+/).filter(Boolean) };
  });
  cachePreparado.set(indice, p);
  return p;
}

/** Distancia de edición acotada (para tolerar un error de tipeo en palabras de 4+ letras). */
function casiIgual(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let dif = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++dif > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return dif + (a.length - i) + (b.length - j) <= 1;
}

/** Búsqueda en memoria: todas las palabras deben aparecer (con 1 error de tipeo permitido). */
export function buscar(indice: ItemIndice[], consulta: string, limite = 40): Resultado[] {
  const q = normalizar(consulta).trim();
  if (!q) return [];
  const terminos = q.split(/\s+/).filter(Boolean);
  const out: Resultado[] = [];

  for (const p of preparar(indice)) {
    let puntos = 0;
    let exacto = false;
    let ok = true;
    for (const t of terminos) {
      if (p.codigo === t) {
        puntos += 120;
        exacto = true;
        continue;
      }
      if (p.codigo.startsWith(t) && t.length >= 2) {
        puntos += 60;
        continue;
      }
      if (p.texto.includes(t)) {
        puntos += p.palabras.some((w) => w.startsWith(t)) ? 14 : 6;
        continue;
      }
      if (t.length >= 4 && p.palabras.some((w) => casiIgual(w.slice(0, t.length + 1), t) || casiIgual(w, t))) {
        puntos += 3;
        continue;
      }
      ok = false;
      break;
    }
    if (!ok) continue;
    if (p.palabras[0]?.startsWith(terminos[0])) puntos += 8;
    if (p.item.o) puntos += 2;
    if (p.item.x !== null && p.item.x <= 0) puntos -= 20;
    out.push({ item: p.item, puntos, exacto });
  }

  return out
    .sort((a, b) => b.puntos - a.puntos || a.item.n.length - b.item.n.length)
    .slice(0, limite);
}

/** Parte el nombre en tramos para resaltar lo buscado. */
export function resaltar(nombre: string, consulta: string): { t: string; m: boolean }[] {
  const terminos = normalizar(consulta).trim().split(/\s+/).filter((t) => t.length >= 2);
  if (terminos.length === 0) return [{ t: nombre, m: false }];
  const norm = normalizar(nombre);
  const marcas = new Array(nombre.length).fill(false);
  for (const t of terminos) {
    let desde = 0;
    for (;;) {
      const i = norm.indexOf(t, desde);
      if (i < 0) break;
      for (let k = i; k < i + t.length; k++) marcas[k] = true;
      desde = i + t.length;
    }
  }
  const tramos: { t: string; m: boolean }[] = [];
  for (let i = 0; i < nombre.length; i++) {
    const ult = tramos[tramos.length - 1];
    if (ult && ult.m === marcas[i]) ult.t += nombre[i];
    else tramos.push({ t: nombre[i], m: marcas[i] });
  }
  return tramos;
}
