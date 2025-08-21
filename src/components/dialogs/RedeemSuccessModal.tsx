"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, MessageSquare, Search, Star, Check } from "lucide-react";
import { useMessageLimit } from "@/contexts/MessageLimitContext";

interface RedeemSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  redeemCode?: string;
}

const premiumBenefits: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  footnote?: string;
  delay: number;
  highlight?: boolean;
}> = [
  {
    icon: MessageSquare,
    title: "500 Daily Messages",
    description: "10x more messages than Basic (50 → 500)",
    footnote: "*250 Gemini 2.5 Pro messages",
    delay: 0.2,
    highlight: true,
  },
  {
    icon: Search,
    title: "Search Tool Access",
    description: "Enhanced responses with real-time web search results",
    delay: 0.3,
  },
  {
    icon: Star,
    title: "Early Supporter Badge",
    description: "Exclusive badge when the app officially launches",
    delay: 0.4,
  },
];

export default function RedeemSuccessModal({
  isOpen,
  onClose,
  redeemCode: _redeemCode,
}: RedeemSuccessModalProps) {
  const [showBenefits, setShowBenefits] = useState(false);
  const { refetch } = useMessageLimit();

  useEffect(() => {
    if (isOpen) {
      // Refetch message limits to show updated premium limits
      refetch();

      // Show benefits after initial animation
      const timer = setTimeout(() => {
        setShowBenefits(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setShowBenefits(false);
    }
  }, [isOpen, refetch]);

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 25,
        stiffness: 300,
        duration: 0.6,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.3,
      },
    },
  };

  const crownVariants = {
    hidden: {
      scale: 0,
      rotate: -180,
      opacity: 0,
    },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        damping: 15,
        stiffness: 200,
        duration: 1.2,
      },
    },
  };

  const benefitVariants = {
    hidden: {
      opacity: 0,
      x: -50,
      scale: 0.8,
    },
    visible: (delay: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        delay,
        type: "spring" as const,
        damping: 20,
        stiffness: 300,
      },
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Header */}
            <div className="text-center pt-8 pb-6 px-6">
              <motion.div
                variants={crownVariants}
                initial="hidden"
                animate="visible"
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4 mx-auto"
              >
                <Crown className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
              >
                Welcome to Premium!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="text-gray-600 dark:text-gray-300"
              >
                Your code has been successfully redeemed!
              </motion.p>
            </div>

            {/* Premium Benefits */}
            <div className="px-6 pb-6">
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: showBenefits ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center"
              >
                Your Premium Benefits
              </motion.h3>

              <div className="space-y-3">
                {premiumBenefits.map((benefit, index) => {
                  const IconComponent = benefit.icon;
                  return (
                    <motion.div
                      key={index}
                      variants={benefitVariants}
                      initial="hidden"
                      animate={showBenefits ? "visible" : "hidden"}
                      custom={benefit.delay}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {benefit.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          {benefit.description}
                        </p>
                        {benefit.footnote && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                            {benefit.footnote}
                          </p>
                        )}
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: showBenefits ? 1 : 0 }}
                        transition={{
                          delay: benefit.delay + 0.3,
                          type: "spring",
                        }}
                        className="flex-shrink-0"
                      >
                        <Check className="w-5 h-5 text-green-500" />
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <div className="px-6 pb-6">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: showBenefits ? 1 : 0,
                  y: showBenefits ? 0 : 20,
                }}
                transition={{ delay: 1.2, duration: 0.6 }}
                onClick={onClose}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Start Using Premium Features
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
