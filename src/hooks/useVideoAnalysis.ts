"use client";

import { useState, useCallback, useRef } from "react";
import { extractFrames, probeVideo } from "@/lib/ffmpeg";
import { analyzeVideoFrames, analyzeSingleImage } from "@/lib/gemini";
import { buildVeoPrompt } from "@/lib/prompt-engineering";
import { VeoPromptOutput, VideoMetadata, FrameData } from "@/lib/types";
import {
  validateMediaFile,
  readFileAsBase64,
  getImageDimensions,
} from "@/utils/helpers";

export interface AnalysisState {
  status:
    | "idle"
    | "validating"
    | "extracting"
    | "analyzing"
    | "building"
    | "complete"
    | "error";
  progress: number;
  message: string;
  result?: VeoPromptOutput;
  error?: string;
  frames?: FrameData[];
  metadata?: VideoMetadata;
}

export function useVideoAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    status: "idle",
    progress: 0,
    message: "",
  });

  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (file: File) => {
    abortRef.current = new AbortController();

    setState({ status: "validating", progress: 5, message: "Validando archivo..." });
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setState({ status: "error", progress: 0, message: "", error: validation.error });
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!apiKey) {
      setState({
        status: "error",
        progress: 0,
        message: "",
        error: "Falta NEXT_PUBLIC_GEMINI_API_KEY en la configuracion",
      });
      return;
    }

    if (validation.type === "image") {
      await analyzeImage(file);
    } else {
      await analyzeVideo(file);
    }

    async function analyzeImage(imageFile: File) {
      setState({ status: "validating", progress: 10, message: "Leyendo imagen..." });

      let base64: string;
      let dims: { width: number; height: number };
      try {
        const [b64, d] = await Promise.all([
          readFileAsBase64(imageFile),
          getImageDimensions(imageFile),
        ]);
        base64 = b64;
        dims = d;
      } catch {
        setState({
          status: "error",
          progress: 0,
          message: "",
          error: "No se pudo leer la imagen",
        });
        return;
      }

      const metadata: VideoMetadata = {
        duration: 0,
        width: dims.width,
        height: dims.height,
        fps: 0,
        format: imageFile.type.split("/")[1] || "image",
        size: imageFile.size,
      };

      const frames: FrameData[] = [{ base64, timestamp: 0, index: 0 }];

      setState({
        status: "extracting",
        progress: 40,
        message: "Imagen lista para analizar",
        frames,
        metadata,
      });

      if (abortRef.current?.signal.aborted) return;

      setState({ status: "analyzing", progress: 50, message: "Analizando con IA..." });
      let analysis;
      try {
        analysis = await analyzeSingleImage(apiKey, base64, imageFile.type);
      } catch (error) {
        setState({
          status: "error",
          progress: 0,
          message: "",
          error: `Error en analisis IA: ${error instanceof Error ? error.message : "Desconocido"}`,
        });
        return;
      }

      if (abortRef.current?.signal.aborted) return;

      setState({ status: "building", progress: 85, message: "Generando prompt para Veo..." });
      const veoPrompt = buildVeoPrompt(analysis, metadata, frames.length);

      setState({
        status: "complete",
        progress: 100,
        message: "¡Completado!",
        result: veoPrompt,
        frames,
        metadata,
      });
    }

    async function analyzeVideo(videoFile: File) {
      setState({ status: "validating", progress: 10, message: "Leyendo metadatos..." });
      let metadata: VideoMetadata;
      try {
        metadata = await probeVideo(videoFile);
      } catch {
        setState({
          status: "error",
          progress: 0,
          message: "",
          error: "No se pudo leer la duracion del video",
        });
        return;
      }

      if (metadata.duration < 3 || metadata.duration > 30) {
        setState({
          status: "error",
          progress: 0,
          message: "",
          error: `Duracion invalida: ${metadata.duration.toFixed(1)}s. Debe ser entre 3 y 30 segundos`,
        });
        return;
      }

      setState({ status: "extracting", progress: 15, message: "Cargando FFmpeg..." });
      let frames: FrameData[];
      try {
        const raw = await extractFrames(videoFile, metadata, {
          maxFrames: 15,
          maxDimension: 720,
        });
        frames = raw.map((f) => ({ ...f, index: f.timestamp }));
      } catch (error) {
        setState({
          status: "error",
          progress: 0,
          message: "",
          error: `Error extrayendo frames: ${String(error)}`,
        });
        return;
      }

      if (abortRef.current?.signal.aborted) return;

      setState({
        status: "extracting",
        progress: 40,
        message: `Frames extraidos: ${frames.length}`,
        frames,
        metadata,
      });

      setState({ status: "analyzing", progress: 50, message: "Analizando con IA..." });
      let analysis;
      try {
        analysis = await analyzeVideoFrames(apiKey, frames, metadata.duration);
      } catch (error) {
        setState({
          status: "error",
          progress: 0,
          message: "",
          error: `Error en analisis IA: ${error instanceof Error ? error.message : "Desconocido"}`,
        });
        return;
      }

      if (abortRef.current?.signal.aborted) return;

      setState({ status: "building", progress: 85, message: "Generando prompt para Veo..." });
      const veoPrompt = buildVeoPrompt(analysis, metadata, frames.length);

      setState({
        status: "complete",
        progress: 100,
        message: "¡Completado!",
        result: veoPrompt,
        frames,
        metadata,
      });
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: "idle", progress: 0, message: "" });
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", progress: 0, message: "" });
  }, []);

  return { state, analyze, cancel, reset };
}