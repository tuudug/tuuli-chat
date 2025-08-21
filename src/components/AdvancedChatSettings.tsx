"use client";

import React, { useState } from "react";
import { SettingsIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
  ChatSettings,
  ResponseLengthSetting,
  ToneSetting,
  FocusModeSetting,
  ExplanationStyleSetting,
} from "@/types/settings";
// TemperatureSlider removed - temperature is now hardcoded to 0.9

interface AdvancedChatSettingsProps {
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  disabled?: boolean;
}

const AdvancedChatSettings: React.FC<AdvancedChatSettingsProps> = ({
  settings,
  onSettingsChange,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateSetting = <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const SettingGroup: React.FC<{
    title: string;
    children: React.ReactNode;
  }> = ({ title, children }) => (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const RadioGroup: React.FC<{
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }> = ({ label, value, options, onChange }) => (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-300">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed ${
              value === option.value
                ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-white"
                : "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 text-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Temperature update function removed - temperature is now hardcoded to 0.9

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
      `}</style>
      <div className="relative">
        {/* Settings Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-lg text-xs h-[32px] px-3 gap-1.5 bg-gray-800/50 border border-gray-700/50 text-white hover:bg-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-75"
          aria-label="Advanced Settings"
        >
          <SettingsIcon size={14} className="flex-shrink-0" />
          <span className="font-medium whitespace-nowrap hidden sm:inline">
            Settings
          </span>
          {isExpanded ? (
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

        {/* Backdrop and Settings Panel */}
        {isExpanded && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
            />
            <div
              className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] z-50"
              style={{ animation: "slideInFromBottom 100ms ease-out" }}
            >
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg">
                <div className="p-3 max-h-[60vh] overflow-y-auto">
                  <h3 className="text-sm font-semibold text-white mb-3 text-center">
                    Advanced Settings
                  </h3>
                  <div className="space-y-4">
                    {/* Response Style Section */}
                    <SettingGroup title="Response Style">
                      <RadioGroup
                        label="Length"
                        value={settings.responseLength}
                        options={[
                          { value: "brief", label: "Brief" },
                          { value: "detailed", label: "Detailed" },
                        ]}
                        onChange={(value) =>
                          updateSetting(
                            "responseLength",
                            value as ResponseLengthSetting
                          )
                        }
                      />

                      <RadioGroup
                        label="Tone"
                        value={settings.tone}
                        options={[
                          { value: "formal", label: "Formal" },
                          { value: "casual", label: "Casual" },
                        ]}
                        onChange={(value) =>
                          updateSetting("tone", value as ToneSetting)
                        }
                      />
                    </SettingGroup>

                    {/* Advanced Options Section */}
                    <SettingGroup title="Advanced Options">
                      <RadioGroup
                        label="Focus Mode"
                        value={settings.focusMode}
                        options={[
                          { value: "balanced", label: "Balanced" },
                          { value: "creative", label: "Creative" },
                          { value: "analytical", label: "Analytical" },
                        ]}
                        onChange={(value) =>
                          updateSetting("focusMode", value as FocusModeSetting)
                        }
                      />

                      <RadioGroup
                        label="Explanation Style"
                        value={settings.explanationStyle}
                        options={[
                          { value: "direct", label: "Direct" },
                          { value: "step-by-step", label: "Step-by-step" },
                          { value: "examples", label: "Examples" },
                        ]}
                        onChange={(value) =>
                          updateSetting(
                            "explanationStyle",
                            value as ExplanationStyleSetting
                          )
                        }
                      />
                    </SettingGroup>
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

export default AdvancedChatSettings;
