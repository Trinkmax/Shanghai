"use client";

import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { Checkbox, Switch } from "radix-ui";
import { forwardRef, useId, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { toast } from "sonner";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";

type BaseCampo = { etiqueta: string; ayuda?: React.ReactNode; error?: string | null; className?: string };

function Envoltura({
  id,
  etiqueta,
  ayuda,
  error,
  className,
  children,
}: BaseCampo & { id: string; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block text-[0.88rem] font-medium text-tinta">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.82rem] font-medium text-rojo">
          {error}
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="mt-1.5 text-[0.8rem] text-tinta-3">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

export const Campo = forwardRef<HTMLInputElement, BaseCampo & InputHTMLAttributes<HTMLInputElement>>(function Campo(
  { etiqueta, ayuda, error, className, id, ...props },
  ref,
) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <Envoltura id={cid} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <input
        ref={ref}
        id={cid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${cid}-error` : ayuda ? `${cid}-ayuda` : undefined}
        className="campo"
        {...props}
      />
    </Envoltura>
  );
});

export function CampoClave({ etiqueta, ayuda, error, className, ...props }: BaseCampo & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [ver, setVer] = useState(false);
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <div className="relative">
        <input
          id={id}
          type={ver ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          className="campo pr-12"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio hover:text-tinta"
          aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {ver ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    </Envoltura>
  );
}

/** Monto en pesos: se tipea libre ("12.500", "12500,50") y debajo se ve interpretado. */
export function CampoMonto({
  etiqueta,
  ayuda,
  error,
  className,
  valor,
  onValor,
  placeholder,
  disabled,
  autoFocus,
}: BaseCampo & {
  valor: number | null;
  onValor: (n: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [texto, setTexto] = useState(valor == null ? "" : String(valor).replace(".", ","));
  function cambiar(t: string) {
    setTexto(t);
    let s = t.replace(/[^\d.,]/g, "");
    if (!s) return onValor(null);
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    const n = Number(s);
    onValor(Number.isFinite(n) ? n : null);
  }
  return (
    <Envoltura
      id={id}
      etiqueta={etiqueta}
      error={error}
      className={className}
      ayuda={valor != null && texto ? <span className="tabular">{formatARS(valor)}</span> : ayuda}
    >
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3">$</span>
        <input
          id={id}
          inputMode="decimal"
          value={texto}
          onChange={(e) => cambiar(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          className="campo tabular pl-7"
        />
      </div>
    </Envoltura>
  );
}

export function Selector({
  etiqueta,
  ayuda,
  error,
  className,
  children,
  ...props
}: BaseCampo & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className="campo appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23615f7b%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10"
        {...props}
      >
        {children}
      </select>
    </Envoltura>
  );
}

export function AreaTexto({ etiqueta, ayuda, error, className, ...props }: BaseCampo & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <textarea id={id} aria-invalid={error ? true : undefined} className="campo" {...props} />
    </Envoltura>
  );
}

/** Interruptor con etiqueta y bajada (Radix Switch). */
export function Interruptor({
  etiqueta,
  descripcion,
  activo,
  onCambiar,
  disabled,
  className,
  compacto = false,
}: {
  etiqueta: React.ReactNode;
  descripcion?: React.ReactNode;
  activo: boolean;
  onCambiar: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
  compacto?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <label htmlFor={id} className={cn("min-w-0 cursor-pointer", compacto && "sr-only")}>
        <span className="block text-[0.92rem] font-medium text-tinta">{etiqueta}</span>
        {descripcion && <span className="mt-0.5 block text-[0.82rem] text-tinta-3">{descripcion}</span>}
      </label>
      <Switch.Root
        id={id}
        checked={activo}
        onCheckedChange={onCambiar}
        disabled={disabled}
        className="relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full bg-aluminio-2 transition-colors duration-200 data-[state=checked]:bg-marca-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgb(22_20_44/0.3)] transition-transform duration-200 ease-[var(--ease-out)] data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}

export function Casilla({
  marcada,
  onCambiar,
  etiqueta,
  className,
}: {
  marcada: boolean | "indeterminate";
  onCambiar: (v: boolean) => void;
  etiqueta: string;
  className?: string;
}) {
  return (
    <Checkbox.Root
      checked={marcada}
      onCheckedChange={(v) => onCambiar(v === true)}
      aria-label={etiqueta}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-md border border-aluminio-2 bg-white transition-colors data-[state=checked]:border-marca-600 data-[state=checked]:bg-marca-600 data-[state=indeterminate]:border-marca-600 data-[state=indeterminate]:bg-marca-600",
        className,
      )}
    >
      <Checkbox.Indicator className="text-white">
        {marcada === "indeterminate" ? <span className="block h-0.5 w-2.5 rounded bg-white" /> : <Check className="size-3.5" strokeWidth={3} />}
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

/** Texto con botón de copiar (CBU, contraseñas temporales, URLs). */
export function Copiable({ texto, etiqueta, className }: { texto: string; etiqueta?: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border border-aluminio bg-vidrio px-3 py-2", className)}>
      <code className="tabular min-w-0 flex-1 truncate text-[0.88rem] text-tinta">{texto}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1600);
          } catch {
            toast.error("No se pudo copiar. Seleccioná el texto y copialo a mano.");
          }
        }}
        className="presionable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8rem] font-semibold text-tinta shadow-[0_0_0_1px_var(--color-aluminio)]"
        aria-label={etiqueta ? `Copiar ${etiqueta}` : "Copiar"}
      >
        {copiado ? <Check className="size-3.5 text-verde" /> : <Copy className="size-3.5" />}
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
