"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse position for subtle background effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/chat/new");
    }
  }, [isSignedIn, router]);

  if (isSignedIn) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Subtle animated background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `
            radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
              rgba(59, 130, 246, 0.3) 0%, 
              transparent 50%),
            radial-gradient(circle at ${100 - mousePosition.x}% ${
            100 - mousePosition.y
          }%, 
              rgba(147, 51, 234, 0.2) 0%, 
              transparent 50%)
          `,
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="tuuli Chat Logo"
            width={160}
            height={160}
            className="mx-auto mb-1 drop-shadow-2xl"
          />
        </div>

        {/* Clerk SignUp Component */}
        <div className="w-full max-w-md">
          <SignUp
            appearance={{
              baseTheme: dark,
            }}
            routing="hash"
            redirectUrl="/chat/new"
            signInUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
