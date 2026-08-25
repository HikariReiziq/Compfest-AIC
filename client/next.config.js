/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com"],
  },
  async rewrites() {
    // Target proxy dibaca dari environment.
    //
    // Nilai lama "localhost:8000" hanya benar saat `next dev` berjalan di host.
    // Di dalam container, localhost adalah container client itu sendiri, jadi
    // proxy-nya putus. Dengan env, compose mengarahkannya ke service "server"
    // lewat jaringan internal, dan backend tidak perlu dipublikasikan ke host
    // sama sekali.
    const target = process.env.API_PROXY_TARGET || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${target}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
