/**
 * Describe Image - pi extension
 *
 * Automatically describes attached images using a local MLX vision model
 * (mlx_vlm.server). Works with any LLM, including text-only models. No API costs.
 *
 * How it works:
 * - Intercepts the `input` event: when images are attached to a user message,
 *   describes them with local MLX vision AI and injects the descriptions as text.
 *   The LLM sees "Attached image: screenshot.png - shows a login form..."
 *   instead of raw image data it can't process.
 * - Registers a `describe_image` tool for manual use (path/URL based).
 *
 * Setup: mlx_vlm.server must be running on port 8080 (launchd: com.scott.mlx-vision-server).
 * Model: gemma-4-e2b-it (MLX, 4-bit).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"

const MLX_URL = "http://127.0.0.1:8080/v1/chat/completions"
// The MLX server expects the local model path as the model id.
const MODEL = "/Users/scott/mlx-vlm/model-e2b"

interface ImageAttachment {
	path?: string
	data?: string
	mimeType?: string
}

export default function describeImageExtension(pi: ExtensionAPI) {
	// --- Automatically describe attached images (for text-only models) ---
	pi.on("input", async (event, ctx) => {
		const images = event.images as ImageAttachment[] | undefined
		if (!images || images.length === 0) return

		// Check if the current model already supports images natively.
		// If so, let it handle them directly - no need for MLX.
		const modelSupportsImages = ctx.model?.input?.includes("image")
		if (modelSupportsImages) return

		ctx.ui.setStatus("vision", `Describing ${images.length} image(s) for text-only model...`)

		const descriptions: string[] = []
		for (let i = 0; i < images.length; i++) {
			const img = images[i]
			const label = img.path?.split("/").pop() || `image-${i + 1}`
			const base64 = await imageToBase64(img)
			if (!base64) {
				descriptions.push(`[${label}: could not read image]`)
				continue
			}
			const mime = img.mimeType || guessMime(label)
			try {
				ctx.ui.setStatus("vision", `Describing ${label}...`)
				const text = await queryMLX(uiPrompt, base64, mime, ctx.signal)
				descriptions.push(`[${label}: ${text}]`)
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err)
				// If the MLX server isn't running, let the message pass through unchanged
				if (msg.includes("fetch") || msg.includes("connect") || msg.includes("ECONNREFUSED")) {
					ctx.ui.setStatus("vision", "")
					ctx.ui.notify("MLX vision server not running - images passed through as-is", "warn")
					return
				}
				descriptions.push(`[${label}: vision error: ${msg}]`)
			}
		}

		ctx.ui.setStatus("vision", "")

		const block = descriptions.length === 1
			? `\n\nAttached image described: ${descriptions[0]}`
			: `\n\nAttached images described:\n${descriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}`

		return { action: "transform", text: event.text + block }
	})

	// --- Manual tool for describing images by path/URL ---
	pi.registerTool({
		name: "describe_image",
		label: "Describe Image",
		description: "Describe an image or screenshot using local MLX vision AI. Pass a file path or URL. Use when the current model cannot read images directly.",
		promptSnippet: "Describe images and screenshots using local MLX vision AI",
		promptGuidelines: [
			"Use describe_image when the user shares an image you cannot see.",
			"Pass the file path the user provided, or a screenshot path from ~/Desktop/.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "File path or URL to the image" }),
			detail: Type.Optional(Type.Union([
				Type.Literal("low"),
				Type.Literal("high"),
			], { description: "Model runs locally via MLX; detail is accepted but both map to the same model." })),
			focus: Type.Optional(Type.String({
				description: 'Optional focus area. Examples: "UI layout", "colors", "spacing", "accessibility", "visual hierarchy", "text content"',
			})),
		}),

		async execute(_toolCallId, params, signal, onUpdate, _ctx) {
			const { path, focus } = params

			onUpdate?.({ content: [{ type: "text", text: `Analyzing with ${MODEL}...` }] })

			let base64: string
			try {
				base64 = await pathToBase64(path, signal)
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err)
				return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true }
			}

			const mime = guessMime(path)

			const prompt = focus
				? `Analyze this image with focus on: ${focus}. Be specific and concise.`
				: uiPrompt

			try {
				const text = await queryMLX(prompt, base64, mime, signal)
				return { content: [{ type: "text", text }], details: { model: MODEL } }
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err)
				return {
					content: [{ type: "text", text: `Vision analysis failed: ${msg}.\nIs the MLX vision server running? (launchctl start com.scott.mlx-vision-server)` }],
					isError: true,
				}
			}
		},
	})
}

// --- Prompt ---

const uiPrompt =
	"Analyze this image. If this is a UI screenshot or design mockup, describe: " +
	"layout structure, components visible, navigation, color palette, typography, " +
	"spacing, content sections, and any interactions suggested. " +
	"Otherwise describe: scene type, main subjects, notable objects, colors, " +
	"lighting, visible text. Be specific and concise."

// --- Helpers ---

function guessMime(name: string): string {
	const lower = name.toLowerCase()
	if (lower.endsWith(".png")) return "image/png"
	if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
	if (lower.endsWith(".gif")) return "image/gif"
	if (lower.endsWith(".webp")) return "image/webp"
	if (lower.endsWith(".bmp")) return "image/bmp"
	return "image/png"
}

async function imageToBase64(img: ImageAttachment): Promise<string | null> {
	if (img.data) {
		return img.data.replace(/^data:image\/\w+;base64,/, "")
	}
	if (img.path) {
		try {
			const buf = await readFile(img.path)
			return buf.toString("base64")
		} catch {
			return null
		}
	}
	return null
}

function pathToBase64(path: string, signal?: AbortSignal): Promise<string> {
	return new Promise((resolve, reject) => {
		if (path.startsWith("http://") || path.startsWith("https://")) {
			fetch(path, { signal })
				.then((r) => {
					if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`)
					return r.arrayBuffer()
				})
				.then((buf) => resolve(Buffer.from(buf).toString("base64")))
				.catch(reject)
		} else {
			if (!existsSync(path)) {
				reject(new Error(`File not found: ${path}`))
				return
			}
			readFile(path).then(
				(buf) => resolve(buf.toString("base64")),
				reject,
			)
		}
	})
}

async function queryMLX(
	prompt: string,
	imageBase64: string,
	mime: string,
	signal?: AbortSignal,
): Promise<string> {
	const timeout = AbortSignal.timeout(120_000)
	const combined = signal
		? AbortSignal.any([signal, timeout])
		: timeout

	const dataUri = `data:${mime};base64,${imageBase64}`

	const res = await fetch(MLX_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: MODEL,
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: prompt },
						{ type: "image_url", image_url: { url: dataUri } },
					],
				},
			],
			stream: false,
		}),
		signal: combined,
	})

	if (!res.ok) {
		throw new Error(`MLX ${res.status}: ${res.statusText}`)
	}

	const data = (await res.json()) as {
		choices?: { message?: { content?: string } }[]
		error?: string
	}
	return data.choices?.[0]?.message?.content ?? data.error ?? "No response"
}
