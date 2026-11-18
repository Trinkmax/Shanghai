# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by the user (2026-11-18): Next.js 16 (App Router, TypeScript, `src/` layout) + Tailwind CSS v4 + Motion for UI; Supabase for data, staff auth, storage and Edge Functions, isolated in its own `shangai` schema inside a shared Supabase project (same pattern as the user's other apps: schema per app, `staff` table with roles, privileged work in Edge Functions with the service role); Mercado Pago Checkout Pro for online payments; deploy on Vercel.

## Users

- **Wholesale buyers** (inferred from the current site: "Importador mayorista", minimum purchase): shop owners and resellers who restock imported goods by quantity, often from a phone and used to ordering by WhatsApp. Their job: find products fast (by name or product code), build an order that reaches the minimum, and pay or confirm it.
- **Owners (dueños)**: run the catalog, prices, offers, best-sellers, home banners, orders, customers, staff accounts and the Mercado Pago connection.
- **Staff (personal)**: process and prepare orders, update their status, and attend counter sales.

## Product Purpose

Replace the current PHP catalog at imposhangai.com with a complete online wholesale store plus a back-office: customers browse the full catalog, fill a cart, and pay online with Mercado Pago (or choose another payment method the owners enable); owners and staff manage everything from a panel without a developer. Success: more complete orders placed online with less back-and-forth over WhatsApp, and owners in control of prices, offers and payments.

## Positioning

A Córdoba importer with a physical store (Entre Ríos 258, Córdoba Capital) and a broad, fast-moving catalog of imported goods (about 1,000 products across 41 categories, with a "Novedades" stream). Wholesale pricing with a minimum purchase.

## Operating Context

- Minimum purchase: $120.000 ARS today (must be editable from the panel). Prices in ARS.
- Every product has a "Código" (SKU) that staff and repeat buyers use to talk about products.
- Contact channels: WhatsApp +54 9 3516 06-1756, Instagram @imposhangai.
- The current site groups products in "rubros" (categories), has "General" and "Novedades" views, a quantity field per product and a "Ver pedido" flow.
- Required sections: Ofertas, Más vendidos (and Novedades from the current site).

## Capabilities and Constraints

- Wholesale model with a configurable minimum purchase (confirmed).
- Owners connect their own Mercado Pago account from the panel; the access token must never reach the browser.
- Mobile-first: animations and subtle micro-interactions, never at the cost of speed.
- Staff roles: owner (full control), manager, seller (operational).
- Undecided by the business, configurable in the panel: delivery options and costs, enabled payment methods (Mercado Pago, transfer, cash), bank details, business hours.

## Brand Commitments

- Name: **Shangai Center** (spelled without "h"), descriptor "Importador mayorista".
- Logo: an isometric hexagonal box whose faces form an "S" (recreated as SVG from the site banner).
- Brand colors from the logo: deep indigo `#372A84` and periwinkle indigo `#5C63AA` on a light gray field.

## Evidence on Hand

- Scraped from imposhangai.com (2026-11-18): 1,016 products with name, code, price, category and 1,230 photos; 41 categories; 282 products flagged as Novedades; banner with address, WhatsApp, Instagram and minimum purchase.
- Absent and must not be fabricated as fact: real offer prices, sales history (best-sellers start as an owner-curated list), product descriptions, stock levels, testimonials, shipping policy, business hours. Any demo offers are labeled as such and listed for the owners to replace.

## Product Principles

1. Order speed beats browsing theater: a buyer goes from landing to a complete order in minutes on a phone.
2. The minimum is a goal, not a wall: progress toward it is always visible and motivating.
3. Code-first findability: search by code or name, everywhere, instantly.
4. Owners run the store without a developer: prices, offers, banners, payments and staff are all editable.
5. Honest commerce: real prices and real availability, no fake urgency.
