"use client";

import { api } from "@/lib/trpc/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Image as ImageIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ImageEditorHeader from "./ImageEditorHeader";

interface ImageEditorInterfaceProps {
  imageId: string;
}

// Presets removed

export default function ImageEditorInterface({
  imageId: _imageId,
}: ImageEditorInterfaceProps) {
  const [title] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [shouldJumpToLast, setShouldJumpToLast] = useState<boolean>(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const viewLatest = (searchParams?.get("view") || "") === "latest";

  // Load turns for existing thread
  const { data: turnsData } = api.image.getTurns.useQuery(
    { threadId: _imageId },
    { enabled: _imageId !== "new" }
  );

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleSelectFile = () => fileInputRef.current?.click();

  const handleFileProcessing = useCallback((file: File) => {
    setFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setHistoryIndex(0);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    handleFileProcessing(e.target.files[0]);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          handleFileProcessing(file);
        }
      }
    },
    [handleFileProcessing]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const utils = api.useUtils();
  const generateMutation = api.image.generate.useMutation();

  // Build slideshow slides: first is Original, then each output image in order
  const slides = useMemo(() => {
    type Slide = {
      kind: "original" | "output";
      url: string;
      label: string;
      prompt?: string;
    };
    const slidesList: Slide[] = [];

    const turns = (turnsData || []).filter((t) => !!t);
    const earliestInput = turns.find((t) => t.input_image_url);
    const earliestOutput = turns.find((t) => t.output_image_url);

    // Prefer earliest input as Original; fallback to local preview, then earliest output
    const originalUrl =
      earliestInput?.input_image_url ||
      imageUrl ||
      earliestOutput?.output_image_url ||
      null;
    if (originalUrl) {
      slidesList.push({
        kind: "original",
        url: originalUrl,
        label: "Original",
      });
    }

    const outputs = turns.filter((t) => t.output_image_url);
    outputs.forEach((t) => {
      if (t.output_image_url) {
        // Label with the prompt directly
        slidesList.push({
          kind: "output",
          url: t.output_image_url,
          label: t.prompt,
          prompt: t.prompt,
        });
      }
    });

    return slidesList;
  }, [turnsData, imageUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !prompt.trim()) return;

    // If on existing thread and not viewing latest image, confirm
    if (
      _imageId !== "new" &&
      slides.length > 1 &&
      historyIndex !== slides.length - 1
    ) {
      const proceed = window.confirm(
        "You're not viewing the latest image. Only the last image in the thread will be used. Continue?"
      );
      if (!proceed) return;
    }
    setIsProcessing(true);

    try {
      let base64Content: string | undefined = undefined;
      let fileType: string | undefined = undefined;
      let fileName: string | undefined = undefined;

      if (file) {
        const reader = new FileReader();
        const result: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
        base64Content = result;
        fileType = file.type;
        fileName = file.name;
      }

      const { threadId } = await generateMutation.mutateAsync({
        threadId: _imageId !== "new" ? _imageId : undefined,
        prompt,
        image: base64Content
          ? { content: base64Content, name: fileName!, type: fileType! }
          : undefined,
      });

      // Reset prompt
      setPrompt("");

      // If we created a new thread, update the URL
      if (_imageId === "new" && threadId) {
        router.replace(`/image/${threadId}?view=latest`);
      }

      // Refetch thread and sidebar caches if any consumer exists
      await utils.image.listThreads.invalidate();
      if (_imageId !== "new") {
        await utils.image.getTurns.invalidate({ threadId: _imageId });
        setShouldJumpToLast(true);
      }
    } catch (_err) {
      // no-op; UI already shows overlay during processing
      // Optionally display toast here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setImageUrl(null);
    setHistoryIndex(0);
  };

  // If instructed via URL (newly created thread), jump to latest once slides are available
  useEffect(() => {
    if (viewLatest && slides.length > 0) {
      setHistoryIndex(slides.length - 1);
    }
  }, [viewLatest, slides.length]);

  // For existing threads after a successful generation, jump to latest once data refreshes
  useEffect(() => {
    if (shouldJumpToLast && slides.length > 0) {
      setHistoryIndex(slides.length - 1);
      setShouldJumpToLast(false);
    }
  }, [shouldJumpToLast, slides.length]);

  // Default behavior: when navigating to an existing thread, show the latest image
  const didInitIndexRef = useRef(false);
  useEffect(() => {
    // Reset initial flag when route param changes
    didInitIndexRef.current = false;
  }, [_imageId]);
  useEffect(() => {
    if (_imageId !== "new" && slides.length > 0 && !didInitIndexRef.current) {
      setHistoryIndex(slides.length - 1);
      didInitIndexRef.current = true;
    }
  }, [_imageId, slides.length]);

  return (
    <div className="flex flex-col h-full">
      <ImageEditorHeader title={title} />

      <div className="flex-1 grid grid-cols-1 gap-6 px-4 md:px-6 lg:px-8 py-6">
        {/* Canvas / Preview */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-full flex items-center justify-center gap-3">
            {slides.length > 0 && (
              <motion.button
                type="button"
                onClick={() => setHistoryIndex((i) => Math.max(0, i - 1))}
                disabled={historyIndex === 0}
                className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded bg-bg-input border border-border-primary text-text-primary disabled:opacity-40 hover:bg-opacity-80 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Previous version"
              >
                <ChevronLeftIcon size={18} />
              </motion.button>
            )}

            <div
              className={`w-full max-w-5xl mx-auto h-[70vh] md:h-[75vh] bg-bg-input border-2 border-dashed rounded-xl flex items-center justify-center relative overflow-hidden transition-all ${
                isDragOver
                  ? "border-blue-500 bg-blue-500/10"
                  : !imageUrl
                  ? "border-gray-700/50"
                  : "border-transparent"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => {
                if (slides.length === 0) handleSelectFile();
              }}
            >
              {slides.length === 0 ? (
                <button
                  onClick={handleSelectFile}
                  className="flex flex-col items-center justify-center text-text-secondary hover:text-text-primary transition-colors p-8"
                >
                  <UploadIcon size={32} className="mb-4" />
                  <h4 className="text-lg font-medium text-text-primary mb-2">
                    Upload an image
                  </h4>
                  <p className="text-text-secondary text-center max-w-sm mb-4">
                    Drag and drop your image here, or click to browse files
                  </p>
                  <div className="flex gap-2">
                    {["JPG", "PNG", "WebP", "GIF"].map((format) => (
                      <span
                        key={format}
                        className="px-2 py-1 text-xs bg-gray-800/50 rounded text-text-secondary"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </button>
              ) : (
                <>
                  <div className="absolute inset-0">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${historyIndex}-${slides[historyIndex]?.label}`}
                        className="absolute inset-0"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.18 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slides[historyIndex]?.url}
                          alt="Uploaded"
                          className="object-contain w-full h-full"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  {_imageId === "new" && imageUrl && (
                    <button
                      onClick={handleSelectFile}
                      className="absolute bottom-3 left-3 inline-flex items-center justify-center px-3 py-1.5 rounded bg-bg-primary/80 border border-border-primary text-text-secondary hover:text-text-primary z-10 transition-colors text-xs"
                    >
                      Change image
                    </button>
                  )}
                  {_imageId === "new" && imageUrl && (
                    <button
                      onClick={handleClearFile}
                      className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded bg-bg-primary/80 border border-border-primary text-text-secondary hover:text-text-primary z-10 transition-colors"
                      aria-label="Clear image"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            {slides.length > 0 && (
              <motion.button
                type="button"
                onClick={() =>
                  setHistoryIndex((i) => Math.min(slides.length - 1, i + 1))
                }
                disabled={historyIndex === slides.length - 1}
                className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded bg-bg-input border border-border-primary text-text-primary disabled:opacity-40 hover:bg-opacity-80 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Next version"
              >
                <ChevronRightIcon size={18} />
              </motion.button>
            )}
          </div>

          {slides.length > 0 && (
            <div className="w-full flex flex-col items-center justify-center gap-3">
              <div className="px-3 py-2 rounded-xl bg-bg-input border border-border-primary text-sm text-text-primary max-w-5xl w-full text-center">
                {slides[historyIndex]?.label}
              </div>

              {/* Input area directly below the prompt */}
              <div className="w-full max-w-5xl mx-auto px-1">
                <div
                  className={`relative transition-opacity duration-300 opacity-100`}
                >
                  <form
                    onSubmit={handleSubmit}
                    className={`p-3 bg-gray-800/50 border rounded-xl focus-within:border-gray-600 transition-all duration-150 flex flex-col relative border-gray-700/50`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Attachment button */}
                      <button
                        type="button"
                        onClick={handleSelectFile}
                        className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded focus:outline-none focus:ring-1 focus:ring-gray-600 transition-colors text-gray-400 hover:text-gray-200"
                        aria-label="Attach image"
                        title="Attach image"
                      >
                        <ImageIcon size={14} />
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {/* Textarea */}
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your edit..."
                        className="flex-1 bg-transparent resize-none focus:outline-none text-white placeholder:text-gray-400 text-sm leading-6 py-2"
                        rows={1}
                      />

                      {/* Submit */}
                      <motion.button
                        type="submit"
                        disabled={
                          isProcessing ||
                          (!file && _imageId === "new") ||
                          !prompt.trim()
                        }
                        className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Apply changes"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isProcessing ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <SparklesIcon size={14} />
                        )}
                      </motion.button>
                    </div>

                    {_imageId !== "new" &&
                      slides.length > 1 &&
                      historyIndex !== slides.length - 1 && (
                        <div className="mt-2 text-xs text-yellow-400">
                          You are not viewing the latest image. Applying changes
                          will use the last image in this thread.
                        </div>
                      )}
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Prompt for the current edited image */}
          {/* Removed additional prompt display per request */}
        </div>

        {/* Right panel removed; prompt moved below image */}
      </div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="px-4 py-3 rounded border border-border-primary bg-bg-primary text-text-primary text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-600 rounded-full animate-spin" />
              Processing image...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
