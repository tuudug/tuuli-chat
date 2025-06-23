import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  StarIcon,
  CheckIcon,
  FileImageIcon,
  ChevronUpIcon,
} from "lucide-react";
import { GeminiModelId, MODEL_DETAILS } from "@/lib/types";
import { MODEL_MULTIPLIERS } from "@/lib/constants";

interface ModelSelectorProps {
  selectedModel: GeminiModelId;
  setSelectedModel: (model: GeminiModelId) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  setSelectedModel,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Get current model details
  const currentModel = MODEL_DETAILS.find(
    (model) => model.id === selectedModel
  );

  // Group models by version
  const gemini25Models = MODEL_DETAILS.filter(
    (model) => model.version === "2.5"
  );
  const gemini20Models = MODEL_DETAILS.filter(
    (model) => model.version === "2.0"
  );

  const formatMultiplier = (multiplier: number) => {
    if (multiplier === 1.0) return "1x sparks";
    if (multiplier < 1.0) return `${multiplier}x sparks`;
    return `${multiplier}x sparks`;
  };

  const handleModelSelect = (modelId: GeminiModelId) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  const renderModelOption = (model: (typeof MODEL_DETAILS)[0]) => {
    const multiplier = MODEL_MULTIPLIERS[model.id];
    const isSelected = model.id === selectedModel;
    const isPro = model.performance === "Pro";

    return (
      <button
        key={model.id}
        onClick={() => handleModelSelect(model.id)}
        className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
          isSelected
            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-white"
            : "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 text-gray-200"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`font-medium text-sm ${
                  isPro && !isSelected
                    ? "bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400"
                    : ""
                }`}
              >
                {model.name}
              </span>
              {model.supportsFiles && (
                <div className="relative group">
                  <div
                    className={`rounded-full p-1 ${
                      isSelected ? "bg-green-400/30" : "bg-green-500/20"
                    }`}
                  >
                    <FileImageIcon
                      size={10}
                      className={`${
                        isSelected ? "text-green-300" : "text-green-400"
                      }`}
                    />
                  </div>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Supports files
                  </div>
                </div>
              )}
              {isSelected && <CheckIcon size={14} className="text-blue-400" />}
            </div>
            <p
              className={`text-xs mb-2 ${
                isSelected ? "text-gray-300" : "text-gray-400"
              }`}
            >
              {model.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: model.stars }).map((_, i) => (
                  <StarIcon
                    key={i}
                    size={12}
                    fill="currentColor"
                    className={
                      isSelected ? "text-yellow-300" : "text-yellow-400"
                    }
                  />
                ))}
              </div>
              <div className="flex items-center space-x-1">
                <div
                  className={`text-xs px-2 py-0.5 rounded ${
                    isSelected
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {formatMultiplier(multiplier)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(
            156,
            163,
            175,
            0.3
          ); /* gray-400 with opacity */
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(
            156,
            163,
            175,
            0.5
          ); /* gray-400 with more opacity on hover */
        }
      `}</style>
      <div className="relative">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-lg text-xs h-[32px] px-3 gap-1.5 bg-gray-800/50 border border-gray-700/50 text-white hover:bg-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          aria-label="Select AI Model"
        >
          <span className="font-medium whitespace-nowrap">
            {currentModel?.name}
          </span>
          {currentModel?.supportsFiles && (
            <div className="relative group">
              <div className="bg-green-500/20 rounded-full p-0.5">
                <FileImageIcon size={10} className="text-green-400" />
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Supports files
              </div>
            </div>
          )}
          {isOpen ? (
            <ChevronUpIcon
              size={14}
              className="transition-transform duration-150"
            />
          ) : (
            <ChevronDownIcon
              size={14}
              className="transition-transform duration-150"
            />
          )}
        </button>

        {/* Backdrop and Popover */}
        {isOpen && (
          <>
            {/* Invisible backdrop to close when clicking outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={popoverRef}
              className="absolute bottom-full left-0 mb-2 w-80 z-50"
              style={{
                animation: "slideInFromBottom 150ms ease-out",
              }}
            >
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg">
                <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {/* Model Selector Title */}
                  <h3 className="text-sm font-semibold text-white mb-4 text-center">
                    Model Selection
                  </h3>

                  {/* Gemini 2.5 Models */}
                  <div className="space-y-2 mb-3">
                    {gemini25Models.map(renderModelOption)}
                  </div>

                  {/* Subtle Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700/50"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-gray-900/95 px-2 text-gray-500">
                        •
                      </span>
                    </div>
                  </div>

                  {/* Gemini 2.0 Models */}
                  <div className="space-y-2">
                    {gemini20Models.map(renderModelOption)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ModelSelector;
