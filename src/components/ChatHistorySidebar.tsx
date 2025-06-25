"use client";

import React from "react";
import AppSidebar from "./layout/AppSidebar";

// This component is now a simple wrapper.
// The actual logic and layout are handled by AppSidebar and its children.
export default function ChatHistorySidebar() {
  return <AppSidebar />;
}
