"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Calendar, Crown, Database, Shield } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import UpgradeModal from "./UpgradeModal";

interface NewUserWelcomeModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

const NewUserWelcomeModal: React.FC<NewUserWelcomeModalProps> = ({
  isOpen,
  onAccept,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleAccept = () => {
    setHasAccepted(true);
    onAccept();
  };

  const handleDismissAndExplore = () => {
    setHasAccepted(true);
    onAccept(); // Dismiss the current modal first
    setTimeout(() => {
      setIsUpgradeModalOpen(true); // Then show the upgrade modal
    }, 100);
  };

  const betaNotices = [
    {
      icon: <Shield className="h-6 w-6 text-red-400" />,
      title: "Chats are not encrypted",
      description: "Do not send personal or sensitive information",
      highlight: true,
    },
    {
      icon: <Database className="h-6 w-6 text-yellow-400" />,
      title: "Message history could be deleted",
      description: "Your conversations may not be permanently stored",
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-orange-400" />,
      title: "Service availability not guaranteed",
      description: "The service may experience downtime during beta",
    },
    {
      icon: <Crown className="h-6 w-6 text-purple-400" />,
      title: "For Premium users ",
      description:
        "If you get the Premium access, it will expire at October 1, 2025",
    },
  ];

  if (!isMounted) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-gray-700/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
                  <div className="relative flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Welcome to tuuli Chat Beta
                      </h2>
                      <p className="text-sm text-gray-300">
                        Important information before you start
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Beta Notice */}
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-yellow-400" />
                        <span className="font-semibold text-yellow-300">
                          Beta Period Notice
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">
                        tuuli Chat is currently in beta. Please review the
                        following important information about using the service
                        during this period.
                      </p>
                    </div>

                    {/* Beta Notices List */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Beta Limitations & Terms
                      </h3>
                      {betaNotices.map((notice, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                            notice.highlight
                              ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20"
                              : "bg-gray-800/30 hover:bg-gray-800/50"
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {notice.icon}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">
                              {notice.title}
                            </h4>
                            <p className="text-sm text-gray-300">
                              {notice.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {/* Dismiss & Explore Premium Button */}
                      <button
                        onClick={handleDismissAndExplore}
                        disabled={hasAccepted}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
                      >
                        <Crown className="h-5 w-5" />
                        Dismiss & Explore Premium
                      </button>

                      {/* Dismiss Button */}
                      <button
                        onClick={handleAccept}
                        disabled={hasAccepted}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                      >
                        {hasAccepted ? "Dismissed" : "Dismiss"}
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                      By clicking dismiss, you acknowledge that you have read
                      and understood the beta limitations and terms.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </>
  );
};

export default NewUserWelcomeModal;
