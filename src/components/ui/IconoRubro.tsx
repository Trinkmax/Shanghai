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

/** Ícono del rubro, sin fondo: el color de la marca y nada más. (`color` se mantiene por compatibilidad.) */
export function FichaRubro({
  icono,
  className,
  tam = "md",
}: {
  icono: string;
  color?: string;
  className?: string;
  tam?: "sm" | "md" | "lg";
}) {
  const t = { sm: "size-6 [&_svg]:size-[18px]", md: "size-8 [&_svg]:size-6", lg: "size-12 [&_svg]:size-9" }[tam];
  return (
    <span className={cn("grid shrink-0 place-items-center text-marca-600", t, className)}>
      <IconoRubro icono={icono} />
    </span>
  );
}
