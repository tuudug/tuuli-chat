"use client";

import React, { useState } from "react";
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 w-full max-w-lg">
        {(Object.keys(categories) as CategoryName[]).map((catName) => {
          const Icon = categories[catName].icon;
          const isActive = selectedCategory === catName;
          return (
            <button
              key={catName}
              onClick={() => setSelectedCategory(catName)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
                isActive
                  ? "bg-btn-primary text-white"
                  : "bg-bg-input hover:bg-opacity-80"
              }`}
            >
              <Icon size={16} /> {catName}
            </button>
          );
        })}
      </div>
      {/* Example Questions for Selected Category */}
      <div className="space-y-3 w-full max-w-sm md:max-w-md">
        {categories[selectedCategory].questions.map((q) => (
          <button
            key={q}
            onClick={() => onExampleQuestionClick(q)}
            className="w-full text-left p-3 rounded-lg bg-bg-input hover:bg-opacity-80 text-sm"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
