import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Multiple lockfiles on this machine confuse Turbopack root detection.
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
