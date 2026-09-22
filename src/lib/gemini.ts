import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiAnalysis } from "./types";

const MODEL_ORDER = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 429 || status === 503 || status === 500;
}

export function getGeminiModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL_ORDER[0] });
}

const ANALYSIS_PROMPT = `Analiza esta secuencia de frames de un video.
Describe EXACTAMENTE lo que ves para que otro modelo de generacion de video pueda recrearlo.

DEVUELVE UNICAMENTE UN JSON VALIDO con esta estructura exacta:
{
  "subject": "descripcion detallada del sujeto principal (persona, objeto, animal, etc.)",
  "action": "que esta haciendo, movimiento especifico, expresion, gesto",
  "environment": "ubicacion, fondo, elementos contextuales, clima, hora del dia",
  "lighting": "tipo de luz (natural, artificial, mixta), direccion, calidad (suave, dura), temperatura de color",
  "style": "estilo visual: photorealistic, cinematic, anime, 3d render, cartoon, documentary, vintage, etc.",
  "color_palette": "colores dominantes, temperatura (calida/fria), contraste, saturacion",
  "mood": "atmosfera emocional: alegre, tenso, misterioso, tranquilo, epico, intimo, etc.",
  "camera_angle": "angulo: low angle, high angle, eye-level, dutch angle, aerial, close-up, wide shot, etc.",
  "camera_movement": "static, pan left, pan right, tilt up, tilt down, zoom in, zoom out, tracking, handheld, dolly, crane",
  "transitions": "cortes visibles, transiciones, efectos de edicion",
  "text_elements": "texto visible en pantalla (titulos, carteles, UI, subtitulos)",
  "audio_cues": "elementos que sugieren sonido: bocas moviendose, instrumentos, efectos visuales de audio, etc."
}

REGLAS IMPORTANTES:
- Se ESPECIFICO y VISUAL. Evita interpretaciones abstractas.
- Describe lo que SE VE, no lo que se infiere.
- Si hay multiples sujetos, describe el principal y menciona los secundarios.
- Incluye detalles de textura, materiales, ropa, objetos.
- La duracion del video es de 3-30 segundos.
- NO anadas campos extra. NO uses markdown. SOLO JSON.`;

export async function analyzeVideoFrames(
  apiKey: string,
  frames: Array<{ base64: string; timestamp: number }>,
  videoDuration: number
): Promise<GeminiAnalysis> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const imageParts = frames.map((frame) => ({
    inlineData: {
      mimeType: "image/png",
      data: frame.base64,
    },
  }));

  const prompt = `${ANALYSIS_PROMPT}

Duracion del video: ${videoDuration.toFixed(1)} segundos.
Frames analizados: ${frames.length} (uno cada ~${(videoDuration / Math.max(frames.length, 1)).toFixed(1)}s).`;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    for (let mi = 0; mi < MODEL_ORDER.length; mi++) {
      const modelName = MODEL_ORDER[mi];
      const model = genAI.getGenerativeModel({ model: modelName });
      try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No se encontro JSON valido en la respuesta");
        }

        const analysis = JSON.parse(jsonMatch[0]) as GeminiAnalysis;
        return analysis;
      } catch (error) {
        lastError = error;
        console.warn(
          `Gemini ${modelName}: intento ${attempt + 1}, error:`,
          error instanceof Error ? error.message : error
        );
        if (isRetryable(error)) {
          continue;
        }
        throw new Error(
          `Error en analisis IA: ${error instanceof Error ? error.message : "Desconocido"}`
        );
      }
    }
    if (attempt < MAX_RETRIES - 1) {
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw lastError instanceof Error
    ? new Error(`Error en analisis IA: ${lastError.message}`)
    : new Error("Error en analisis IA: Desconocido");
}

export function validateAnalysis(analysis: unknown): analysis is GeminiAnalysis {
  if (!analysis || typeof analysis !== "object") return false;
  const required = [
    "subject",
    "action",
    "environment",
    "lighting",
    "style",
    "color_palette",
    "mood",
    "camera_angle",
    "camera_movement",
    "transitions",
    "text_elements",
    "audio_cues",
  ];
  return required.every(
    (key) =>
      key in analysis &&
      typeof (analysis as Record<string, unknown>)[key] === "string"
  );
}