import { GeminiAnalysis, VeoPromptOutput } from "./types";

const CAMERA_MOVEMENT_MAP: Record<string, VeoPromptOutput["parameters"]["camera_movement"]> = {
  static: "static",
  "pan left": "pan",
  "pan right": "pan",
  "tilt up": "tilt",
  "tilt down": "tilt",
  "zoom in": "zoom",
  "zoom out": "zoom",
  tracking: "tracking",
  handheld: "handheld",
  dolly: "tracking",
  crane: "tracking",
};

function mapCameraMovement(
  movement: string
): VeoPromptOutput["parameters"]["camera_movement"] {
  const lower = movement.toLowerCase();
  for (const [key, value] of Object.entries(CAMERA_MOVEMENT_MAP)) {
    if (lower.includes(key)) return value;
  }
  return "static";
}

function determineAspectRatio(
  width: number,
  height: number
): VeoPromptOutput["parameters"]["aspect_ratio"] {
  if (!width || !height) return "16:9";
  const ratio = width / height;
  if (ratio > 1.7) return "16:9";
  if (ratio < 0.6) return "9:16";
  if (ratio > 1.3) return "16:9";
  if (ratio > 0.9) return "4:3";
  return "1:1";
}

function buildMainPrompt(analysis: GeminiAnalysis, duration: number): string {
  const parts: string[] = [];

  parts.push(`${analysis.subject}, ${analysis.action}`);
  parts.push(`in ${analysis.environment}`);
  parts.push(`${analysis.lighting} lighting`);
  parts.push(`${analysis.style} style`);
  parts.push(`${analysis.color_palette} color palette`);
  parts.push(`${analysis.mood} mood`);
  parts.push(`${analysis.camera_angle}, ${analysis.camera_movement} camera movement`);
  parts.push(`${Math.round(duration)}s duration`);
  parts.push("high quality, detailed, 8k");

  return parts.join(", ");
}

function buildNegativePrompt(analysis: GeminiAnalysis): string {
  const negatives = [
    "low quality",
    "blurry",
    "distorted",
    "deformed",
    "ugly",
    "bad anatomy",
    "extra limbs",
    "missing limbs",
    "floating",
    "disconnected",
    "watermark",
    "text",
    "logo",
    "signature",
    "username",
    "oversaturated",
    "underexposed",
    "overexposed",
    "noise",
    "grain",
    "artifacts",
    "glitch",
  ];

  const style = analysis.style.toLowerCase();
  if (style.includes("photorealistic") || style.includes("cinematic")) {
    negatives.push("cartoon", "illustration", "drawing", "anime", "3d render", "painting");
  }
  if (style.includes("anime")) {
    negatives.push("photorealistic", "live action", "3d render", "photograph");
  }

  return negatives.join(", ");
}

function generateAlternatives(analysis: GeminiAnalysis, duration: number): string[] {
  const basePrompt = buildMainPrompt(analysis, duration);
  const alternatives: string[] = [];

  alternatives.push(
    `${basePrompt}, cinematic lighting, film grain, anamorphic lens, letterboxed`
  );

  const cameraVariations = [
    "drone shot, aerial view",
    "macro close-up, shallow depth of field",
    "wide angle, expansive view",
    "dutch angle, dynamic composition",
  ];
  alternatives.push(
    `${basePrompt}, ${cameraVariations[Math.floor(Math.random() * cameraVariations.length)]}`
  );

  const styleVariations = [
    "golden hour lighting",
    "blue hour lighting",
    "studio lighting, clean background",
    "natural lighting, documentary style",
  ];
  alternatives.push(
    `${basePrompt}, ${styleVariations[Math.floor(Math.random() * styleVariations.length)]}`
  );

  return alternatives;
}

function calculateConfidence(analysis: GeminiAnalysis): number {
  let score = 0;
  const fields: (keyof GeminiAnalysis)[] = [
    "subject",
    "action",
    "environment",
    "lighting",
    "style",
    "color_palette",
    "mood",
    "camera_angle",
    "camera_movement",
  ];

  for (const field of fields) {
    const value = analysis[field];
    if (value && value.length > 10) score += 1;
    else if (value && value.length > 5) score += 0.5;
  }

  return Math.min(score / fields.length, 1);
}

export function buildVeoPrompt(
  analysis: GeminiAnalysis,
  videoMetadata: { duration: number; width: number; height: number; fps: number },
  framesAnalyzed: number
): VeoPromptOutput {
  const duration = Math.min(Math.max(videoMetadata.duration, 3), 30);
  const aspectRatio = determineAspectRatio(videoMetadata.width, videoMetadata.height);
  const cameraMovement = mapCameraMovement(analysis.camera_movement);

  const prompt = buildMainPrompt(analysis, duration);
  const negativePrompt = buildNegativePrompt(analysis);
  const alternatives = generateAlternatives(analysis, duration);
  const confidence = calculateConfidence(analysis);

  return {
    prompt,
    negative_prompt: negativePrompt,
    parameters: {
      duration_seconds: Math.round(duration),
      aspect_ratio: aspectRatio,
      resolution: videoMetadata.height >= 1080 ? "1080p" : "720p",
      fps: videoMetadata.fps > 25 ? 30 : 24,
      camera_movement: cameraMovement,
    },
    breakdown: {
      subject: analysis.subject,
      action: analysis.action,
      environment: analysis.environment,
      lighting: analysis.lighting,
      style: analysis.style,
      color_palette: analysis.color_palette,
      mood: analysis.mood,
      camera_angle: analysis.camera_angle,
    },
    source_metadata: {
      duration: videoMetadata.duration,
      width: videoMetadata.width,
      height: videoMetadata.height,
      fps: videoMetadata.fps,
      frames_analyzed: framesAnalyzed,
    },
    confidence,
    alternative_prompts: alternatives,
    generated_at: new Date().toISOString(),
    model_used: "gemini-3.5-flash-lite",
  };
}

export { mapCameraMovement, determineAspectRatio, buildMainPrompt, buildNegativePrompt };