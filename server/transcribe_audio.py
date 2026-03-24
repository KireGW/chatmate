import json
import os
import sys

from faster_whisper import WhisperModel


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python3 transcribe_audio.py <audio_path> [language]")

    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "es"
    model_size = os.environ.get("WHISPER_MODEL_SIZE", "small")
    device = os.environ.get("WHISPER_DEVICE", "auto")
    compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "auto")

    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    segments, _info = model.transcribe(audio_path, language=language, vad_filter=True)
    collected_segments = []

    for segment in segments:
        cleaned_text = segment.text.strip()

        if not cleaned_text:
            continue

        collected_segments.append(
            {
                "start": segment.start,
                "end": segment.end,
                "text": cleaned_text,
            }
        )

    text = " ".join(segment["text"] for segment in collected_segments).strip()
    print(json.dumps({"text": text, "segments": collected_segments}, ensure_ascii=False))


if __name__ == "__main__":
    main()
