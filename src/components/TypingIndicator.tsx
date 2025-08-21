import React from "react";
import { motion } from "framer-motion";

const TypingIndicator: React.FC = () => {
  return (
    <div className="group flex items-start gap-3 justify-start px-2 sm:px-0">
      {/* Hidden avatar to maintain spacing */}
      <div className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center flex-shrink-0 opacity-0"></div>

      <div className="flex flex-col w-full max-w-[calc(100vw-1rem)] sm:max-w-[75%] items-start">
        <div className="p-3 rounded-lg text-text-primary">
          <div className="flex gap-1" aria-label="Assistant is typing">
            <span className="sr-only">Assistant is typing</span>
            <motion.div
              className="w-2 h-2 bg-text-accent rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0,
              }}
            />
            <motion.div
              className="w-2 h-2 bg-text-accent rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.2,
              }}
            />
            <motion.div
              className="w-2 h-2 bg-text-accent rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.4,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
