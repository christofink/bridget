# Bridget: PWA Speech-to-Text — Problem & Solution Options

## Problem

Bridget uses the **Web Speech API** (`webkitSpeechRecognition`) for real-time transcription (`hooks/useTranscription.ts`). This API works in Safari but **does not work when the app is added to the iPad home screen** (standalone PWA mode). This is a [well-documented WebKit limitation](https://bugs.webkit.org/show_bug.cgi?id=225298) — Apple's standalone WebView does not expose a working speech recognition service. There is no workaround; the API itself needs to be replaced.

The existing audio capture pipeline (`useAudioCapture`, `AudioWorkletNode`, `audio-processor.js`) works fine in standalone mode — only the speech-to-text engine is broken.

---

## Option 1: Local Whisper (On-Device via ONNX Runtime)

Run an OpenAI Whisper model directly in the browser using ONNX Runtime WebAssembly.

**How it works:**
- Use `@huggingface/transformers` (v3) or a lightweight ONNX wrapper to load a Whisper ONNX model
- Accumulate audio in a buffer (~5-10 seconds), run inference, emit text segments
- `onnxruntime-web` is already a project dependency; `lib/speaker/embedding-extractor.ts` demonstrates the exact singleton/lazy-init pattern needed
- Audio is already captured at 16kHz mono (Whisper's native format) via `useAudioCapture`

**Model sizes (ONNX, quantized):**
| Model | Size | Relative Speed | Quality |
|-------|------|---------------|---------|
| whisper-tiny | ~40MB | Fastest | Good for clear speech |
| whisper-base | ~75MB | Fast | Better accuracy |
| whisper-small | ~250MB | Slow on iPad | Best quality |

**Pros:**
- Works fully offline (ideal for PWA)
- No API key or recurring costs
- Consistent with existing on-device ML pattern (speaker verification)
- Privacy: audio never leaves the device
- Model cached by service worker after first download

**Cons:**
- Text appears in chunks (~3-5s delay) rather than real-time streaming
- ~40-75MB one-time model download on first use
- Inference uses significant CPU/memory on iPad
- More complex implementation (audio buffering, mel spectrogram, token decoding)
- No interim/partial results while processing a chunk

**Effort estimate:** Medium-high. Need new `lib/stt/whisper-engine.ts`, rewrite `useTranscription`, add audio buffering logic, handle model download UX.

---

## Option 2: Cloud STT API

Send audio chunks to a hosted transcription service.

**Candidate services:**
| Service | Model | Latency | Cost |
|---------|-------|---------|------|
| OpenAI Whisper API | Whisper large-v3 | ~2-3s per chunk | $0.006/min |
| Deepgram | Nova-2 | Real-time streaming | $0.0043/min |
| Google Cloud Speech | Chirp | Real-time streaming | $0.016/min |
| AssemblyAI | Universal | Real-time streaming | $0.01/min |

**How it works:**
- Capture audio via existing `useAudioCapture` pipeline (works in standalone PWA)
- Send PCM/WAV chunks to API endpoint via `fetch` or WebSocket
- Streaming services (Deepgram, Google, AssemblyAI) provide interim results over WebSocket
- Batch services (OpenAI) return complete text per chunk

**Pros:**
- Best transcription quality (cloud models are much larger/better)
- Real-time streaming with interim results (Deepgram, Google)
- Simpler implementation — HTTP/WebSocket calls instead of ML inference
- No model download, minimal client-side computation
- Multi-language support out of the box

**Cons:**
- Requires internet connection (but so did Web Speech API)
- Requires API key management (settings UI or env var)
- Recurring per-minute costs
- Privacy: audio sent to third party
- Need a proxy/backend to keep API keys secure (or accept client-side key exposure)

**Effort estimate:** Low-medium. New `lib/stt/cloud-engine.ts`, API key in settings, rewrite `useTranscription` to use fetch/WebSocket.

---

## Option 3: Hybrid (Local + Cloud)

Use cloud STT when online for better quality and latency; fall back to local Whisper when offline.

**How it works:**
- Implement both engines behind a common interface (`SttEngine`)
- `useTranscription` picks engine based on connectivity and user preference
- Add a setting toggle: "Use cloud transcription when available"

**Pros:**
- Best of both worlds — quality when online, functionality when offline
- Graceful degradation

**Cons:**
- Most complex: must build and maintain both engines
- Larger bundle and model download for the local fallback
- UX complexity: user sees different behavior/latency depending on mode

**Effort estimate:** High. All the work of Options 1 + 2, plus engine abstraction and switching logic.

---

## Recommendation

**For fastest path to working:** Option 2 (Cloud STT) — specifically Deepgram or OpenAI Whisper API. Simplest implementation, best quality, real-time results. The app already required internet for Web Speech API, so this isn't a regression.

**For best long-term fit:** Option 1 (Local Whisper) — aligns with the app's offline-first PWA philosophy and the existing on-device ML architecture. The 3-5s chunk delay is acceptable for subtitle use. Start with `whisper-tiny`, upgrade to `whisper-base` if accuracy isn't sufficient.

**Key files that would change regardless of approach:**
- `hooks/useTranscription.ts` — rewrite core engine
- `app/page.tsx` — may need to wire audio capture into transcription (currently separate)
- `lib/stt/types.ts` — may need additional types
- `app/sw.ts` — cache model files (Option 1) or allow API requests through (Option 2)
- `components/shell/SettingsPanel.tsx` — API key input (Option 2) or model download status (Option 1)

---

## Sources

- [WebKit Bug #225298 — Speech recognition service is not available](https://bugs.webkit.org/show_bug.cgi?id=225298)
- [PWA on iOS — Current Status & Limitations (2025)](https://brainhub.eu/library/pwa-on-ios)
- [iOS PWA Compatibility — firt.dev](https://firt.dev/notes/pwa-ios/)
- [Safari Speech Recognition Issues — WICG #96](https://github.com/WICG/speech-api/issues/96)
