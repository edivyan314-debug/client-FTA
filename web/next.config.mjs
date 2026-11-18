/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable font optimization in environments without network (local dev / sandbox)
  // Vercel builds have network and will optimize fonts correctly
  optimizeFonts: true,
  // Allow images from the backend API domain
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.onrender.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
    ],
  },
};

export default nextConfig;
