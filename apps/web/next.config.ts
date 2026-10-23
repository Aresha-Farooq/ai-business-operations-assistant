
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@business-platform/database",
    "@business-platform/auth",
    "@business-platform/rag",
    "@business-platform/ai",
  ],

  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
  ],

  webpack(config, { isServer }) {
    if (isServer) {
      config.resolve.extensionAlias = {
        ...config.resolve.extensionAlias,
        ".js": [".ts", ".tsx", ".js"],
      };
    }

    return config;
  },
};

export default nextConfig;
