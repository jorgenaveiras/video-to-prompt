import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: string;
  size: number;
}

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export async function probeVideo(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30,
        format: file.type.split("/")[1] || "mp4",
        size: file.size,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("No se pudo leer el video"));
    };
    video.src = URL.createObjectURL(file);
  });
}

export async function extractFrames(
  videoFile: File,
  metadata: VideoMetadata,
  options: {
    maxFrames?: number;
    maxDimension?: number;
  } = {}
): Promise<Array<{ base64: string; timestamp: number }>> {
  const ffmpeg = await getFFmpeg();
  const { maxFrames = 15 } = options;

  const inputName = "input.bin";
  const videoData = await fetchFile(videoFile);
  await ffmpeg.writeFile(inputName, videoData);

  const seconds = Math.max(1, Math.floor(metadata.duration));
  const count = Math.min(maxFrames, seconds);

  const frames: Array<{ base64: string; timestamp: number }> = [];
  for (let i = 0; i < count; i++) {
    const t = Math.min(i, seconds - 1);
    const outName = `frame_${String(i).padStart(3, "0")}.png`;
    await ffmpeg.exec([
      "-ss",
      String(t),
      "-i",
      inputName,
      "-frames:v",
      "1",
      "-update",
      "1",
      "-c:v",
      "png",
      outName,
    ]);
    const data = await ffmpeg.readFile(outName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
    const base64 = arrayBufferToBase64(bytes);
    frames.push({ base64, timestamp: t });
    await ffmpeg.deleteFile(outName);
  }

  await ffmpeg.deleteFile(inputName);
  return frames;
}

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}