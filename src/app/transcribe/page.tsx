"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { api } from "@/lib/trpc/client";
import {
  Upload,
  Copy,
  Check,
  AlertCircle,
  X,
  FilePlus2,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import PremiumGate from "@/components/PremiumGate";

type TranscribePayload = {
  image: {
    content: string;
    name: string;
    type: string;
  };
};

function RetryStatus({
  retryCount,
  retryCountdown,
  pendingRetryDelay,
}: {
  retryCount: number;
  retryCountdown: number | null;
  pendingRetryDelay: number | null;
}) {
  if (retryCount <= 0 && !pendingRetryDelay && retryCountdown === null) {
    return null;
  }

  const currentDelay =
    retryCountdown !== null ? retryCountdown : pendingRetryDelay;

  return (
    <div className="flex flex-col items-center gap-1 text-xs text-text-tertiary">
      <div className="flex items-center gap-1">
        <RotateCcw className="h-3.5 w-3.5" />
        <span>
          {retryCount > 0
            ? `Attempt ${retryCount + 1}`
            : currentDelay !== null
            ? "Scheduling retry"
            : "Retry queued"}
        </span>
      </div>
      {currentDelay !== null ? (
        <span className="text-text-secondary">
          Retrying in {Math.max(currentDelay, 0)}s
        </span>
      ) : null}
    </div>
  );
}

function EmptyResultState({
  hasSelectedImage,
  retryCount,
  retryCountdown,
  pendingRetryDelay,
  lastErrorMessage,
}: {
  hasSelectedImage: boolean;
  retryCount: number;
  retryCountdown: number | null;
  pendingRetryDelay: number | null;
  lastErrorMessage: string | null;
}) {
  if (!hasSelectedImage) {
    return (
      <p className="text-white">
        Upload an image to see the transcribed text here
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-white">Processing image…</p>
      {lastErrorMessage ? (
        <p className="max-w-xs text-wrap text-xs text-red-300">
          {lastErrorMessage}
        </p>
      ) : null}
      <RetryStatus
        retryCount={retryCount}
        retryCountdown={retryCountdown}
        pendingRetryDelay={pendingRetryDelay}
      />
    </div>
  );
}

function ErrorState({
  message,
  retryCount,
  retryCountdown,
  pendingRetryDelay,
}: {
  message: string | undefined;
  retryCount: number;
  retryCountdown: number | null;
  pendingRetryDelay: number | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-text-primary">Unable to transcribe right now</p>
        <p className="text-sm text-text-secondary">
          {message || "Model returned an error. We'll retry automatically."}
        </p>
      </div>
      <RetryStatus
        retryCount={retryCount}
        retryCountdown={retryCountdown}
        pendingRetryDelay={pendingRetryDelay}
      />
    </div>
  );
}

export default function TranscribePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [pendingRetryDelay, setPendingRetryDelay] = useState<number | null>(
    null
  );
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRetryFnRef = useRef<(() => void) | null>(null);
  const lastPayloadRef = useRef<TranscribePayload | null>(null);
  const retryDelayRef = useRef(1);
  const retryDeadlineRef = useRef<number | null>(null);
  const isRetryScheduledRef = useRef(false);

  const clearRetryTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    pendingRetryFnRef.current = null;
    retryDeadlineRef.current = null;
    isRetryScheduledRef.current = false;
  }, []);

  const resetRetryState = useCallback(() => {
    clearRetryTimers();
    setPendingRetryDelay(null);
    setRetryCountdown(null);
    isRetryScheduledRef.current = false;
  }, [clearRetryTimers]);

  useEffect(() => {
    return () => {
      clearRetryTimers();
    };
  }, [clearRetryTimers]);

  const scheduleRetry = useCallback(
    (delaySeconds: number, retryFn: () => void) => {
      clearRetryTimers();
      pendingRetryFnRef.current = retryFn;
      retryDeadlineRef.current = Date.now() + delaySeconds * 1000;
      setPendingRetryDelay(delaySeconds);
      setRetryCountdown(delaySeconds);
      isRetryScheduledRef.current = true;

      retryIntervalRef.current = setInterval(() => {
        if (!retryDeadlineRef.current) {
          setRetryCountdown(null);
          return;
        }
        const msRemaining = Math.max(retryDeadlineRef.current - Date.now(), 0);
        const secondsRemaining = Math.ceil(msRemaining / 1000);
        setRetryCountdown(secondsRemaining > 0 ? secondsRemaining : 0);
      }, 250);

      retryTimeoutRef.current = setTimeout(() => {
        const pendingFn = pendingRetryFnRef.current;
        resetRetryState();
        if (pendingFn) {
          pendingFn();
        }
      }, delaySeconds * 1000);
    },
    [clearRetryTimers, resetRetryState]
  );

  const transcribeMutation = api.transcribe.transcribe.useMutation({
    onSuccess: (data: { success: boolean; text: string }) => {
      setTranscribedText(data.text);
      setRetryCount(0);
      setLastErrorMessage(null);
      retryDelayRef.current = 1;
      resetRetryState();
    },
    onError: (error: unknown) => {
      console.error("Transcription error:", error);

      if (!lastPayloadRef.current) {
        setRetryCount(0);
        retryDelayRef.current = 1;
        resetRetryState();
        setLastErrorMessage(
          error instanceof Error ? error.message : String(error)
        );
        return;
      }

      setRetryCount((prev) => prev + 1);

      const errorMessage =
        (error instanceof Error ? error.message : String(error)) ||
        "Unknown error";
      setLastErrorMessage(errorMessage);

      const currentDelay = retryDelayRef.current;
      const retryFn = () => {
        retryNow();
      };

      scheduleRetry(currentDelay, retryFn);
      retryDelayRef.current = Math.min(currentDelay * 2, 20);
    },
  });

  const performTranscription = useCallback(() => {
    if (!lastPayloadRef.current || isRetryScheduledRef.current) {
      return;
    }
    transcribeMutation.reset();
    transcribeMutation.mutate(lastPayloadRef.current);
  }, [transcribeMutation]);

  const retryNow = useCallback(() => {
    resetRetryState();
    performTranscription();
  }, [performTranscription, resetRetryState]);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
        setImageName(file.name);
        setTranscribedText("");
        setCopied(false);
        setRetryCount(0);
        retryDelayRef.current = 1;
        resetRetryState();
        setLastErrorMessage(null);

        const payload: TranscribePayload = {
          image: {
            content: result,
            name: file.name,
            type: file.type,
          },
        };

        lastPayloadRef.current = payload;
        retryNow();
      };
      reader.readAsDataURL(file);
    },
    [resetRetryState, retryNow]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(transcribedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [transcribedText]);

  const handleClearImage = useCallback(() => {
    setSelectedImage(null);
    setImageName("");
    setTranscribedText("");
    setCopied(false);
    setRetryCount(0);
    setLastErrorMessage(null);
    lastPayloadRef.current = null;
    retryDelayRef.current = 1;
    resetRetryState();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [resetRetryState]);

  const handleNew = useCallback(() => {
    setSelectedImage(null);
    setImageName("");
    setTranscribedText("");
    setCopied(false);
    setRetryCount(0);
    setLastErrorMessage(null);
    lastPayloadRef.current = null;
    retryDelayRef.current = 1;
    resetRetryState();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [resetRetryState]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (selectedImage) {
        return;
      }
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handleFileSelect, selectedImage]);

  return (
    <PremiumGate featureName="Math Transcription">
      <div className="flex h-full w-full flex-col bg-bg-primary">
        {/* Header with New Button */}
        <div className="flex items-center justify-between border-b border-border-primary bg-bg-secondary px-6 py-3">
          <div className="h-10" />
          {(selectedImage || transcribedText) && (
            <button
              onClick={handleNew}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              <FilePlus2 className="h-4 w-4" />
              New
            </button>
          )}
        </div>

        {/* Warning Banner */}
        {showWarning && (
          <div className="flex items-center justify-between gap-3 border-b border-border-primary bg-yellow-500/10 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Your uploaded image and progress will be lost if you close this
                tab. Make sure to copy your result before leaving.
              </span>
            </div>
            <button
              onClick={() => setShowWarning(false)}
              className="flex-shrink-0 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Image Upload */}
          <div className="flex w-1/2 flex-col border-r border-border-primary p-6">
            <h2 className="mb-4 text-xl font-semibold text-text-primary">
              Upload Image
            </h2>

            {!selectedImage ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-border-primary bg-bg-secondary hover:border-blue-400 hover:bg-bg-tertiary"
                }`}
              >
                <Upload className="mb-4 h-16 w-16 text-text-tertiary" />
                <p className="mb-2 text-lg font-medium text-text-primary">
                  Drag and drop an image or paste from clipboard
                </p>
                <p className="text-sm text-text-secondary">
                  or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border-primary bg-bg-secondary">
                <div className="flex items-center justify-between border-b border-border-primary bg-bg-tertiary px-4 py-2">
                  <span className="truncate text-sm text-text-secondary">
                    {imageName}
                  </span>
                  <button
                    onClick={handleClearImage}
                    className="text-text-tertiary hover:text-text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-1 items-center justify-center overflow-auto p-4">
                  <Image
                    src={selectedImage}
                    alt="Uploaded content"
                    width={800}
                    height={600}
                    className="max-h-full max-w-full rounded object-contain"
                    unoptimized
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Transcription Result */}
          <div className="flex w-1/2 flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-primary">
                Result
              </h2>
              {transcribedText && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border-primary bg-bg-secondary">
              {transcribeMutation.isPending ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                  <p className="text-text-secondary">
                    Transcribing your content...
                  </p>
                  <RetryStatus
                    retryCount={retryCount}
                    retryCountdown={retryCountdown}
                    pendingRetryDelay={pendingRetryDelay}
                  />
                </div>
              ) : transcribeMutation.isError ? (
                <ErrorState
                  message={transcribeMutation.error?.message}
                  retryCount={retryCount}
                  retryCountdown={retryCountdown}
                  pendingRetryDelay={pendingRetryDelay}
                />
              ) : transcribedText ? (
                <div className="flex-1 overflow-auto p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-text-primary">
                    {transcribedText}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <EmptyResultState
                    hasSelectedImage={Boolean(selectedImage)}
                    retryCount={retryCount}
                    retryCountdown={retryCountdown}
                    pendingRetryDelay={pendingRetryDelay}
                    lastErrorMessage={lastErrorMessage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PremiumGate>
  );
}
