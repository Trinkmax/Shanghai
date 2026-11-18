import {
  Backpack,
  Battery,
  BatteryCharging,
  Bike,
  Cable,
  Calculator,
  Car,
  Cctv,
  CookingPot,
  Cpu,
  Fan,
  Flashlight,
  Gamepad2,
  Gauge,
  Glasses,
  Headphones,
  Keyboard,
  Lightbulb,
  MemoryStick,
  Mic,
  Microwave,
  Package,
  PawPrint,
  PencilRuler,
  Plug,
  PlugZap,
  Scale,
  Smartphone,
  Sofa,
  Sparkles,
  Speaker,
  SprayCan,
  Sprout,
  Sun,
  Tent,
  ToyBrick,
  TreePine,
  Tv,
  Umbrella,
  Volleyball,
  Watch,
  Wrench,
  Shirt,
  Gift,
  Hammer,
  Baby,
  Dumbbell,
  Snowflake,
  type LucideIcon,
} from "lucide-react";
import { acrilico } from "@/lib/tienda";
import { cn } from "@/lib/utils";

/** Íconos disponibles para los rubros (importados uno por uno: nada de cargar toda la librería). */
export const ICONOS_RUBRO: Record<string, LucideIcon> = {
  Backpack, Battery, BatteryCharging, Bike, Cable, Calculator, Car, Cctv, CookingPot, Cpu, Fan, Flashlight,
  Gamepad2, Gauge, Glasses, Headphones, Keyboard, Lightbulb, MemoryStick, Mic, Microwave, Package, PawPrint,
  PencilRuler, Plug, PlugZap, Scale, Smartphone, Sofa, Sparkles, Speaker, SprayCan, Sprout, Sun, Tent, ToyBrick,
  TreePine, Tv, Umbrella, Volleyball, Watch, Wrench, Shirt, Gift, Hammer, Baby, Dumbbell, Snowflake,
};

export function IconoRubro({ icono, className }: { icono: string; className?: string }) {
  const Icono = ICONOS_RUBRO[icono] ?? Package;
  return <Icono className={className} strokeWidth={1.9} aria-hidden="true" />;
}

/** Ficha de acrílico de color con el ícono del rubro. */
export function FichaRubro({
  icono,
  color,
  className,
  tam = "md",
}: {
  icono: string;
  color: string;
  className?: string;
  tam?: "sm" | "md" | "lg";
}) {
  const a = acrilico(color);
  const t = { sm: "size-8 rounded-lg [&_svg]:size-4", md: "size-11 rounded-xl [&_svg]:size-5", lg: "size-14 rounded-2xl [&_svg]:size-7" }[tam];
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden", t, className)}
      style={{
        background: `linear-gradient(160deg, color-mix(in oklab, ${a.fondo} 82%, white) 0%, ${a.fondo} 55%, color-mix(in oklab, ${a.fondo} 86%, black) 100%)`,
        color: a.texto,
        boxShadow: `0 1px 0 rgb(255 255 255 / 0.35) inset, 0 -1px 0 rgb(0 0 0 / 0.18) inset, 0 6px 14px -8px ${a.fondo}`,
      }}
    >
      <IconoRubro icono={icono} />
    </span>
  );
}
