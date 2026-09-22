"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useVideoAnalysis } from "@/hooks/useVideoAnalysis";
import { FramePreview } from "./FramePreview";
import { PromptResult } from "./PromptResult";
import { VeoPromptOutput } from "@/lib/types";
import { formatFileSize } from "@/utils/helpers";

interface VideoUploadProps {
  onAnalyzeComplete?: (result: VeoPromptOutput) => void;
}

const MAX_RECORD_SECONDS = 30;
const MIN_RECORD_SECONDS = 3;

export function VideoUpload({ onAnalyzeComplete }: VideoUploadProps) {
  const { state, analyze, cancel, reset } = useVideoAnalysis();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastNotifiedResultRef = useRef<VeoPromptOutput | null>(null);

  useEffect(() => {
    if (state.status === "complete" && state.result && state.result !== lastNotifiedResultRef.current) {
      lastNotifiedResultRef.current = state.result;
      onAnalyzeComplete?.(state.result);
    }
  }, [state, onAnalyzeComplete]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
  }, [videoUrl]);

  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(file));
      reset();
    },
    [videoUrl, reset]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleCameraClick = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("No se pudo acceder a la camara. Verifica los permisos.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setShowCamera(false);
    setIsRecording(false);
    setRecordedTime(0);
  }, []);

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    try {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType });
    } catch {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
    }
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });
      stopCamera();
      handleFileSelect(file);
    };
    mediaRecorderRef.current.start(500);
    setIsRecording(true);
    setRecordedTime(0);
    recordTimerRef.current = setInterval(
      () =>
        setRecordedTime((t) => {
          if (t + 1 >= MAX_RECORD_SECONDS) {
            stopRecording();
            return MAX_RECORD_SECONDS;
          }
          return t + 1;
        }),
      1000
    );
    autoStopRef.current = setTimeout(stopRecording, MAX_RECORD_SECONDS * 1000);
  }, [handleFileSelect, stopCamera, stopRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const canAnalyze = !!selectedFile && ["idle", "error"].includes(state.status);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          state.status === "extracting" || state.status === "analyzing"
            ? "border-primary-400 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20"
            : "border-gray-300 hover:border-primary-400 dark:border-gray-600 dark:hover:border-primary-500"
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          disabled={state.status !== "idle" && state.status !== "error"}
        />

        {showCamera ? (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                  <span className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
                  <span className="font-mono font-bold">{formatTime(recordedTime)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  Iniciar Grabacion (max 30s)
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Detener y Analizar
                </button>
              )}
              <button
                onClick={stopCamera}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Graba entre {MIN_RECORD_SECONDS} y {MAX_RECORD_SECONDS} segundos. Se detendra
              automaticamente al llegar al limite.
            </p>
          </div>
        ) : (
          <>
            {!selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Seleccionar Video
                  </button>
                  <button
                    onClick={handleCameraClick}
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Grabar con Camara
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  O arrastra y suelta tu video aqui (MP4, WebM, MOV, AVI, MKV - Max 100MB - 3-30s)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video max-h-96 bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoUrl || undefined}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {selectedFile.name} - {formatFileSize(selectedFile.size)}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (videoUrl) URL.revokeObjectURL(videoUrl);
                      setVideoUrl(null);
                      reset();
                    }}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                  >
                    Cambiar video
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {state.status !== "idle" &&
        state.status !== "error" &&
        state.status !== "complete" && (
          <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">
                {state.status === "validating" && "Validando video..."}
                {state.status === "extracting" && "Extrayendo frames..."}
                {state.status === "analyzing" && "Analizando con IA..."}
                {state.status === "building" && "Generando prompt..."}
              </span>
              <button
                onClick={cancel}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{state.message}</p>
          </div>
        )}

      {state.status === "error" && (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">Error</p>
              <p className="text-red-700 dark:text-red-300 mt-1">{state.error}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="mt-4 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {state.frames && state.frames.length > 0 && (
        <FramePreview frames={state.frames} metadata={state.metadata} />
      )}

      {state.result && <PromptResult result={state.result} onNewAnalysis={reset} />}

      {canAnalyze && selectedFile && !showCamera && (
        <button
          onClick={() => analyze(selectedFile)}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-3"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z" />
          </svg>
          Analizar Video y Generar Prompt
        </button>
      )}
    </div>
  );
}