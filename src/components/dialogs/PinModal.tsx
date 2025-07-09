"use client";

import { usePin } from "@/contexts/PinContext";
import * as Dialog from "@radix-ui/react-dialog";
import { LockIcon, ShieldIcon, XIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const PinModal = () => {
  const {
    isPinSet,
    isPinValidated,
    validatePin,
    setPin,
    isLoading: isPinLoading,
    forceOpenModal,
    setForceOpenModal,
  } = usePin();
  const [isOpen, setIsOpen] = useState(!isPinValidated || forceOpenModal);
  const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Open modal if pin is not validated and not loading, or if forceOpenModal is true
  useEffect(() => {
    if (forceOpenModal) {
      setIsOpen(true);
      setForceOpenModal(false); // Reset the flag
    } else if (!isPinLoading && !isPinValidated) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [
    isPinValidated,
    isPinLoading,
    forceOpenModal,
    setForceOpenModal,
    setIsOpen,
  ]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digits
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newDigits.every((digit) => digit !== "") && index === 5) {
      setTimeout(() => handleSubmit(newDigits.join("")), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      handleSubmit(pinDigits.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length === 6) {
      const newDigits = pastedData.split("");
      setPinDigits(newDigits);
      setError("");
      setTimeout(() => handleSubmit(pastedData), 100);
    }
  };

  const handleSubmit = async (pin?: string) => {
    const pinToSubmit = pin || pinDigits.join("");
    if (pinToSubmit.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (isPinSet) {
        const isValid = await validatePin(pinToSubmit);
        if (!isValid) {
          setError("Incorrect PIN. Please try again.");
          setPinDigits(["", "", "", "", "", ""]);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      } else {
        const success = await setPin(pinToSubmit);
        if (!success) {
          setError("Failed to set PIN. Please try again.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearPin = () => {
    setPinDigits(["", "", "", "", "", ""]);
    setError("");
    inputRefs.current[0]?.focus();
  };

  if (isPinLoading) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-primary border border-border-primary rounded-2xl shadow-2xl p-8 w-full max-w-md z-50">
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </Dialog.Close>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-btn-primary/20 rounded-full flex items-center justify-center mb-6">
              {isPinSet ? (
                <LockIcon className="w-8 h-8 text-btn-primary" />
              ) : (
                <ShieldIcon className="w-8 h-8 text-btn-primary" />
              )}
            </div>

            <Dialog.Title className="text-2xl font-semibold text-text-primary mb-2">
              {isPinSet ? "Enter Your PIN" : "Set Your PIN"}
            </Dialog.Title>

            <Dialog.Description className="text-text-secondary mb-8">
              {isPinSet
                ? "Enter your 6-digit PIN to access your chats"
                : "Create a 6-digit PIN to secure your chats"}
            </Dialog.Description>

            <div className="flex justify-center gap-3 mb-6">
              {pinDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`w-12 h-14 text-center text-xl font-semibold bg-bg-input border-2 rounded-xl transition-all duration-200 focus:outline-none focus:border-btn-primary focus:bg-bg-input/80 ${
                    error
                      ? "border-red-500 text-red-400"
                      : digit
                      ? "border-btn-primary/50 text-text-primary"
                      : "border-border-primary text-text-secondary hover:border-btn-primary/30"
                  }`}
                  disabled={isSubmitting}
                />
              ))}
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={clearPin}
                disabled={isSubmitting || pinDigits.every((d) => d === "")}
                className="flex-1 px-4 py-3 text-text-secondary hover:text-text-primary border border-border-primary hover:border-btn-primary/30 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>

              <button
                onClick={() => handleSubmit()}
                disabled={isSubmitting || pinDigits.some((d) => d === "")}
                className="flex-1 px-4 py-3 bg-btn-primary hover:bg-btn-primary-hover text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>{isPinSet ? "Unlock" : "Set PIN"}</span>
                )}
              </button>
            </div>

            {isPinSet && (
              <p className="text-xs text-text-secondary mt-4">
                Your PIN protects access to your chat history and settings
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default PinModal;
