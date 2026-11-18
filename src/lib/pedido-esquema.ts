import { z } from "zod";

/** Validación del pedido de la tienda (la usan el formulario y la server action). */
const texto = (max: number) => z.string().trim().max(max).optional();

export const esquemaPedido = z.object({
  items: z
    .array(z.object({ producto_id: z.uuid(), cantidad: z.number().int().min(1).max(100000) }))
    .min(1, "Tu pedido está vacío")
    .max(400),
  cliente: z.object({
    nombre: z.string().trim().min(2, "Ingresá tu nombre y apellido").max(80),
    telefono: z
      .string()
      .trim()
      .refine((t) => t.replace(/\D/g, "").length >= 8 && t.replace(/\D/g, "").length <= 15, "Ingresá un teléfono con código de área"),
    email: z.union([z.email("El email no parece válido").max(120), z.literal("")]).optional(),
    negocio: texto(80),
    documento: texto(20),
  }),
  entrega: z.object({
    metodo: z.enum(["retiro", "envio_local", "envio_interior"]),
    direccion: z
      .object({ calle: texto(120), ciudad: texto(80), provincia: texto(60), cp: texto(12), referencias: texto(200) })
      .optional(),
  }),
  metodo_pago: z.enum(["mercadopago", "transferencia", "efectivo"], { message: "Elegí cómo vas a pagar" }),
  notas: texto(1000),
});

export type DatosPedido = z.infer<typeof esquemaPedido>;
