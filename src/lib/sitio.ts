/** URL pública del sitio: la variable explícita, o la que Vercel asigna al proyecto, o localhost en desarrollo. */
export const SITIO =
  process.env.NEXT_PUBLIC_SITIO_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";
