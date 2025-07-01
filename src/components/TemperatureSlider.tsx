import React from "react";
import { motion } from "framer-motion";
import { HelpCircleIcon } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface TemperatureSliderProps {
  temperature: number;
  setTemperature: (temp: number) => void;
  disabled?: boolean;
}

const TemperatureSlider: React.FC<TemperatureSliderProps> = ({
  temperature,
  setTemperature,
  disabled = false,
}) => {
  const getTemperatureColor = (temp: number) => {
    if (temp <= 0.3) return "text-blue-400";
    if (temp <= 0.7) return "text-green-400";
    if (temp <= 1.2) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <Tooltip.Provider>
      <motion.div
        className="flex items-center gap-3 text-xs"
        animate={{ scale: disabled ? 0.95 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="temperature"
            className="text-gray-300 whitespace-nowrap font-medium"
          >
            Temperature
          </label>
          <Tooltip.Root delayDuration={0}>
            <Tooltip.Trigger asChild>
              <motion.button
                type="button"
                className="text-gray-400 hover:text-gray-300 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <HelpCircleIcon size={12} />
              </motion.button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs max-w-xs border border-gray-600 shadow-lg z-50"
                sideOffset={5}
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    Temperature controls creativity:
                  </p>
                  <p>
                    <span className="text-blue-400">0.0-0.3:</span> Focused,
                    deterministic
                  </p>
                  <p>
                    <span className="text-green-400">0.4-0.7:</span> Balanced
                    responses
                  </p>
                  <p>
                    <span className="text-yellow-400">0.8-1.2:</span> Creative,
                    varied
                  </p>
                  <p>
                    <span className="text-red-400">1.3-2.0:</span> Very
                    creative, unpredictable
                  </p>
                </div>
                <Tooltip.Arrow className="fill-gray-800" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-24 py-2 px-1">
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              onInput={(e) =>
                setTemperature(parseFloat((e.target as HTMLInputElement).value))
              }
              disabled={disabled}
              className="w-full h-4 appearance-none cursor-grab disabled:cursor-not-allowed disabled:opacity-50 slider"
              style={{
                background: "transparent",
              }}
            />
            {/* Custom track background */}
            <div
              className="absolute top-1/2 left-1 right-1 h-3 -translate-y-1/2 pointer-events-none rounded-full"
              style={{
                background: `linear-gradient(to right, 
                  rgb(59 130 246) 0%, 
                  rgb(34 197 94) 25%, 
                  rgb(234 179 8) 62.5%, 
                  rgb(239 68 68) 100%)`,
              }}
            />
          </div>

          <motion.span
            className={`font-mono ${getTemperatureColor(
              temperature
            )} w-8 text-center font-medium`}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.3 }}
            key={temperature}
          >
            {temperature.toFixed(1)}
          </motion.span>
        </div>
      </motion.div>

      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          outline: none;
          touch-action: manipulation;
          user-select: none;
        }

        .slider::-webkit-slider-track {
          height: 16px;
          background: transparent;
          border-radius: 8px;
          border: none;
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1);
          border: 2px solid #374151;
          transition: all 0.15s ease;
          position: relative;
          z-index: 10;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(0, 0, 0, 0.1);
          border-color: #4b5563;
        }

        .slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.15);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5), 0 0 0 2px #3b82f6;
          border-color: #3b82f6;
        }

        /* Firefox styles */
        .slider::-moz-range-track {
          height: 16px;
          background: transparent;
          border-radius: 8px;
          border: none;
          outline: none;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: grab;
          border: 2px solid #374151;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.15s ease;
          -moz-appearance: none;
          appearance: none;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          border-color: #4b5563;
        }

        .slider::-moz-range-thumb:active {
          cursor: grabbing;
          transform: scale(1.15);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
          border-color: #3b82f6;
        }

        .slider:disabled::-webkit-slider-thumb {
          background: #6b7280;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          border-color: #9ca3af;
        }

        .slider:disabled::-moz-range-thumb {
          background: #6b7280;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          border-color: #9ca3af;
        }

        .slider:focus {
          outline: none;
        }

        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px #3b82f6;
        }

        .slider:focus::-moz-range-thumb {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px #3b82f6;
        }
      `}</style>
    </Tooltip.Provider>
  );
};

export default TemperatureSlider;
