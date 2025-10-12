"use client";

import * as Select from "@radix-ui/react-select";
import {
  ChevronDown,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  Check,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

const MODES = [
  { value: "chat", label: "Chat", href: "/chat", icon: MessageCircle },
  { value: "image", label: "Image", href: "/image", icon: ImageIcon },
  { value: "transcribe", label: "Transcribe", href: "/transcribe", icon: Mic },
] as const;

const modeMap = MODES.reduce<Record<string, (typeof MODES)[number]>>(
  (acc, mode) => {
    acc[mode.value] = mode;
    return acc;
  },
  {}
);

const resolveValueFromPath = (pathname: string) => {
  if (pathname.startsWith("/image")) {
    return "image";
  }

  if (pathname.startsWith("/transcribe")) {
    return "transcribe";
  }

  return "chat";
};

export default function SidebarModeSelect() {
  const router = useRouter();
  const pathname = usePathname();

  const currentValue = useMemo(
    () => resolveValueFromPath(pathname ?? "/"),
    [pathname]
  );

  const activeMode = modeMap[currentValue];

  const handleValueChange = (value: string) => {
    const next = modeMap[value];
    if (!next) return;
    router.push(next.href);
  };

  return (
    <Select.Root value={currentValue} onValueChange={handleValueChange}>
      <Select.Trigger
        className="group inline-flex items-center gap-2 rounded-md border border-border-primary bg-bg-input px-3 py-2 text-xs font-medium text-text-primary shadow-sm transition hover:border-btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-btn-primary focus-visible:ring-offset-2"
        aria-label="Select workspace"
      >
        {activeMode && (
          <activeMode.icon size={14} className="text-text-secondary" />
        )}
        <Select.Value asChild>
          <span>{activeMode?.label ?? "Chat"}</span>
        </Select.Value>
        <Select.Icon>
          <ChevronDown size={14} className="text-text-secondary" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          align="center"
          sideOffset={6}
          className="z-50 min-w-[8rem] rounded-md border border-border-primary bg-bg-sidebar text-text-primary shadow-xl"
        >
          <Select.Viewport className="max-h-[14rem] p-1">
            {MODES.map((mode) => (
              <Select.Item
                key={mode.value}
                value={mode.value}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-2 text-xs font-medium text-text-secondary outline-none transition hover:bg-bg-input hover:text-text-primary data-[state=checked]:bg-bg-input data-[state=checked]:text-text-primary"
              >
                <mode.icon size={14} className="text-current" />
                <Select.ItemText>{mode.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute inset-y-0 right-2 flex items-center text-text-accent">
                  <Check size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
