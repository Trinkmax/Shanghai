"use client";

import { KeyRound, RefreshCw, UserMinus, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { cambiarActivo, cambiarClave, cambiarRol, crearPersona, quitarPersona } from "@/lib/actions/equipo";
import type { RolPersonal } from "@/lib/database.types";
import { DESCRIPCION_ROL, NOMBRE_ROL } from "@/lib/panel/permisos";
import { cn } from "@/lib/utils";
import { Dialogo, useConfirmar } from "../Dialogo";
import { Campo, Copiable, Interruptor } from "../formulario";

export type Persona = { id: string; nombre: string; email: string; rol: RolPersonal; activo: boolean };

const ROLES: RolPersonal[] = ["vendedor", "encargado", "dueno"];

function claveTemporal() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r = crypto.getRandomValues(new Uint32Array(10));
  const s = Array.from(r, (n) => letras[n % letras.length]).join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

function SelectorRol({ valor, onCambiar }: { valor: RolPersonal; onCambiar: (r: RolPersonal) => void }) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Rol">
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={valor === r}
          onClick={() => onCambiar(r)}
          className="rounded-xl border border-aluminio-2 px-3.5 py-3 text-left aria-checked:border-marca-600 aria-checked:bg-marca-50 aria-checked:shadow-[0_0_0_1px_var(--color-marca-600)]"
        >
          <span className="block text-[0.92rem] font-semibold text-tinta">{NOMBRE_ROL[r]}</span>
          <span className="block text-[0.8rem] text-tinta-3">{DESCRIPCION_ROL[r]}</span>
        </button>
      ))}
    </div>
  );
}

function Credenciales({ email, clave }: { email: string; clave: string }) {
  const sitio = typeof window !== "undefined" ? window.location.origin : "";
  const texto = `Te sumé al panel de Shangai Center.\nEntrá en ${sitio}/panel/ingresar\nUsuario: ${email}\nContraseña: ${clave}\n(Cambiala cuando quieras desde el panel o pedímela de nuevo.)`;
  return (
    <div className="space-y-2">
      <Copiable texto={email} etiqueta="usuario" />
      <Copiable texto={clave} etiqueta="contraseña" />
      <Copiable texto={texto.replace(/\n/g, " · ")} etiqueta="mensaje completo" />
    </div>
  );
}

export function GestorEquipo({ personas, yo }: { personas: Persona[]; yo: string }) {
  const confirmar = useConfirmar();
  const [pendiente, empezar] = useTransition();
  const [alta, setAlta] = useState(false);
  const [nueva, setNueva] = useState({ nombre: "", email: "", rol: "vendedor" as RolPersonal, password: "" });
  const [creada, setCreada] = useState<{ email: string; clave: string; vinculado: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clave, setClave] = useState<{ persona: Persona; valor: string; hecha: boolean } | null>(null);

  function crear() {
    setError(null);
    empezar(async () => {
      const r = await crearPersona(nueva);
      if (!r.ok) return setError(r.error);
      setCreada({ email: nueva.email.trim().toLowerCase(), clave: nueva.password, vinculado: r.data.vinculado });
    });
  }

  function cerrarAlta() {
    setAlta(false);
    setCreada(null);
    setError(null);
    setNueva({ nombre: "", email: "", rol: "vendedor", password: "" });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Boton
          onClick={() => {
            setNueva((n) => ({ ...n, password: claveTemporal() }));
            setAlta(true);
          }}
        >
          <UserPlus className="size-4" /> Sumar persona
        </Boton>
      </div>

      <ul className="divide-y divide-aluminio overflow-hidden rounded-[var(--radius-pane)] border border-aluminio bg-white">
        {personas.map((p) => {
          const soyYo = p.id === yo;
          return (
            <li key={p.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5", !p.activo && "bg-vidrio/60")}>
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold", p.activo ? "bg-marca-700 text-white" : "bg-aluminio text-tinta-2")}>
                {p.nombre
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((x) => x[0]?.toUpperCase())
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-semibold text-tinta">
                  {p.nombre} {soyYo && <span className="font-normal text-tinta-3">(vos)</span>}
                </p>
                <p className="truncate text-[0.82rem] text-tinta-3">{p.email}</p>
              </div>
              <label className="sr-only" htmlFor={`rol-${p.id}`}>
                Rol de {p.nombre}
              </label>
              <select
                id={`rol-${p.id}`}
                value={p.rol}
                disabled={soyYo || pendiente}
                onChange={(e) =>
                  empezar(async () => {
                    const r = await cambiarRol(p.id, e.target.value as RolPersonal);
                    if (r.ok) toast.success(`${p.nombre} ahora es ${NOMBRE_ROL[e.target.value as RolPersonal].toLowerCase()}`);
                    else toast.error(r.error);
                  })
                }
                className="campo h-10 w-36 rounded-xl px-3 text-sm disabled:opacity-60"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {NOMBRE_ROL[r]}
                  </option>
                ))}
              </select>
              <Interruptor
                compacto
                etiqueta={`Acceso de ${p.nombre}`}
                activo={p.activo}
                disabled={soyYo || pendiente}
                onCambiar={(v) =>
                  empezar(async () => {
                    const r = await cambiarActivo(p.id, v);
                    if (r.ok) toast.success(v ? `${p.nombre} puede volver a entrar` : `${p.nombre} ya no puede entrar al panel`);
                    else toast.error(r.error);
                  })
                }
              />
              <button
                type="button"
                onClick={() => setClave({ persona: p, valor: claveTemporal(), hecha: false })}
                className="grid size-10 place-items-center rounded-xl text-tinta-3 hover:bg-vidrio hover:text-tinta"
                aria-label={`Nueva contraseña para ${p.nombre}`}
                title="Nueva contraseña"
              >
                <KeyRound className="size-[18px]" />
              </button>
              {!soyYo && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirmar({
                      titulo: `¿Quitar a ${p.nombre} del equipo?`,
                      descripcion: "Pierde el acceso al panel. Su historial (ventas y notas) queda guardado.",
                      confirmar: "Quitar",
                      peligro: true,
                    });
                    if (!ok) return;
                    const r = await quitarPersona(p.id);
                    if (r.ok) toast.success(`${p.nombre} ya no está en el equipo`);
                    else toast.error(r.error);
                  }}
                  className="grid size-10 place-items-center rounded-xl text-tinta-3 hover:bg-[#fbe5e5] hover:text-rojo"
                  aria-label={`Quitar a ${p.nombre}`}
                  title="Quitar del equipo"
                >
                  <UserMinus className="size-[18px]" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <Dialogo
        abierto={alta}
        onCambiar={(v) => !v && cerrarAlta()}
        titulo={creada ? "Listo: ya puede entrar" : "Sumar persona al equipo"}
        descripcion={creada ? "Pasale estos datos por WhatsApp. La contraseña no se vuelve a mostrar." : undefined}
        pie={
          creada ? (
            <Boton onClick={cerrarAlta}>Terminar</Boton>
          ) : (
            <>
              <Boton variante="claro" onClick={cerrarAlta}>
                Cancelar
              </Boton>
              <Boton cargando={pendiente} onClick={crear}>
                Crear acceso
              </Boton>
            </>
          )
        }
      >
        {creada ? (
          <div className="space-y-3">
            {creada.vinculado && (
              <p className="rounded-xl bg-[#fff7dc] px-3.5 py-2.5 text-[0.88rem] text-ambar-tinta">
                Ese email ya tenía una cuenta en el sistema: va a entrar con su contraseña de siempre (la de abajo no se aplicó). Si no la recuerda, generale una nueva desde la lista.
              </p>
            )}
            <Credenciales email={creada.email} clave={creada.clave} />
          </div>
        ) : (
          <div className="space-y-4">
            <Campo etiqueta="Nombre y apellido" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} autoFocus />
            <Campo
              etiqueta="Email"
              type="email"
              inputMode="email"
              value={nueva.email}
              onChange={(e) => setNueva({ ...nueva, email: e.target.value })}
              ayuda="Es su usuario para entrar al panel."
            />
            <div>
              <p className="mb-1.5 text-[0.88rem] font-medium text-tinta">Contraseña temporal</p>
              <div className="flex gap-2">
                <Copiable texto={nueva.password} etiqueta="contraseña" className="flex-1" />
                <Boton variante="claro" onClick={() => setNueva({ ...nueva, password: claveTemporal() })} aria-label="Generar otra contraseña">
                  <RefreshCw className="size-4" />
                </Boton>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[0.88rem] font-medium text-tinta">Rol</p>
              <SelectorRol valor={nueva.rol} onCambiar={(rol) => setNueva({ ...nueva, rol })} />
            </div>
            {error && (
              <p role="alert" className="text-[0.88rem] font-medium text-rojo">
                {error}
              </p>
            )}
          </div>
        )}
      </Dialogo>

      <Dialogo
        abierto={Boolean(clave)}
        onCambiar={(v) => !v && setClave(null)}
        titulo={clave ? `Nueva contraseña para ${clave.persona.nombre}` : ""}
        descripcion={
          clave?.hecha
            ? "Listo. Pasásela por WhatsApp: no se vuelve a mostrar."
            : "Si esta persona usa el mismo email en otro sistema de la empresa, también cambia ahí."
        }
        pie={
          clave?.hecha ? (
            <Boton onClick={() => setClave(null)}>Terminar</Boton>
          ) : (
            <>
              <Boton variante="claro" onClick={() => setClave(null)}>
                Cancelar
              </Boton>
              <Boton
                cargando={pendiente}
                onClick={() =>
                  clave &&
                  empezar(async () => {
                    const r = await cambiarClave(clave.persona.id, clave.valor);
                    if (!r.ok) return void toast.error(r.error);
                    setClave({ ...clave, hecha: true });
                  })
                }
              >
                Cambiar contraseña
              </Boton>
            </>
          )
        }
      >
        {clave && (clave.hecha ? <Credenciales email={clave.persona.email} clave={clave.valor} /> : <Copiable texto={clave.valor} etiqueta="contraseña" />)}
      </Dialogo>
    </>
  );
}
