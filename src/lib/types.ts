export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: string;
  size: number;
}

export interface FrameData {
  base64: string;
  timestamp: number;
  index: number;
}

export interface GeminiAnalysis {
  subject: string;
  action: string;
  environment: string;
  lighting: string;
  style: string;
  color_palette: string;
  mood: string;
  camera_angle: string;
  camera_movement: string;
  transitions: string;
  text_elements: string;
  audio_cues: string;
}

export interface VeoPromptOutput {
  prompt: string;
  negative_prompt?: string;
  parameters: {
    duration_seconds: number;
    aspect_ratio: "16:9" | "9:16" | "1:1" | "4:3";
    resolution: "720p" | "1080p";
    fps: 24 | 30;
    camera_movement: "static" | "pan" | "tilt" | "zoom" | "tracking" | "handheld";
  };
  breakdown: {
    subject: string;
    action: string;
    environment: string;
    lighting: string;
    style: string;
    color_palette: string;
    mood: string;
    camera_angle: string;
  };
  source_metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
    frames_analyzed: number;
  };
  confidence: number;
  alternative_prompts?: string[];
  generated_at: string;
  model_used: string;
}

export interface AnalysisHistoryItem {
  id: string;
  video_name: string;
  video_duration: number;
  result: VeoPromptOutput;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}