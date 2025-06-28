"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { categories, CategoryName } from "@/lib/chat-categories";

interface NewChatSuggestionsProps {
  onExampleQuestionClick: (question: string) => void;
}

export default function NewChatSuggestions({
  onExampleQuestionClick,
}: NewChatSuggestionsProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryName>("Math");

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center text-text-primary">
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {(Object.keys(categories) as CategoryName[]).map((catName, index) => {
          const Icon = categories[catName].icon;
          const isActive = selectedCategory === catName;
          return (
            <motion.button
              key={catName}
              onClick={() => setSelectedCategory(catName)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                isActive
                  ? "bg-btn-primary text-white"
                  : "bg-bg-input hover:bg-opacity-80"
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={16} /> {catName}
            </motion.button>
          );
        })}
      </motion.div>
      {/* Example Questions for Selected Category */}
      <div className="space-y-3 w-full max-w-sm md:max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {categories[selectedCategory].questions.map((q, index) => (
              <motion.button
                key={q}
                onClick={() => onExampleQuestionClick(q)}
                className="w-full text-left p-3 rounded-lg bg-bg-input hover:bg-opacity-80 text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.99 }}
              >
                {q}
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
