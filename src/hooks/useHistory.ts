"use client";

import { useState, useEffect, useCallback } from "react";
import { AnalysisHistoryItem } from "@/lib/types";
import { generateId } from "@/utils/helpers";

const STORAGE_KEY = "video-to-prompt-history";
const MAX_HISTORY = 50;

export function useHistory() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, MAX_HISTORY));
        }
      }
    } catch (error) {
      console.error("Error loading history:", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveHistory = useCallback((newHistory: AnalysisHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory.slice(0, MAX_HISTORY)));
    } catch (error) {
      console.error("Error saving history:", error);
    }
  }, []);

  const addToHistory = useCallback(
    (item: Omit<AnalysisHistoryItem, "id" | "created_at">) => {
      const newItem: AnalysisHistoryItem = {
        ...item,
        id: generateId(),
        created_at: new Date().toISOString(),
      };
      setHistory((prev) => {
        const newHistory = [newItem, ...prev].slice(0, MAX_HISTORY);
        saveHistory(newHistory);
        return newHistory;
      });
      return newItem;
    },
    [saveHistory]
  );

  const removeFromHistory = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const newHistory = prev.filter((item) => item.id !== id);
        saveHistory(newHistory);
        return newHistory;
      });
    },
    [saveHistory]
  );

  const clearHistory = useCallback(() => {
    saveHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, [saveHistory]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    mounted,
  };
}