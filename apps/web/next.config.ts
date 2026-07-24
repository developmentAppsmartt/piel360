import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El navegador solo le habla a su propio origen (/api/*); Next.js reenvía
  // server-side al backend de Railway. Necesario porque la cookie httpOnly de
  // sesión (lib/session.ts) no lleva `domain` — en producción, web (Vercel) y
  // api (Railway) son hosts distintos, y sin este rewrite la cookie nunca
  // llegaría a la API (ver plan de despliegue). En dev, BACKEND_ORIGIN no hace
  // falta porque localhost:3001→localhost:3000 comparten host.
  async rewrites() {
    if (!process.env.BACKEND_ORIGIN) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
