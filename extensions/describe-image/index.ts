/**
 * Describe Image — pi extension
 *
 * Automatically describes attached images using local ollama vision models.
 * Works with any LLM, including text-only models. No API costs.
 *
 * How it works:
 * - Intercepts the `input` event: when images are attached to a user message,
 *   describes them with local vision AI and injects the descriptions as text.
 *   The LLM sees "Attached image: screenshot.png — shows a login form..."
 *   instead of raw image data it can't process.
 * - Registers a `describe_image` tool for manual use (path/URL based).
 *
 * Setup: ollama must be running (ollama serve).
 * Models used: gemma4:e2b (fast, default) or gemma4:e4b (high detail).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"

const OLLAMA_URL = "http://localhost:11434/api/generate"
const DEFAULT_MODEL = "gemma4:e2b"
const DETAIL_MODEL = "gemma4:e4b"

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
		// If so, let it handle them directly — no need for ollama.
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
			try {
				ctx.ui.setStatus("vision", `Describing ${label}...`)
				const text = await queryOllama(DEFAULT_MODEL, uiPrompt, base64, ctx.signal)
				descriptions.push(`[${label}: ${text}]`)
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err)
				// If ollama isn't running, let the message pass through unchanged
				if (msg.includes("fetch") || msg.includes("connect") || msg.includes("ECONNREFUSED")) {
					ctx.ui.setStatus("vision", "")
					ctx.ui.notify("ollama not running — images passed through as-is", "warn")
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
		description: "Describe an image or screenshot using local vision AI. Pass a file path or URL. Use when the current model cannot read images directly.",
		promptSnippet: "Describe images and screenshots using local vision AI",
		promptGuidelines: [
			"Use describe_image when the user shares an image you cannot see.",
			"Pass the file path the user provided, or a screenshot path from ~/Desktop/.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "File path or URL to the image" }),
			detail: Type.Optional(Type.Union([
				Type.Literal("low"),
				Type.Literal("high"),
			], { description: "low = gemma4:e2b (fast). high = gemma4:e4b (detailed). Default: low" })),
			focus: Type.Optional(Type.String({
				description: 'Optional focus area. Examples: "UI layout", "colors", "spacing", "accessibility", "visual hierarchy", "text content"',
			})),
		}),

		async execute(_toolCallId, params, signal, onUpdate, _ctx) {
			const { path, detail = "low", focus } = params
			const model = detail === "high" ? DETAIL_MODEL : DEFAULT_MODEL

			onUpdate?.({ content: [{ type: "text", text: `Analyzing with ${model}...` }] })

			let base64: string
			try {
				base64 = await pathToBase64(path, signal)
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err)
				return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true }
			}

			const prompt = focus
				? `Analyze this image with focus on: ${focus}. Be specific and concise.`
				: uiPrompt

			try {
				const text = await queryOllama(model, prompt, base64, signal)
				return { content: [{ type: "text", text }], details: { model } }
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err)
				return {
					content: [{ type: "text", text: `Vision analysis failed: ${msg}.\nIs ollama running? (ollama serve)` }],
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

async function queryOllama(
	model: string,
	prompt: string,
	imageBase64: string,
	signal?: AbortSignal,
): Promise<string> {
	const timeout = AbortSignal.timeout(120_000)
	const combined = signal
		? AbortSignal.any([signal, timeout])
		: timeout

	const res = await fetch(OLLAMA_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model, prompt, images: [imageBase64], stream: false }),
		signal: combined,
	})

	if (!res.ok) {
		throw new Error(`Ollama ${res.status}: ${res.statusText}`)
	}

	const data = (await res.json()) as { response?: string; error?: string }
	return data.response ?? data.error ?? "No response"
}