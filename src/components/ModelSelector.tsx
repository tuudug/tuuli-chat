import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDownIcon,
  StarIcon,
  FileImageIcon,
  ChevronUpIcon,
  SearchIcon,
  ChevronRightIcon,
  BrainIcon,
  ZapIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";
import GeminiIcon from "@/components/icons/GeminiIcon";
import { GeminiModelId, MODEL_DETAILS } from "@/types";

interface ModelSelectorProps {
  selectedModel: GeminiModelId;
  setSelectedModel: (model: GeminiModelId) => void;
  disabled?: boolean;
  favoriteModel: GeminiModelId | null;
  onSetFavoriteModel: (modelId: GeminiModelId) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  setSelectedModel,
  disabled = false,
  favoriteModel,
  onSetFavoriteModel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLegacyModels, setShowLegacyModels] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [modalModel, setModalModel] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

    // Only close on outside click if the popover is open and the mobile info modal is not
    if (isOpen && !modalModel) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, modalModel]);

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

  const handleModelSelect = (modelId: GeminiModelId) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  const handleFavoriteClick = (e: React.MouseEvent, modelId: GeminiModelId) => {
    e.stopPropagation();
    onSetFavoriteModel(modelId);
  };

  const handleInfoClick = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    setModalModel(modelId);
  };

  const handleMouseEnter = (modelId: string, event: React.MouseEvent) => {
    if (isMobile) return; // Don't show hover tooltips on mobile

    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right + 8,
      y: rect.top,
    });
    setHoveredModel(modelId);
  };

  const handleMouseLeave = () => {
    if (isMobile) return; // Don't handle mouse leave on mobile
    setHoveredModel(null);
  };

  const getModelDisplayName = (model: (typeof MODEL_DETAILS)[0]) => {
    return model.name.replace("Gemini ", "");
  };

  const getModelTooltipContent = (model: (typeof MODEL_DETAILS)[0]) => {
    switch (model.id) {
      case "gemini-2.5-pro":
        return {
          bestFor: ["Complex reasoning", "Advanced coding", "Multimodal tasks"],
          useCases: [
            "Difficult code problems",
            "Math & STEM challenges",
            "Deep analysis",
          ],
          icon: BrainIcon,
        };
      case "gemini-2.5-flash":
        return {
          bestFor: ["Fast responses", "Smart reasoning", "Code & math"],
          useCases: [
            "Quick development",
            "Intermediate problems",
            "Daily coding",
          ],
          icon: ZapIcon,
        };
      case "gemini-2.5-flash-lite-preview-06-17":
        return {
          bestFor: ["Speed", "High volume", "Simple tasks"],
          useCases: ["Data processing", "Translation", "Summarization"],
          icon: ZapIcon,
        };
      case "gemini-2.0-flash":
        return {
          useCases: [
            "General conversations",
            "Legacy workflows",
            "Budget-conscious tasks",
          ],
          icon: ZapIcon,
        };
      case "gemini-2.0-flash-lite":
        return {
          useCases: [
            "Simple queries",
            "Content moderation",
            "Basic automation",
          ],
          icon: ZapIcon,
        };
      default:
        return null;
    }
  };

  const renderModelOption = (model: (typeof MODEL_DETAILS)[0]) => {
    const isSelected = model.id === selectedModel;
    const isPro = model.performance === "Pro";
    const isFavorite = model.id === favoriteModel;
    const tooltipContent = getModelTooltipContent(model);

    return (
      <div key={model.id} className="relative">
        <button
          onClick={() => handleModelSelect(model.id)}
          onMouseEnter={(e) => handleMouseEnter(model.id, e)}
          onMouseLeave={handleMouseLeave}
          className={`w-full text-left p-2.5 rounded-lg border transition-all duration-75 ${
            isSelected
              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-white"
              : "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 text-gray-200"
          }`}
        >
          <div
            className={`flex items-center justify-between ${
              isMobile ? "pr-16" : "pr-6"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <GeminiIcon
                    width={16}
                    height={16}
                    className="flex-shrink-0"
                  />
                  <span
                    className={`font-medium text-sm ${
                      isPro && !isSelected
                        ? "bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400"
                        : ""
                    }`}
                  >
                    {getModelDisplayName(model)}
                  </span>
                  {model.cost > 1 && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 font-semibold px-1.5 py-0.5 rounded-md border border-yellow-500/30">
                      {model.cost}x Msgs
                    </span>
                  )}
                </div>

                {/* Support Tags */}
                <div className="flex items-center gap-1">
                  {model.supportsFiles && (
                    <div className="relative">
                      <div
                        className={`rounded-full p-0.5 ${
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
                    </div>
                  )}
                  {model.supportsSearch && (
                    <div className="relative">
                      <div
                        className={`rounded-full p-0.5 ${
                          isSelected ? "bg-blue-400/30" : "bg-blue-500/20"
                        }`}
                      >
                        <SearchIcon
                          size={10}
                          className={`${
                            isSelected ? "text-blue-300" : "text-blue-400"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                  {model.supportsFast && (
                    <div className="relative">
                      <div
                        className={`rounded-full p-0.5 ${
                          isSelected ? "bg-purple-400/30" : "bg-purple-500/20"
                        }`}
                      >
                        <ZapIcon
                          size={10}
                          className={`${
                            isSelected ? "text-purple-300" : "text-purple-400"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* Info Button for Mobile */}
        {isMobile && tooltipContent && (
          <button
            onClick={(e) => handleInfoClick(e, model.id)}
            className="absolute top-1/2 right-8 -translate-y-1/2 p-1 rounded-full transition-all duration-100 hover:scale-110 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10"
            aria-label="Model information"
          >
            <InfoIcon size={12} />
          </button>
        )}

        {/* Favorite Star */}
        <button
          onClick={(e) => handleFavoriteClick(e, model.id)}
          className={`absolute top-1/2 right-2 -translate-y-1/2 p-1 rounded-full transition-all duration-100 hover:scale-110 ${
            isFavorite
              ? "text-yellow-400 hover:text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20"
              : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
          }`}
          aria-label={isFavorite ? "Unfavorite model" : "Favorite model"}
        >
          <StarIcon
            size={12}
            fill={isFavorite ? "currentColor" : "none"}
            className="transition-all duration-100"
          />
        </button>
      </div>
    );
  };

  // Render mobile modal
  const renderMobileModal = () => {
    if (!modalModel) return null;

    const model = MODEL_DETAILS.find((m) => m.id === modalModel);
    if (!model) return null;

    const tooltipContent = getModelTooltipContent(model);
    if (!tooltipContent) return null;

    return createPortal(
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onClick={(e) => {
          e.stopPropagation();
          setModalModel(null);
        }}
      >
        <div
          className="bg-gray-900/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-xl w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <tooltipContent.icon size={16} className="text-blue-400" />
                <span className="font-medium text-white text-xs">
                  {model.name}
                </span>
              </div>
              <button
                onClick={() => setModalModel(null)}
                className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
              >
                <XIcon size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {tooltipContent.bestFor && (
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2">
                    Best for:
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {tooltipContent.bestFor.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-medium text-gray-300 mb-2">
                  Use cases:
                </h4>
                <div className="space-y-1">
                  {tooltipContent.useCases.map((useCase, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-gray-400 flex items-center gap-2"
                    >
                      <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                      {useCase}
                    </div>
                  ))}
                </div>
              </div>

              {/* Capabilities */}
              {(model.supportsFiles ||
                model.supportsSearch ||
                model.supportsFast) && (
                <div className="pt-2 border-t border-gray-700/50">
                  <h4 className="text-xs font-medium text-gray-300 mb-2">
                    Capabilities:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {model.supportsFiles && (
                      <div className="flex items-center gap-1">
                        <FileImageIcon size={10} className="text-green-400" />
                        <span className="text-xs text-green-400">Files</span>
                      </div>
                    )}
                    {model.supportsSearch && (
                      <div className="flex items-center gap-1">
                        <SearchIcon size={10} className="text-blue-400" />
                        <span className="text-xs text-blue-400">Search</span>
                      </div>
                    )}
                    {model.supportsFast && (
                      <div className="flex items-center gap-1">
                        <ZapIcon size={10} className="text-purple-400" />
                        <span className="text-xs text-purple-400">Fast</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Render tooltip using portal (desktop only)
  const renderTooltip = () => {
    if (!hoveredModel || !isOpen || isMobile) return null;

    const model = MODEL_DETAILS.find((m) => m.id === hoveredModel);
    if (!model) return null;

    const tooltipContent = getModelTooltipContent(model);
    if (!tooltipContent) return null;

    return createPortal(
      <div
        className="fixed w-72 bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-xl z-[100] pointer-events-none transition-all duration-75"
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
        }}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <tooltipContent.icon size={16} className="text-blue-400" />
              <span className="font-medium text-white text-xs">
                {model.name}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {tooltipContent.bestFor && (
              <div>
                <h4 className="text-xs font-medium text-gray-300 mb-1">
                  Best for:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {tooltipContent.bestFor.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-medium text-gray-300 mb-1">
                Use cases:
              </h4>
              <div className="space-y-0.5">
                {tooltipContent.useCases.map((useCase, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-gray-400 flex items-center gap-1"
                  >
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    {useCase}
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            {(model.supportsFiles ||
              model.supportsSearch ||
              model.supportsFast) && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-700/50">
                {model.supportsFiles && (
                  <div className="flex items-center gap-1">
                    <FileImageIcon size={10} className="text-green-400" />
                    <span className="text-xs text-green-400">Files</span>
                  </div>
                )}
                {model.supportsSearch && (
                  <div className="flex items-center gap-1">
                    <SearchIcon size={10} className="text-blue-400" />
                    <span className="text-xs text-blue-400">Search</span>
                  </div>
                )}
                {model.supportsFast && (
                  <div className="flex items-center gap-1">
                    <ZapIcon size={10} className="text-purple-400" />
                    <span className="text-xs text-purple-400">Fast</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
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

        @keyframes slideDown {
          from {
            max-height: 0;
            opacity: 0;
          }
          to {
            max-height: 200px;
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            max-height: 200px;
            opacity: 1;
          }
          to {
            max-height: 0;
            opacity: 0;
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 10px;
          border: 1px solid transparent;
          background-clip: content-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.5);
        }
      `}</style>
      <div className="relative">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-lg text-xs h-[32px] px-3 gap-1.5 bg-gray-800/50 border border-gray-700/50 text-white hover:bg-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-75"
          aria-label="Select AI Model"
        >
          <GeminiIcon width={14} height={14} className="flex-shrink-0" />
          <span className="font-medium whitespace-nowrap">
            {currentModel ? getModelDisplayName(currentModel) : "Select Model"}
          </span>
          <div className="flex items-center gap-1">
            {currentModel?.supportsFiles && (
              <div className="bg-green-500/20 rounded-full p-0.5">
                <FileImageIcon size={10} className="text-green-400" />
              </div>
            )}
            {currentModel?.supportsSearch && (
              <div className="bg-blue-500/20 rounded-full p-0.5">
                <SearchIcon size={10} className="text-blue-400" />
              </div>
            )}
            {currentModel?.supportsFast && (
              <div className="bg-purple-500/20 rounded-full p-0.5">
                <ZapIcon size={10} className="text-purple-400" />
              </div>
            )}
          </div>
          {isOpen ? (
            <ChevronUpIcon
              size={14}
              className="transition-transform duration-75"
            />
          ) : (
            <ChevronDownIcon
              size={14}
              className="transition-transform duration-75"
            />
          )}
        </button>

        {/* Backdrop and Popover */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={popoverRef}
              className="absolute bottom-full left-0 mb-2 w-72 z-50"
              style={{ animation: "slideInFromBottom 100ms ease-out" }}
            >
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg">
                <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <h3 className="text-sm font-semibold text-white mb-3 text-center">
                    Select Model
                  </h3>

                  {/* Gemini 2.5 Models */}
                  <div className="space-y-1.5 mb-3">
                    {gemini25Models.map(renderModelOption)}
                  </div>

                  {/* Legacy Models Toggle */}
                  <button
                    onClick={() => setShowLegacyModels(!showLegacyModels)}
                    className="w-full flex items-center justify-between py-2 px-1 text-gray-400 hover:text-gray-200 transition-all duration-75 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-full h-px bg-gray-700/50"></div>
                      <span className="text-xs font-medium whitespace-nowrap">
                        Legacy Models (2.0)
                      </span>
                      <div className="w-full h-px bg-gray-700/50"></div>
                    </div>
                    <ChevronRightIcon
                      size={12}
                      className={`transition-transform duration-100 ml-2 group-hover:text-gray-300 ${
                        showLegacyModels ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* Gemini 2.0 Models - Collapsible */}
                  <div
                    className={`overflow-hidden transition-all duration-150 ease-in-out ${
                      showLegacyModels
                        ? "max-h-40 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="space-y-1.5 pt-1">
                      {gemini20Models.map(renderModelOption)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Render tooltip using portal */}
        {renderTooltip()}
      </div>

      {/* Render mobile modal */}
      {renderMobileModal()}
    </>
  );
};

export default ModelSelector;
