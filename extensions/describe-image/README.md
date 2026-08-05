# Describe Image

A pi extension that describes images using a local MLX vision model. Works with any LLM, including text-only models. No API costs.

## How it works

Two modes:

1. **Automatic** - drop an image in chat. The extension checks whether the current model supports images natively:
   - **Vision-capable model** (Claude, GPT-4o, Gemini): lets the model see the image directly - zero latency added.
   - **Text-only model** (DeepSeek, Kimi, GLM without vision): describes the image with local MLX vision and injects the description as text.

2. **Manual** - use the `describe_image` tool to describe an image by path or URL:

```
describe_image(path: "~/Desktop/screenshot.png")
```

## Setup

Requires the local MLX vision server running on port 8080. See `~/mlx-vlm/README.md`, but the short version:

```bash
launchctl start com.scott.mlx-vision-server   # starts/resumes it
curl http://127.0.0.1:8080/health             # confirm it's up
```

Model: `gemma-4-e2b-it` (MLX, 4-bit). Runs as a launchd background agent (`com.scott.mlx-vision-server`), replaced the old ollama + `gemma4:e2b` setup.

## Usage

### Drop an image in chat

Just paste or drag an image file into pi. If the current model can't see images, the extension describes it automatically. If the model already has vision, it passes through untouched.

### Manual tool

```
What's in this UI screenshot?
```

The agent will call `describe_image` with the file path.

### Focus area

Narrow what the model pays attention to:

```
describe_image(path: "screenshot.png", focus: "accessibility issues")
```

(`detail: "low" | "high"` is still accepted for compatibility; both map to the single MLX model.)
