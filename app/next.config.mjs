/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    if (Array.isArray(config.externals)) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }

    return config;
  },
};

export default nextConfig;
