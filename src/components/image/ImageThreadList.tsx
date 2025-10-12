"use client";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Image as ImageIcon } from "lucide-react";

export default function ImageThreadList() {
  const { data, isLoading, error } = api.image.listThreads.useQuery();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center px-3">
        <div className="animate-pulse text-gray-400">Loading images...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 text-center text-red-400">
        <p>Error loading images:</p>
        <p className="text-xs">{error.message}</p>
      </div>
    );
  }

  const threads = data ?? [];

  return (
    <ScrollArea.Root className="flex-1 overflow-hidden w-full px-3">
      <ScrollArea.Viewport className="h-full w-full rounded">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-text-secondary">
            <ImageIcon className="mb-2" size={28} />
            <p className="text-sm">No image threads yet</p>
            <p className="text-xs mt-1">Create one to begin</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {threads.map(
              (t: {
                id: string;
                latest_output_image_url: string | null;
                created_at: string;
                turn_count: number | null;
              }) => (
                <li key={t.id}>
                  <Link
                    href={`/image/${t.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-text-primary hover:bg-bg-input focus:outline-none focus:bg-bg-input transition-colors truncate"
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded bg-bg-input overflow-hidden border border-border-primary">
                      {t.latest_output_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.latest_output_image_url}
                          alt="thumb"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={14} className="text-text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 truncate text-xs text-text-secondary">
                      {t.turn_count || 0} image
                      {(t.turn_count || 0) === 1 ? "" : "s"}
                      {" • "}
                      {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                </li>
              )
            )}
          </ul>
        )}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="flex select-none touch-none p-0.5 bg-transparent transition-colors duration-150 ease-out data-[orientation=vertical]:w-2"
      >
        <ScrollArea.Thumb className="flex-1 bg-text-secondary/50 hover:bg-text-secondary/70 rounded-full relative" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner className="bg-transparent" />
    </ScrollArea.Root>
  );
}
