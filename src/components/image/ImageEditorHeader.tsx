import { motion } from "framer-motion";
import { TrashIcon } from "lucide-react";
import React from "react";

interface ImageEditorHeaderProps {
  title: string | null;
}

const ImageEditorHeader: React.FC<ImageEditorHeaderProps> = ({ title }) => {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-5 border-b border-border-primary">
      <div className="flex items-center justify-end">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            className="flex items-center gap-2 px-3 py-2 rounded bg-bg-input text-text-secondary hover:text-text-primary transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <TrashIcon size={16} />
            <span className="hidden sm:inline text-sm">Delete</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorHeader;
