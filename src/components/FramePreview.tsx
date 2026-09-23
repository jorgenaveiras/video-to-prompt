"use client";

import { FrameData, VideoMetadata } from "@/lib/types";

interface FramePreviewProps {
  frames: FrameData[];
  metadata?: VideoMetadata;
}

export function FramePreview({ frames, metadata }: FramePreviewProps) {
  const isImage = !!metadata && metadata.duration === 0;
  const displayFrames = frames.slice(0, 12);
  const imageMime = isImage
    ? `image/${["jpg", "jpeg"].includes(metadata?.format || "") ? "jpeg" : metadata?.format || "png"}`
    : "image/png";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isImage ? "Imagen analizada" : `Frames analizados (${frames.length})`}
        </h3>
        {metadata && metadata.width > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {!isImage && <span>{metadata.duration.toFixed(1)}s</span>}
            <span>
              {metadata.width}x{metadata.height}
            </span>
            {!isImage && <span>{metadata.fps.toFixed(1)}fps</span>}
          </div>
        )}
      </div>
      {isImage && displayFrames[0] ? (
        <div className="pb-4">
          <img
            src={`data:${imageMime};base64,${displayFrames[0].base64}`}
            alt="Imagen original"
            className="max-h-[28rem] mx-auto rounded-lg object-contain bg-gray-50 dark:bg-gray-900"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-4">
          {displayFrames.map((frame, index) => (
            <div
              key={index}
              className="group relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
            >
              <img
                src={`data:image/png;base64,${frame.base64}`}
                alt={`Frame ${index + 1} - ${frame.timestamp}s`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs text-white">
                {frame.timestamp}s
              </div>
            </div>
          ))}
          {frames.length > 12 && (
            <div className="relative aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                +{frames.length - 12} mas
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}