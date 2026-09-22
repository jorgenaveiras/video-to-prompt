# Video to Veo Prompt Generator

> Convierte videos (3-30s) en prompts optimizados para **Google Veo** usando IA multimodal.

## Caracteristicas

- 🎥 **Sube o graba** video desde camara (movil y desktop)
- ⚡ **Procesamiento local** con FFmpeg.wasm - tu video nunca sale del navegador
- 🤖 **Analisis IA** con Gemini 3.5 Flash Lite, directo desde el navegador
- 📝 **Prompts estructurados** optimizados para Google Veo
- 📱 **PWA ready** - instala como app en movil
- 💾 **Historial local** persistente (localStorage)
- 🌙 **Modo oscuro** automatico
- 🚀 **Deploy gratis** en GitHub Pages

## Requisitos

- Node.js 20+
- API Key de Google Gemini ([consiguela gratis](https://aistudio.google.com/app/apikey))

## Instalacion Local

```bash
git clone https://github.com/TU_USUARIO/video-to-prompt.git
cd video-to-prompt
npm install

# Configura la API key
# En Windows PowerShell:
#   Copy-Item .env.example .env.local   (luego edita)
# En Linux/macOS: cp .env.example .env.local
# Y agrega tu NEXT_PUBLIC_GEMINI_API_KEY

npm run dev   # http://localhost:3000
```

## Despliegue en GitHub Pages

1. **Crea el repo** en GitHub con nombre `video-to-prompt` (o el que quieras).
2. **Empuja el codigo** a la rama `main`.
3. En GitHub: **Settings > Secrets and variables > Actions** → nuevo secret `GEMINI_API_KEY` con tu key.
4. En **Settings > Pages > Build and deployment** selecciona **GitHub Actions**.
5. El workflow `.github/workflows/deploy.yml` construye y publica automaticamente en cada push.

Si tu repo se llama distinto, cambia `NEXT_PUBLIC_BASE_PATH` en el workflow y en `next.config.js`.

Tu app quedara en: `https://TU_USUARIO.github.io/RUTA/`

> **Nota de seguridad:** al ser un sitio estatico, la API key viaja en el codigo
> JavaScript publicado y cualquiera puede leerla. Protegela usando el plan
> gratuito de Gemini (con rate limits) o limitando la key en Google AI Studio.
> Tu video se procesa 100% en el navegador y **nunca** se sube a ningun servidor.

## Uso

1. **Selecciona o graba** un video (3-30 segundos).
2. Clic en **Analizar** - se extraen frames clave localmente con FFmpeg.wasm.
3. **Gemini analiza** los frames y entiende el contenido.
4. **Genera el prompt** optimizado para Veo:
   - Prompt principal listo para copiar
   - Negative prompt
   - Parametros tecnicos (duracion, aspect ratio, FPS, camara)
   - Desglose visual detallado
   - Variaciones alternativas
   - JSON completo descargable

## Ejemplo de Salida (JSON)

```json
{
  "prompt": "A cinematic shot of a person walking on a beach at sunset, golden hour lighting, photorealistic style, warm color palette, peaceful mood, low angle, tracking camera movement, 8s duration, high quality, detailed, 8k",
  "negative_prompt": "low quality, blurry, distorted, cartoon, illustration, watermark, text, noise, grain",
  "parameters": {
    "duration_seconds": 8,
    "aspect_ratio": "16:9",
    "resolution": "1080p",
    "fps": 24,
    "camera_movement": "tracking"
  },
  "breakdown": {
    "subject": "a person walking on a beach",
    "action": "walking slowly, hair moving in the breeze",
    "environment": "sandy beach, ocean waves, sunset sky",
    "lighting": "golden hour, warm directional sunlight",
    "style": "photorealistic, cinematic",
    "color_palette": "warm oranges, golds, soft blues",
    "mood": "peaceful, serene",
    "camera_angle": "low angle"
  },
  "source_metadata": {
    "duration": 8.5,
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "frames_analyzed": 8
  },
  "confidence": 0.89,
  "alternative_prompts": [],
  "generated_at": "2024-01-15T10:30:00.000Z",
  "model_used": "gemini-3.5-flash-lite"
}
```

## Tech Stack

| Capa | Tecnologia |
|------|------------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Video | @ffmpeg/ffmpeg (WASM) |
| IA | Google Generative AI (Gemini 3.5 Flash Lite) |
| Deploy | GitHub Pages + Actions |

## Costos (Todo Gratis)

| Servicio | Limite Gratis |
|----------|---------------|
| Gemini 3.5 Flash Lite | 1,500 req/dia, 1M tokens/min |
| GitHub Pages | Ancho de banda ilimitado (publico) |
| GitHub Actions | 2,000 min/mes |

## Estructura del Proyecto

```
video-to-prompt/
├── .github/workflows/deploy.yml   # CI/CD a GitHub Pages
├── public/                        # Iconos PWA + manifest
├── src/
│   ├── app/                       # layout, globals.css, page principal
│   ├── components/                # VideoUpload, FramePreview, PromptResult, HistoryPanel, JsonViewer
│   ├── hooks/                     # useVideoAnalysis, useHistory
│   ├── lib/                       # ffmpeg, gemini, prompt-engineering, types
│   └── utils/                     # helpers
├── .env.example
└── next.config.js
```

## Licencia

MIT - Libre para uso personal y comercial.