const nextConfig = {
  serverExternalPackages: ["fs", "https"],
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;
