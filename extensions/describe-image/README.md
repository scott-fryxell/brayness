# Describe Image

A pi extension that describes images using local vision AI (ollama). Works with any LLM, including text-only models.

## How it works

Two modes:

1. **Automatic** — drop an image in chat. The extension checks whether the current model supports images natively:
   - **Vision-capable model** (Claude, GPT-4o, Gemini): lets the model see the image directly — zero latency added.
   - **Text-only model** (DeepSeek, Kimi, GLM without vision): describes the image with local ollama and injects the description as text.

2. **Manual** — use the `describe_image` tool to describe an image by path or URL:

```
describe_image(path: "~/Desktop/screenshot.png")
```

## Setup

ollama must be running with vision models:

```bash
ollama serve
```

Default models (already pulled on this machine):

- `gemma4:e2b` — fast, low RAM (~7.2 GB)
- `gemma4:e4b` — detailed, more RAM (~9.6 GB)

## Usage

### Drop an image in chat

Just paste or drag an image file into pi. If the current model can't see images, the extension describes it automatically. If the model already has vision, it passes through untouched.

### Manual tool

```
What's in this UI screenshot?
```

The agent will call `describe_image` with the file path.

### Detail level

The tool accepts `detail: "high"` to use gemma4:e4b for more accurate descriptions:

```
describe_image(path: "screenshot.png", detail: "high")
```

### Focus area

Narrow what the model pays attention to:

```
describe_image(path: "screenshot.png", focus: "accessibility issues")
```

## Configuration

Override the model via environment variable:

```bash
export PHOTOS_MODEL=gemma4:e4b
```
