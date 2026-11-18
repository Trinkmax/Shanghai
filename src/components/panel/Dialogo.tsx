"use client";

import { X } from "lucide-react";
import { AlertDialog, Dialog } from "radix-ui";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { cn } from "@/lib/utils";

/** Modal centrado (los modales no son "origin-aware": quedan centrados). */
export function Dialogo({
  abierto,
  onCambiar,
  titulo,
  descripcion,
  children,
  pie,
  ancho = "max-w-lg",
}: {
  abierto: boolean;
  onCambiar: (v: boolean) => void;
  titulo: string;
  descripcion?: React.ReactNode;
  children: React.ReactNode;
  pie?: React.ReactNode;
  ancho?: string;
}) {
  return (
    <Dialog.Root open={abierto} onOpenChange={onCambiar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-tinta/45 backdrop-blur-[1.5px] data-[state=open]:animate-[subir_160ms_ease-out]" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[1.5rem] bg-white shadow-[var(--shadow-flotante)] outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.5rem]",
            "data-[state=open]:animate-[subir_220ms_var(--ease-out)]",
            ancho,
          )}
          aria-describedby={descripcion ? undefined : undefined}
        >
          <div className="flex items-start justify-between gap-4 border-b border-aluminio px-5 py-4">
            <div>
              <Dialog.Title className="text-[1.1rem] font-bold text-tinta">{titulo}</Dialog.Title>
              {descripcion ? (
                <Dialog.Description className="mt-1 text-[0.88rem] text-tinta-2">{descripcion}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-xl text-tinta-3 hover:bg-vidrio hover:text-tinta" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-aluminio px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{pie}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type OpcionesConfirmar = {
  titulo: string;
  descripcion?: React.ReactNode;
  confirmar?: string;
  peligro?: boolean;
};

const ContextoConfirmar = createContext<((o: OpcionesConfirmar) => Promise<boolean>) | null>(null);

/** Confirmación con AlertDialog: `const ok = await confirmar({...})`. */
export function ProveedorConfirmar({ children }: { children: React.ReactNode }) {
  const [opciones, setOpciones] = useState<OpcionesConfirmar | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirmar = useCallback((o: OpcionesConfirmar) => {
    setOpciones(o);
    return new Promise<boolean>((r) => {
      resolver.current = r;
    });
  }, []);

  function cerrar(v: boolean) {
    resolver.current?.(v);
    resolver.current = null;
    setOpciones(null);
  }

  return (
    <ContextoConfirmar.Provider value={confirmar}>
      {children}
      <AlertDialog.Root open={Boolean(opciones)} onOpenChange={(v) => !v && cerrar(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[70] bg-tinta/45 data-[state=open]:animate-[subir_120ms_ease-out]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] bg-white p-6 shadow-[var(--shadow-flotante)] outline-none data-[state=open]:animate-[subir_200ms_var(--ease-out)]">
            <AlertDialog.Title className="text-[1.1rem] font-bold text-tinta">{opciones?.titulo}</AlertDialog.Title>
            {opciones?.descripcion ? (
              <AlertDialog.Description className="mt-2 text-[0.93rem] leading-relaxed text-tinta-2">{opciones.descripcion}</AlertDialog.Description>
            ) : (
              <AlertDialog.Description className="sr-only">{opciones?.titulo}</AlertDialog.Description>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Boton variante="claro">Volver</Boton>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Boton variante={opciones?.peligro ? "peligro" : "cartel"} onClick={() => cerrar(true)}>
                  {opciones?.confirmar ?? "Confirmar"}
                </Boton>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ContextoConfirmar.Provider>
  );
}

export function useConfirmar() {
  const c = useContext(ContextoConfirmar);
  if (!c) throw new Error("useConfirmar fuera de ProveedorConfirmar");
  return c;
}
