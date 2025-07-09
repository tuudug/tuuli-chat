"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Tables } from "@/types/supabase";
import { api } from "@/lib/trpc/client";

interface PinContextType {
  isPinSet: boolean;
  isPinValidated: boolean;
  validatePin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<boolean>;
  userProfile: Tables<"user_profiles"> | null;
  setUserProfile: (profile: Tables<"user_profiles"> | null) => void;
  storedPin: string | null;
  isLoading: boolean;
  openPinModal: () => void;
  forceOpenModal: boolean;
  setForceOpenModal: (value: boolean) => void; // Add setForceOpenModal to the interface
}

const PinContext = createContext<PinContextType | undefined>(undefined);

export const PinProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] =
    useState<Tables<"user_profiles"> | null>(null);
  const [storedPin, setStoredPin] = useLocalStorage<string | null>(
    "userPin",
    null
  );
  const [isPinValidated, setIsPinValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [forceOpenModal, setForceOpenModal] = useState(false);

  const isPinSet = !!userProfile?.pin_code;

  useEffect(() => {
    if (userProfile) {
      setIsLoading(false);
    }
    if (isPinSet && storedPin) {
      if (storedPin === userProfile.pin_code) {
        setIsPinValidated(true);
      }
    } else if (!isPinSet) {
      // If no PIN is set, allow access (user will be prompted to set one)
      setIsPinValidated(false);
    }
  }, [userProfile, storedPin, isPinSet]);

  const validatePin = async (pin: string) => {
    try {
      const result = await api.pin.validate.useMutation().mutateAsync({ pin });
      if (result.success) {
        setStoredPin(pin);
        setIsPinValidated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error validating PIN:", error);
      return false;
    }
  };

  const setPin = async (pin: string) => {
    if (userProfile) {
      try {
        const result = await api.pin.set.useMutation().mutateAsync({ pin });
        if (result.success) {
          setUserProfile(result.profile);
          setStoredPin(pin);
          setIsPinValidated(true);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error setting PIN:", error);
        return false;
      }
    }
    return false;
  };

  const openPinModal = () => {
    setForceOpenModal(true);
  };

  return (
    <PinContext.Provider
      value={{
        isPinSet,
        isPinValidated,
        validatePin,
        setPin,
        userProfile,
        setUserProfile,
        storedPin,
        isLoading,
        openPinModal,
        forceOpenModal,
        setForceOpenModal, // Add setForceOpenModal to the value prop
      }}
    >
      {children}
    </PinContext.Provider>
  );
};

export const usePin = () => {
  const context = useContext(PinContext);
  if (context === undefined) {
    throw new Error("usePin must be used within a PinProvider");
  }
  return context;
};
