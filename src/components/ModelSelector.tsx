import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  StarIcon,
  CheckIcon,
  FileImageIcon,
} from "lucide-react";
import { GeminiModelId, MODEL_DETAILS } from "@/lib/types";
import { MODEL_PRICES } from "@/lib/constants";

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
  const currentPrice = MODEL_PRICES[selectedModel];

  // Group models by version
  const gemini25Models = MODEL_DETAILS.filter(
    (model) => model.version === "2.5"
  );
  const gemini20Models = MODEL_DETAILS.filter(
    (model) => model.version === "2.0"
  );

  const formatPrice = (price: number) => `$${(price * 1_000_000).toFixed(2)}`;

  const handleModelSelect = (modelId: GeminiModelId) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center justify-center rounded text-xs h-[30px] px-2 gap-1 bg-transparent text-text-secondary hover:text-text-primary focus:outline-none focus:ring-1 focus:ring-btn-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Select AI Model"
      >
        <span className="truncate max-w-[120px]">{currentModel?.name}</span>
        {currentModel?.supportsFiles && (
          <div className="relative group">
            <div className="bg-green-500/20 rounded-full p-1">
              <FileImageIcon size={10} className="text-green-500" />
            </div>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Supports attachments
            </div>
          </div>
        )}
        <ChevronDownIcon size={14} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute bottom-full left-0 mb-1 w-80 bg-bg-sidebar rounded-lg shadow-lg border border-border-primary z-50 animate-in fade-in-80 slide-in-from-bottom-5"
        >
          <div className="p-3">
            {/* Gemini 2.5 Models */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2 px-1">
                Gemini 2.5 Models
              </h3>
              <div className="space-y-1">
                {gemini25Models.map((model) => {
                  const price = MODEL_PRICES[model.id];
                  const isSelected = model.id === selectedModel;
                  const isPro = model.performance === "Pro";

                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        isSelected
                          ? "bg-btn-primary text-white border-btn-primary"
                          : "bg-bg-input border-border-primary hover:bg-bg-input/80 text-text-primary"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`font-medium text-sm ${
                                isPro && !isSelected
                                  ? "bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600"
                                  : ""
                              }`}
                            >
                              {model.name}
                            </span>
                            {model.supportsFiles && (
                              <div className="relative group">
                                <div
                                  className={`rounded-full p-1 ${
                                    isSelected
                                      ? "bg-green-300/30"
                                      : "bg-green-500/20"
                                  }`}
                                >
                                  <FileImageIcon
                                    size={12}
                                    className={`${
                                      isSelected
                                        ? "text-green-300"
                                        : "text-green-500"
                                    }`}
                                  />
                                </div>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                  Supports attachments
                                </div>
                              </div>
                            )}
                            {isSelected && <CheckIcon size={14} />}
                          </div>
                          <p
                            className={`text-xs mb-2 ${
                              isSelected
                                ? "text-white/80"
                                : "text-text-secondary"
                            }`}
                          >
                            {model.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: model.stars }).map(
                                (_, i) => (
                                  <StarIcon
                                    key={i}
                                    size={12}
                                    fill="currentColor"
                                    className={
                                      isSelected
                                        ? "text-yellow-300"
                                        : "text-yellow-400"
                                    }
                                  />
                                )
                              )}
                            </div>
                            <div
                              className={`text-xs ${
                                isSelected
                                  ? "text-white/80"
                                  : "text-text-secondary"
                              }`}
                            >
                              {formatPrice(price.input)}/M ↗{" "}
                              {formatPrice(price.output)}/M
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gemini 2.0 Models */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-2 px-1">
                Gemini 2.0 Models
              </h3>
              <div className="space-y-1">
                {gemini20Models.map((model) => {
                  const price = MODEL_PRICES[model.id];
                  const isSelected = model.id === selectedModel;

                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        isSelected
                          ? "bg-btn-primary text-white border-btn-primary"
                          : "bg-bg-input border-border-primary hover:bg-bg-input/80 text-text-primary"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {model.name}
                            </span>
                            {model.supportsFiles && (
                              <div className="relative group">
                                <div
                                  className={`rounded-full p-1 ${
                                    isSelected
                                      ? "bg-green-300/30"
                                      : "bg-green-500/20"
                                  }`}
                                >
                                  <FileImageIcon
                                    size={12}
                                    className={`${
                                      isSelected
                                        ? "text-green-300"
                                        : "text-green-500"
                                    }`}
                                  />
                                </div>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                  Supports attachments
                                </div>
                              </div>
                            )}
                            {isSelected && <CheckIcon size={14} />}
                          </div>
                          <p
                            className={`text-xs mb-2 ${
                              isSelected
                                ? "text-white/80"
                                : "text-text-secondary"
                            }`}
                          >
                            {model.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: model.stars }).map(
                                (_, i) => (
                                  <StarIcon
                                    key={i}
                                    size={12}
                                    fill="currentColor"
                                    className={
                                      isSelected
                                        ? "text-yellow-300"
                                        : "text-yellow-400"
                                    }
                                  />
                                )
                              )}
                            </div>
                            <div
                              className={`text-xs ${
                                isSelected
                                  ? "text-white/80"
                                  : "text-text-secondary"
                              }`}
                            >
                              {formatPrice(price.input)}/M ↗{" "}
                              {formatPrice(price.output)}/M
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
