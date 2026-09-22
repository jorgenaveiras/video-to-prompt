"use client";

import { useState } from "react";
import { AnalysisHistoryItem } from "@/lib/types";
import { formatDuration } from "@/utils/helpers";
import { PromptResult } from "./PromptResult";

interface HistoryPanelProps {
  history: AnalysisHistoryItem[];
  onLoadItem: (item: AnalysisHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export function HistoryPanel({
  history,
  onLoadItem,
  onDeleteItem,
  onClearHistory,
}: HistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-medium">Sin historial aun</p>
        <p className="text-sm mt-1">Tus analisis apareceran aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Historial ({history.length})</h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
        >
          Limpiar todo
        </button>
      </div>
      {history.map((item) => (
        <div
          key={item.id}
          className={`p-4 bg-white dark:bg-gray-800 rounded-xl border transition-all ${
            expandedId === item.id
              ? "border-primary-300 dark:border-primary-700 shadow-lg shadow-primary-100/50 dark:shadow-primary-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <button
            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            className="w-full flex items-start justify-between gap-4 text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {item.video_name}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                  {formatDuration(item.video_duration)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(item.created_at).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {item.result.prompt.length} chars
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    item.result.confidence > 0.7
                      ? "text-green-500"
                      : item.result.confidence > 0.4
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {(item.result.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                expandedId === item.id ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedId === item.id && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-slide-down">
              <PromptResult result={item.result} onNewAnalysis={() => setExpandedId(null)} />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => onLoadItem(item)}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
                >
                  Cargar para editar
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-lg transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}