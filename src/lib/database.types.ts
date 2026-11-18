/**
 * Tipos del schema `shangai` (Supabase). Escritos a mano a partir de las
 * migraciones en supabase/migrations: el generador del MCP solo cubre `public`.
 * Si cambia una tabla, actualizá también este archivo.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type RolPersonal = "dueno" | "encargado" | "vendedor";
export type EstadoPedido = "pendiente" | "confirmado" | "preparando" | "listo" | "enviado" | "entregado" | "cancelado";
export type EstadoPago = "pendiente" | "en_proceso" | "aprobado" | "rechazado" | "reembolsado" | "cancelado";
export type MetodoPago = "mercadopago" | "transferencia" | "efectivo" | "tarjeta";
export type MetodoEntrega = "retiro" | "envio_local" | "envio_interior";
export type CanalPedido = "web" | "mostrador" | "whatsapp";
export type TonoBanner = "indigo" | "ambar" | "noche" | "claro";

export type Database = {
  shangai: {
    Tables: {
      personal: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          rol: RolPersonal;
          activo: boolean;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id: string;
          nombre: string;
          email: string;
          rol?: RolPersonal;
          activo?: boolean;
        };
        Update: {
          nombre?: string;
          email?: string;
          rol?: RolPersonal;
          activo?: boolean;
        };
        Relationships: [];
      };
      categorias: {
        Row: {
          id: number;
          legacy_id: number | null;
          slug: string;
          nombre: string;
          descripcion: string | null;
          icono: string;
          color: string;
          orden: number;
          activa: boolean;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          legacy_id?: number | null;
          slug: string;
          nombre: string;
          descripcion?: string | null;
          icono?: string;
          color?: string;
          orden?: number;
          activa?: boolean;
        };
        Update: {
          slug?: string;
          nombre?: string;
          descripcion?: string | null;
          icono?: string;
          color?: string;
          orden?: number;
          activa?: boolean;
        };
        Relationships: [];
      };
      productos: {
        Row: {
          id: string;
          codigo: string;
          slug: string;
          nombre: string;
          descripcion: string | null;
          categoria_id: number | null;
          precio: number;
          precio_oferta: number | null;
          oferta_hasta: string | null;
          en_oferta: boolean;
          imagenes: string[];
          stock: number | null;
          cantidad_minima: number;
          es_novedad: boolean;
          destacado: boolean;
          ranking_vendidos: number | null;
          vendidos: number;
          activo: boolean;
          orden: number;
          busqueda: string;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          codigo: string;
          slug: string;
          nombre: string;
          descripcion?: string | null;
          categoria_id?: number | null;
          precio: number;
          precio_oferta?: number | null;
          oferta_hasta?: string | null;
          en_oferta?: boolean;
          imagenes?: string[];
          stock?: number | null;
          cantidad_minima?: number;
          es_novedad?: boolean;
          destacado?: boolean;
          ranking_vendidos?: number | null;
          activo?: boolean;
          orden?: number;
        };
        Update: {
          codigo?: string;
          slug?: string;
          nombre?: string;
          descripcion?: string | null;
          categoria_id?: number | null;
          precio?: number;
          precio_oferta?: number | null;
          oferta_hasta?: string | null;
          en_oferta?: boolean;
          imagenes?: string[];
          stock?: number | null;
          cantidad_minima?: number;
          es_novedad?: boolean;
          destacado?: boolean;
          ranking_vendidos?: number | null;
          activo?: boolean;
          orden?: number;
        };
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
        ];
      };
      banners: {
        Row: {
          id: number;
          titulo: string;
          bajada: string | null;
          cta_texto: string | null;
          cta_href: string | null;
          imagen: string | null;
          tono: TonoBanner;
          orden: number;
          activo: boolean;
          desde: string | null;
          hasta: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          titulo: string;
          bajada?: string | null;
          cta_texto?: string | null;
          cta_href?: string | null;
          imagen?: string | null;
          tono?: TonoBanner;
          orden?: number;
          activo?: boolean;
          desde?: string | null;
          hasta?: string | null;
        };
        Update: {
          titulo?: string;
          bajada?: string | null;
          cta_texto?: string | null;
          cta_href?: string | null;
          imagen?: string | null;
          tono?: TonoBanner;
          orden?: number;
          activo?: boolean;
          desde?: string | null;
          hasta?: string | null;
        };
        Relationships: [];
      };
      configuracion: {
        Row: {
          id: boolean;
          nombre_tienda: string;
          descripcion: string;
          whatsapp: string;
          telefono: string | null;
          email: string | null;
          direccion: string;
          ciudad: string;
          mapa_url: string | null;
          instagram: string | null;
          facebook: string | null;
          horarios: Json;
          compra_minima: number;
          anuncio: string | null;
          envios: Json;
          pago_mercadopago: boolean;
          pago_transferencia: boolean;
          pago_efectivo: boolean;
          descuento_transferencia: number;
          transferencia_datos: Json;
          mp_conectado: boolean;
          actualizado_en: string;
        };
        Insert: { id?: boolean };
        Update: {
          nombre_tienda?: string;
          descripcion?: string;
          whatsapp?: string;
          telefono?: string | null;
          email?: string | null;
          direccion?: string;
          ciudad?: string;
          mapa_url?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          horarios?: Json;
          compra_minima?: number;
          anuncio?: string | null;
          envios?: Json;
          pago_mercadopago?: boolean;
          pago_transferencia?: boolean;
          pago_efectivo?: boolean;
          descuento_transferencia?: number;
          transferencia_datos?: Json;
        };
        Relationships: [];
      };
      mercadopago: {
        Row: {
          id: boolean;
          conectado: boolean;
          public_key: string | null;
          cuenta: Json | null;
          modo: "produccion" | "prueba" | null;
          webhook_secreto: boolean;
          conectado_en: string | null;
          conectado_por: string | null;
          ultimo_error: string | null;
          actualizado_en: string;
        };
        Insert: { id?: boolean };
        Update: Record<string, never>;
        Relationships: [];
      };
      clientes: {
        Row: {
          id: string;
          nombre: string;
          telefono: string | null;
          email: string | null;
          documento: string | null;
          negocio: string | null;
          ciudad: string | null;
          provincia: string | null;
          notas: string | null;
          pedidos_count: number;
          total_comprado: number;
          ultimo_pedido_en: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: { nombre: string };
        Update: {
          nombre?: string;
          telefono?: string | null;
          email?: string | null;
          documento?: string | null;
          negocio?: string | null;
          ciudad?: string | null;
          provincia?: string | null;
          notas?: string | null;
        };
        Relationships: [];
      };
      pedidos: {
        Row: {
          id: string;
          numero: number;
          token: string;
          canal: CanalPedido;
          estado: EstadoPedido;
          estado_pago: EstadoPago;
          metodo_pago: MetodoPago;
          cliente_id: string | null;
          cliente_nombre: string;
          cliente_telefono: string;
          cliente_email: string | null;
          cliente_documento: string | null;
          cliente_negocio: string | null;
          entrega_metodo: MetodoEntrega;
          entrega_nombre: string;
          entrega_direccion: Json | null;
          notas: string | null;
          subtotal: number;
          descuento: number;
          costo_envio: number | null;
          total: number;
          items_count: number;
          mp_preference_id: string | null;
          mp_init_point: string | null;
          mp_payment_id: string | null;
          pagado_en: string | null;
          ventas_contabilizadas: boolean;
          creado_por: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_creado_por_fkey";
            columns: ["creado_por"];
            isOneToOne: false;
            referencedRelation: "personal";
            referencedColumns: ["id"];
          },
        ];
      };
      pedido_items: {
        Row: {
          id: number;
          pedido_id: string;
          producto_id: string | null;
          codigo: string;
          nombre: string;
          imagen: string | null;
          precio_unitario: number;
          cantidad: number;
          subtotal: number;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      pedido_eventos: {
        Row: {
          id: number;
          pedido_id: string;
          tipo: "creado" | "estado" | "pago" | "nota";
          estado: string | null;
          detalle: string | null;
          autor_id: string | null;
          autor: string | null;
          creado_en: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "pedido_eventos_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
        ];
      };
      pagos: {
        Row: {
          id: number;
          pedido_id: string;
          proveedor: string;
          referencia: string;
          estado: string;
          estado_detalle: string | null;
          monto: number | null;
          medio: string | null;
          cuotas: number | null;
          datos: Json | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "pagos_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      pedido_publico: { Args: { p_token: string }; Returns: Json };
      actualizar_pedido: {
        Args: { p_pedido: string; p_estado?: string | null; p_estado_pago?: string | null; p_nota?: string | null };
        Returns: Database["shangai"]["Tables"]["pedidos"]["Row"];
      };
      crear_venta_mostrador: { Args: { p_datos: Json }; Returns: Json };
      resumen_ventas: { Args: { p_desde: string; p_hasta: string }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type Esquema = Database["shangai"];
export type Tabla<T extends keyof Esquema["Tables"]> = Esquema["Tables"][T]["Row"];
export type TablaInsert<T extends keyof Esquema["Tables"]> = Esquema["Tables"][T]["Insert"];
export type TablaUpdate<T extends keyof Esquema["Tables"]> = Esquema["Tables"][T]["Update"];
// Usado por los genéricos de Relationships (evita "unused" en algunos linters).
export type _Rel = Rel;
