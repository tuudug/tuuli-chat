import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iacncoasiljzbhuuxawl.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/user-attachments/**",
      },
    ],
  },
};

export default nextConfig;
