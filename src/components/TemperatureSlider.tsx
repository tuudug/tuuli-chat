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
          <div className="relative w-20">
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 slider"
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
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border: 2px solid #374151;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid #374151;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider:disabled::-webkit-slider-thumb {
          background: #6b7280;
          cursor: not-allowed;
        }

        .slider:disabled::-moz-range-thumb {
          background: #6b7280;
          cursor: not-allowed;
        }
      `}</style>
    </Tooltip.Provider>
  );
};

export default TemperatureSlider;
