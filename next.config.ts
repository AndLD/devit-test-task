import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal .next/standalone output (only the files actually
  // needed at runtime) so the Docker runtime image doesn't need
  // node_modules or the full source tree — see Dockerfile.
  output: "standalone",
};

export default nextConfig;
