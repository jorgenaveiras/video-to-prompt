"use client";

import { useState, useCallback } from "react";
import { VeoPromptOutput } from "@/lib/types";
import { JsonViewer } from "./JsonViewer";
import { downloadJSON, copyToClipboard } from "@/utils/helpers";

interface PromptResultProps {
  result: VeoPromptOutput;
  onNewAnalysis: () => void;
}

export function PromptResult({ result, onNewAnalysis }: PromptResultProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await copyToClipboard(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }, []);

  const handleDownload = useCallback(() => {
    downloadJSON(result, `veo-prompt-${Date.now()}.json`);
  }, [result]);

  const confidenceColor =
    result.confidence > 0.7 ? "text-green-600" : result.confidence > 0.4 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl text-white">
        <div>
          <h2 className="text-2xl font-bold">Prompt generado para Google Veo</h2>
          <p className="text-primary-100 mt-1">
            Confianza: <span className={`font-mono ${confidenceColor.replace("600", "300")}`}>
              {(result.confidence * 100).toFixed(0)}%
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleCopy(result.prompt, "prompt")}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied === "prompt" ? "¡Copiado!" : "Copiar Prompt"}
          </button>
          <button
            onClick={handleDownload}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar JSON
          </button>
          <button
            onClick={() => setShowJson(!showJson)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {showJson ? "Ocultar JSON" : "Ver JSON"}
          </button>
          <button
            onClick={onNewAnalysis}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Nuevo Analisis
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Prompt Principal</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {result.prompt.length} caracteres
            </span>
          </div>
          <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono text-sm leading-relaxed break-all">
            {result.prompt}
          </pre>
        </div>

        {result.negative_prompt && (
          <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Negative Prompt (que evitar)
            </h3>
            <pre className="whitespace-pre-wrap text-red-700 dark:text-red-300 font-mono text-sm leading-relaxed break-all">
              {result.negative_prompt}
            </pre>
          </div>
        )}

        <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Parametros Tecnicos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duracion</p>
              <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                {result.parameters.duration_seconds}s
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aspect Ratio</p>
              <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                {result.parameters.aspect_ratio}
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resolucion</p>
              <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                {result.parameters.resolution}
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">FPS</p>
              <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                {result.parameters.fps}
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Movimiento Camara</p>
              <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {result.parameters.camera_movement}
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Modelo IA</p>
              <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                {result.model_used}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Desglose Visual</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(result.breakdown).map(([key, value]) => (
              <div
                key={key}
                className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {key.replace("_", " ")}
                </p>
                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {result.alternative_prompts && result.alternative_prompts.length > 0 && (
          <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Variaciones Sugeridas
            </h3>
            <div className="space-y-3">
              {result.alternative_prompts.map((alt, i) => (
                <div
                  key={i}
                  className="p-3 bg-white dark:bg-purple-900/30 rounded-lg border border-purple-100 dark:border-purple-800"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400 font-mono text-sm">
                      {i + 1}.
                    </span>
                    <pre className="whitespace-pre-wrap text-purple-800 dark:text-purple-200 text-sm leading-relaxed break-all flex-1">
                      {alt}
                    </pre>
                    <button
                      onClick={() => handleCopy(alt, `alt-${i}`)}
                      className="text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 p-1 flex-shrink-0"
                      title="Copiar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <details className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <summary className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Metadata del video original
          </summary>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Duracion:</span>{" "}
              <span className="font-mono ml-2">{result.source_metadata.duration.toFixed(1)}s</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Resolucion:</span>{" "}
              <span className="font-mono ml-2">
                {result.source_metadata.width}x{result.source_metadata.height}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">FPS:</span>{" "}
              <span className="font-mono ml-2">{result.source_metadata.fps.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Frames analizados:</span>{" "}
              <span className="font-mono ml-2">{result.source_metadata.frames_analyzed}</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Generado:</span>{" "}
              <span className="font-mono ml-2">{new Date(result.generated_at).toLocaleString()}</span>
            </div>
          </div>
        </details>

        {showJson && <JsonViewer data={result} />}
      </div>
    </div>
  );
}