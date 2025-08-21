"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  Crown,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import RedeemSuccessModal from "./RedeemSuccessModal";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState<
    "features" | "payment" | "thankyou"
  >("features");
  const [paymentMethod, setPaymentMethod] = useState<"banktransfer" | "redeem">(
    "banktransfer"
  );
  const [isMounted, setIsMounted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successRedeemCode, setSuccessRedeemCode] = useState<string>("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setCurrentStep("features");
      // Reset redeem states when modal closes
      setRedeemCode("");
      setRedeemError(null);
      setRedeemSuccess(null);
      setIsRedeeming(false);
      setShowSuccessModal(false);
      setSuccessRedeemCode("");
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Clear redeem states when switching payment methods
  useEffect(() => {
    setRedeemError(null);
    setRedeemSuccess(null);
  }, [paymentMethod]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const transactionRemark =
    user?.emailAddresses?.[0]?.emailAddress || "user@example.com";

  const handlePaymentCompleted = async () => {
    setIsSendingNotification(true);
    try {
      const response = await fetch("/api/webhook/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail:
            user?.emailAddresses?.[0]?.emailAddress || "unknown@example.com",
          transactionRemark: transactionRemark,
        }),
      });

      if (response.ok) {
        setCurrentStep("thankyou");
      } else {
        console.error("Failed to send notification");
        // Still proceed to thank you page even if notification fails
        setCurrentStep("thankyou");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      // Still proceed to thank you page even if notification fails
      setCurrentStep("thankyou");
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;

    setIsRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      const response = await fetch("/api/redeem-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to redeem code");
      }

      setRedeemSuccess(data.message);
      setSuccessRedeemCode(redeemCode.trim());
      setRedeemCode("");

      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      setRedeemError(
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessRedeemCode("");
    onClose(); // Close the main modal as well
  };

  const features: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
    footnote?: string;
    highlight?: boolean;
  }> = [
    {
      icon: <MessageSquare className="h-6 w-6 text-blue-400" />,
      title: "500 Daily Messages",
      description: "10x more messages than Basic (50 → 500)",
      footnote: "*250 Gemini 2.5 Pro messages",
      highlight: true,
    },
    {
      icon: <Search className="h-6 w-6 text-green-400" />,
      title: "Search Tool Access",
      description: "Enhanced responses with real-time web search results",
    },
    {
      icon: <Star className="h-6 w-6 text-purple-400" />,
      title: "Early Supporter Badge",
      description: "Exclusive badge when the app officially launches",
    },
  ];

  if (!isMounted) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && !showSuccessModal && (
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
                onClick={onClose}
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
                  {currentStep !== "features" && (
                    <button
                      onClick={() => {
                        if (currentStep === "thankyou") {
                          onClose();
                        } else {
                          setCurrentStep("features");
                        }
                      }}
                      className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="relative flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {currentStep === "features"
                          ? "Upgrade to Premium"
                          : currentStep === "payment"
                          ? "Complete Payment"
                          : "Thank You!"}
                      </h2>
                      <p className="text-sm text-gray-300">
                        {currentStep === "features"
                          ? "Support Tuuli Chat in Alpha"
                          : currentStep === "payment"
                          ? "Choose your payment method"
                          : "Your upgrade is being processed"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {currentStep === "features" ? (
                    <div className="space-y-6">
                      {/* Alpha Notice */}
                      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-5 w-5 text-yellow-400" />
                          <span className="font-semibold text-yellow-300">
                            Alpha Supporter
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          Since Tuuli Chat is in alpha, your support gives you{" "}
                          <strong className="text-white">
                            immediate premium access
                          </strong>{" "}
                          and an{" "}
                          <strong className="text-yellow-300">
                            exclusive early supporter badge
                          </strong>{" "}
                          when we officially launch!
                        </p>
                      </div>

                      {/* Features List */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white mb-3">
                          Premium Features
                        </h3>
                        {features.map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                              feature.highlight
                                ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
                                : "bg-gray-800/30 hover:bg-gray-800/50"
                            }`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {feature.icon}
                            </div>
                            <div>
                              <h4 className="font-medium text-white">
                                {feature.title}
                              </h4>
                              <p className="text-sm text-gray-300">
                                {feature.description}
                              </p>
                              {feature.footnote && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {feature.footnote}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={() => setCurrentStep("payment")}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  ) : currentStep === "payment" ? (
                    <div className="space-y-6">
                      {/* Payment Method Tabs */}
                      <div className="flex bg-gray-800/50 rounded-xl p-1">
                        <button
                          onClick={() => setPaymentMethod("banktransfer")}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 ${
                            paymentMethod === "banktransfer"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "text-gray-400 hover:text-gray-300"
                          }`}
                        >
                          <CreditCard className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Bank Transfer
                          </span>
                        </button>
                        <button
                          onClick={() => setPaymentMethod("redeem")}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 ${
                            paymentMethod === "redeem"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "text-gray-400 hover:text-gray-300"
                          }`}
                        >
                          <Star className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Redeem Code
                          </span>
                        </button>
                      </div>

                      {/* Payment Method Content */}
                      <motion.div
                        key={paymentMethod}
                        initial={{
                          opacity: 0,
                          x: paymentMethod === "banktransfer" ? -20 : 20,
                        }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{
                          opacity: 0,
                          x: paymentMethod === "banktransfer" ? 20 : -20,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {paymentMethod === "banktransfer" ? (
                          <div className="space-y-6">
                            {/* Bank Details */}
                            <div className="space-y-3">
                              <h3 className="text-lg font-semibold text-white mb-3">
                                Transfer Details
                              </h3>

                              {/* Bank Name */}
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <label className="text-xs text-gray-400">
                                  Bank
                                </label>
                                <p className="text-white font-medium text-sm">
                                  Golomt Bank
                                </p>
                              </div>

                              {/* Account Name */}
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <label className="text-xs text-gray-400">
                                  Account Name
                                </label>
                                <p className="text-white font-medium text-sm">
                                  Tuguldur Chinzorig
                                </p>
                              </div>

                              {/* IBAN Number */}
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <label className="text-xs text-gray-400">
                                      IBAN Number
                                    </label>
                                    <p className="text-white font-medium font-mono text-sm">
                                      2015132510
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      copyToClipboard("2015132510", "account")
                                    }
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
                                  >
                                    {copiedField === "account" ? (
                                      <Check className="h-3.5 w-3.5 text-green-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Transfer Amount */}
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <label className="text-xs text-gray-400">
                                  Transfer Amount
                                </label>
                                <p className="text-white font-medium text-sm">
                                  10000₮
                                </p>
                              </div>

                              {/* Transaction Remark */}
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <label className="text-xs text-gray-400">
                                      Transaction Remark
                                    </label>
                                    <p className="text-white font-medium font-mono text-sm">
                                      {transactionRemark}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Please include this remark for faster
                                      processing
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        transactionRemark,
                                        "remark"
                                      )
                                    }
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
                                  >
                                    {copiedField === "remark" ? (
                                      <Check className="h-3.5 w-3.5 text-green-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Paid Button */}
                            <button
                              onClick={handlePaymentCompleted}
                              disabled={isSendingNotification}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
                            >
                              {isSendingNotification ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  Please Wait...
                                </>
                              ) : (
                                "I've Completed the Payment"
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Redeem Code Form */}
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={redeemCode}
                                  onChange={(e) =>
                                    setRedeemCode(e.target.value.toUpperCase())
                                  }
                                  placeholder="T6Y2R8E3W7"
                                  className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors"
                                />
                              </div>

                              {redeemError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                  <p className="text-red-400 text-sm">
                                    {redeemError}
                                  </p>
                                </div>
                              )}

                              {redeemSuccess && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                  <p className="text-green-400 text-sm">
                                    {redeemSuccess}
                                  </p>
                                </div>
                              )}

                              <button
                                onClick={handleRedeemCode}
                                disabled={!redeemCode.trim() || isRedeeming}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                {isRedeeming ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Redeeming...
                                  </>
                                ) : (
                                  "Redeem Code"
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="space-y-6 text-center"
                    >
                      {/* Success Icon */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.2,
                          duration: 0.3,
                          type: "spring",
                          stiffness: 200,
                        }}
                        className="flex justify-center"
                      >
                        <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                          <Check className="h-8 w-8 text-white" />
                        </div>
                      </motion.div>

                      {/* Thank You Message */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                        className="space-y-3"
                      >
                        <h3 className="text-2xl font-bold text-white">
                          Payment Submitted!
                        </h3>
                        <p className="text-gray-300 text-sm">
                          Thank you for supporting Tuuli Chat during our alpha
                          phase.
                        </p>
                      </motion.div>

                      {/* Upgrade Info */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                        className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Crown className="h-5 w-5 text-blue-400" />
                          <span className="font-semibold text-blue-300">
                            Account Upgrade Pending
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          We&apos;ll verify your payment and upgrade your
                          account{" "}
                          <strong className="text-white">
                            as soon as possible.
                          </strong>
                          . You&apos;ll receive a confirmation email once the
                          upgrade is complete.
                        </p>
                      </motion.div>

                      {/* Close Button */}
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                        onClick={onClose}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                      >
                        Continue Chatting
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      <RedeemSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        redeemCode={successRedeemCode}
      />
    </>
  );
};

export default UpgradeModal;
