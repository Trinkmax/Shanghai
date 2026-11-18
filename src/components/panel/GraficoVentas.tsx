"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatARS } from "@/lib/format";

type Dia = { dia: string; total: number; pedidos: number };

const fechaCorta = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
const fechaLarga = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const compacto = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M` : n >= 1000 ? `$${Math.round(n / 1000)} k` : `$${n}`;

function Globo({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Dia;
  return (
    <div className="rounded-xl border border-aluminio bg-white px-3 py-2 shadow-[var(--shadow-flotante)]">
      <p className="text-[0.78rem] capitalize text-tinta-3">{fechaLarga.format(new Date(`${d.dia}T00:00:00Z`))}</p>
      <p className="tabular mt-0.5 text-[1rem] font-bold text-tinta">{formatARS(d.total)}</p>
      <p className="tabular text-[0.78rem] text-tinta-2">
        {d.pedidos} {d.pedidos === 1 ? "venta" : "ventas"}
      </p>
    </div>
  );
}

/** Ventas por día: una serie, un solo tono; tooltip por barra y tabla equivalente para lectores de pantalla. */
export function GraficoVentas({ datos }: { datos: Dia[] }) {
  const vacio = datos.every((d) => d.total === 0);
  const pocas = datos.length <= 10;
  return (
    <div className="relative">
      <div className="h-[260px] w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={pocas ? "28%" : 2}>
            <CartesianGrid vertical={false} stroke="var(--color-vidrio-2)" />
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={{ stroke: "var(--color-aluminio)" }}
              tick={{ fill: "var(--color-tinta-3)", fontSize: 12 }}
              tickFormatter={(d: string) => fechaCorta.format(new Date(`${d}T00:00:00Z`)).replace(".", "")}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-tinta-3)", fontSize: 12 }}
              tickFormatter={compacto}
              allowDecimals={false}
            />
            <Tooltip content={(p) => <Globo {...(p as TooltipContentProps<number, string>)} />} cursor={{ fill: "rgb(92 99 170 / 0.08)" }} />
            <Bar dataKey="total" fill="var(--color-marca-500)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {vacio && (
        <p className="absolute inset-x-6 top-[36%] mx-auto w-fit rounded-xl bg-white/95 px-4 py-2.5 text-center text-[0.92rem] text-tinta-3 shadow-[0_0_0_1px_var(--color-aluminio)]">
          Todavía no hay ventas confirmadas en este período.
        </p>
      )}
      <table className="sr-only">
        <caption>Ventas por día</caption>
        <thead>
          <tr>
            <th>Día</th>
            <th>Total</th>
            <th>Ventas</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.dia}>
              <td>{d.dia}</td>
              <td>{formatARS(d.total)}</td>
              <td>{d.pedidos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
