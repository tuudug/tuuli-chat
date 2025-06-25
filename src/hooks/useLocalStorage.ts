"use client";

import { useState, useEffect } from "react";

function getStorageValue<T>(key: string, defaultValue: T): T {
  // getting stored value
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    if (saved) {
      // Try to parse it as JSON first.
      try {
        return JSON.parse(saved) as T;
      } catch (e) {
        // If it fails, it might be a raw string from a previous version.
        // Return the raw string itself. The useEffect will handle stringifying it on the next save.
        console.warn(
          `Could not parse JSON for key "${key}". Falling back to raw value. This is expected during migration.`
        );
        return saved as T;
      }
    }
  }
  return defaultValue;
}

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
