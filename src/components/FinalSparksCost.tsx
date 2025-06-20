"use client";

import React from "react";
import { Zap } from "lucide-react";
import { formatSparks } from "@/lib/sparks";
import * as Tooltip from "@radix-ui/react-tooltip";

interface FinalSparksCostProps {
  cost: number;
}

export default function FinalSparksCost({ cost }: FinalSparksCostProps) {
  if (!cost || cost === 0) {
    return null;
  }

  return (
    <Tooltip.Provider delayDuration={100}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="flex items-center space-x-1 text-xs text-amber-500/80 cursor-default">
            <Zap size={12} />
            <span>{formatSparks(cost)}</span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white shadow-lg z-50"
            sideOffset={5}
          >
            Message Cost
            <Tooltip.Arrow className="fill-gray-600" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
