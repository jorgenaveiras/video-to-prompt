import { GoogleGenerativeAI, Part, GenerateContentRequest } from "@google/generative-ai";
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

export function getGeminiModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL_ORDER[0] });
}

const FIDELITY_RULES = `
REGLAS DE FIDELIDAD (CRITICAS):
- Describe SOLO lo que es VISIBLE en el material original. JAMAS inventes, infieras ni generalices detalles que no aparecen.
- Cuenta EXACTAMENTE la cantidad de personas, animales u objetos. Ej: "dos mujeres adultas", no "unas personas".
- Describe la composicion espacial exacta: posicion en el encuadre (izquierda, centro, derecha), primer plano vs fondo, escala y proporciones.
- Cita TEXTUALMENTE cualquier texto, logo, letrero o palabra visible, con su color y tipografia si es distinguible.
- Se especifico con colores (o matices exactos), texturas, materiales, ropa, accesorios, peinados, rasgos fisicos y expresiones faciales.
- Describe el fondo completo, no solo el sujeto: muebles, objetos, ambiente, horizonte, arquitectura.
- No uses adjetivos vagos como "bonito", "moderno", "bonito paisaje". Usa descripciones concretas y verificables.
- Si hay incertidumbre sobre un detalle, declara lo que ves con seguridad y omite lo que no ves.
- La relacion del sujeto con el entorno (distancia, interaccion, perspectiva) debe quedar explicita.`;

const ANALYSIS_PROMPT = `Analiza esta secuencia de frames de un video REAL.
Tu tarea es producir una descripcion EXTREMADAMENTE FIEL y literal de lo que ves, como si debieras recrear el plano exacto con un generador de video. El resultado alimenta la creacion de un prompt; por eso la fidelidad es mas importante que el estilo literario.

${FIDELITY_RULES}

DEVUELVE UNICAMENTE UN JSON VALIDO con esta estructura exacta:
{
  "subject": "descripcion detallada del sujeto principal, incluyendo cantidad exacta, apariencia fisica, ropa, accesorios y posicion en el encuadre",
  "action": "accion especifica y movimiento, ritmo, velocidad, direccion, expresion o gesto exacto",
  "environment": "ubicacion, fondo completo, elementos contextuales, clima, hora del dia, objetos presentes y su disposicion",
  "lighting": "tipo de luz (natural, artificial, mixta), direccion, calidad (suave, dura), temperatura de color, horas del dia si es relevante",
  "style": "estilo visual exacto del material: photorealistic, cinematic, anime, 3d render, cartoon, documentary, vintage, film stock, etc.",
  "color_palette": "colores dominantes reales con matices indicados, temperatura (calida/fria), contraste, saturacion del material original",
  "mood": "atmosfera emocional real: alegre, tenso, misterioso, tranquilo, epico, intimo, etc.",
  "camera_angle": "angulo: low angle, high angle, eye-level, dutch angle, aerial, close-up, wide shot, etc.",
  "camera_movement": "static, pan left, pan right, tilt up, tilt down, zoom in, zoom out, tracking, handheld, dolly, crane",
  "transitions": "cortes visibles, transiciones, efectos de edicion presentes en el video",
  "text_elements": "texto EXACTO visible en pantalla (titulos, carteles, UI, subtitulos) citado textualmente, con posicion y color",
  "audio_cues": "solo si hay indicios visuales de sonido: bocas moviendose, instrumentos, parlantes, efectos visuales de audio"
}

REGLAS DEL FORMATO:
- Se ESPECIFICO y VISUAL. Fidelidad absoluta al material original.
- Si son multiples sujetos, describe el principal con detalle exacto y menciona secundarios con su numero exacto.
- NO anadas campos extra. NO uses markdown. SOLO JSON.`;

const IMAGE_ANALYSIS_PROMPT = `Analiza esta imagen estatica (foto o ilustracion).
Tu tarea es producir una descripcion EXTREMADAMENTE FIEL y literal de lo que ves, como si debieras recrear exactamente esta misma imagen con otro generador de imagenes o video.

${FIDELITY_RULES}

DEVUELVE UNICAMENTE UN JSON VALIDO con esta estructura exacta:
{
  "subject": "descripcion detallada del sujeto principal, incluyendo cantidad exacta, apariencia fisica, ropa, accesorios y posicion en el encuadre",
  "action": "accion o pose exacta del sujeto, expresion facial, gesto, postura. Si no hay accion, describe la pose estatica",
  "environment": "ubicacion, fondo completo, elementos contextuales, objetos presentes y su disposicion, hora del dia",
  "lighting": "tipo de luz (natural, artificial, mixta), direccion, calidad (suave, dura), temperatura de color",
  "style": "estilo visual exacto de la imagen: photorealistic, cinematic, anime, 3d render, cartoon, painting, vintage, film stock, etc. y si aparenta ser foto real o grafico",
  "color_palette": "colores dominantes reales con matices indicados, temperatura (calida/fria), contraste, saturacion de la imagen",
  "mood": "atmosfera emocional real: alegre, tenso, misterioso, tranquilo, epico, intimo, etc.",
  "camera_angle": "angulo: low angle, high angle, eye-level, dutch angle, aerial, close-up, wide shot, etc. y encuadre exacto",
  "camera_movement": "static",
  "transitions": "none",
  "text_elements": "texto EXACTO visible en la imagen (letreros, logos, carteles) citado textualmente, con posicion y color. Si no hay, 'no visible'",
  "audio_cues": "none, es una imagen estatica"
}

REGLAS DEL FORMATO:
- Recrea la composicion completa de la imagen: donde esta cada elemento, que ocupa el centro, que esta en los bordes.
- Describe la imagen como si la vieras completa, sin recortes.
- NO anadas campos extra. NO uses markdown. SOLO JSON.`;

function buildImageParts(
  frames: Array<{ base64: string; mimeType?: string }>
): Part[] {
  return frames.map((frame) => ({
    inlineData: {
      mimeType: frame.mimeType || "image/png",
      data: frame.base64,
    },
  }));
}

async function runModelLoop(
  apiKey: string,
  modelOrder: string[],
  prompt: string,
  imageParts: Part[]
): Promise<GeminiAnalysis> {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    for (const modelName of modelOrder) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const request: GenerateContentRequest = {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }, ...imageParts],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topP: 0.9,
            topK: 40,
          },
        };
        const result = await model.generateContent(request);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No se encontro JSON valido en la respuesta");
        }

        const analysis = JSON.parse(jsonMatch[0]) as GeminiAnalysis;
        if (!validateAnalysis(analysis)) {
          throw new Error("El JSON no tiene la estructura esperada");
        }
        return analysis;
      } catch (error) {
        lastError = error;
        console.warn(
          `Gemini ${modelName}: intento ${attempt + 1}, error:`,
          error instanceof Error ? error.message : error
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

export async function analyzeVideoFrames(
  apiKey: string,
  frames: Array<{ base64: string; timestamp: number }>,
  videoDuration: number
): Promise<GeminiAnalysis> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const prompt = `${ANALYSIS_PROMPT}

Duracion del video: ${videoDuration.toFixed(1)} segundos.
Frames analizados: ${frames.length} (uno cada ~${(videoDuration / Math.max(frames.length, 1)).toFixed(1)}s).`;

  return runModelLoop(apiKey, MODEL_ORDER, prompt, buildImageParts(frames));
}

export async function analyzeSingleImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<GeminiAnalysis> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const prompt = `${IMAGE_ANALYSIS_PROMPT}

Imagen analizada: una sola imagen estatica a resolucion completa.`;

  return runModelLoop(apiKey, MODEL_ORDER, prompt, [
    { inlineData: { mimeType, data: imageBase64 } },
  ]);
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