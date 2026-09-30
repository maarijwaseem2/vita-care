/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const nextConfig = {
  reactStrictMode: true,
  // Uploaded images live on the API. Proxying /uploads/* through this app means
  // stored paths stay relative ("/uploads/abc.jpg") and keep working on any domain.
  async rewrites() {
    return [{ source: '/uploads/:path*', destination: `${API_ORIGIN}/uploads/:path*` }];
  },
};

export default nextConfig;
