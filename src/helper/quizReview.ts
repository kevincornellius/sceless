import { ParsedQuestion } from "../types/quizReview";

export function getHtml(container: Element, selector: string): string {
	return container.querySelector(selector)?.innerHTML?.trim() ?? "";
}

export function getText(container: Element, selector: string): string {
	return container.querySelector(selector)?.textContent?.trim() ?? "";
}

export function htmlFragmentToMarkdown(fragmentHtml: string): string {
	const container = document.createElement("div");
	container.innerHTML = fragmentHtml || "";
	container.querySelectorAll("script").forEach((node) => node.remove());

	container.querySelectorAll("img").forEach((image) => {
		const source = image.getAttribute("src") || "";
		if (!source) {
			image.remove();
			return;
		}

		const alt = image.getAttribute("alt") || "image";
		const absoluteSource = new URL(source, window.location.href).href;
		image.replaceWith(document.createTextNode(`![${alt}](${absoluteSource})`));
	});

	container.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));

	return container.innerText.trim();
}

export function collectImageSources(...htmlFragments: string[]): string[] {
	const sources = new Set<string>();

	for (const fragment of htmlFragments) {
		const container = document.createElement("div");
		container.innerHTML = fragment || "";
		container.querySelectorAll("script").forEach((node) => node.remove());

		container.querySelectorAll("img").forEach((image) => {
			const source = image.getAttribute("src");
			if (!source) {
				return;
			}

			sources.add(new URL(source, window.location.href).href);
		});
	}

	return Array.from(sources);
}

export type CopyMode = "markdown" | "image";

export interface CopyStatus {
	slot: number;
	mode: CopyMode;
}

export function buildQuestionMarkdown(question: ParsedQuestion): string {
	const parts: string[] = [];
	parts.push(`# Question ${question.questionNumber}`);
	parts.push(`**Type:** ${question.type}`);
	if (question.state) {
		parts.push(`**State:** ${question.state}`);
	}
	if (question.grade) {
		parts.push(`**Grade:** ${question.grade}`);
	}
	parts.push("");

	if (question.questionHtml) {
		parts.push(htmlFragmentToMarkdown(question.questionHtml));
		parts.push("");
	}

	if (question.answers.length > 0) {
		parts.push("## Options");
		question.answers.forEach((answer, index) => {
			const optionText = htmlFragmentToMarkdown(answer.labelHtml);
			const optionState = answer.selected ? (answer.incorrect ? " (selected, incorrect)" : " (selected)") : answer.correct ? " (correct)" : "";
			parts.push(`${index + 1}. ${optionText}${optionState}`);
		});
		parts.push("");
	}

	if (question.feedbackHtml) {
		parts.push("## Feedback");
		parts.push(htmlFragmentToMarkdown(question.feedbackHtml));
		parts.push("");
	}

	if (question.rightAnswerHtml) {
		parts.push("## Correct Answer");
		parts.push(htmlFragmentToMarkdown(question.rightAnswerHtml));
		parts.push("");
	}

	return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function blobToPng(blob: Blob): Promise<Blob> {
	if (blob.type === "image/png") {
		return blob;
	}

	try {
		const bitmap = await createImageBitmap(blob);
		const canvas = document.createElement("canvas");
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;

		const context = canvas.getContext("2d");
		if (!context) {
			return blob;
		}

		context.drawImage(bitmap, 0, 0);
		bitmap.close();

		const pngBlob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((result) => resolve(result), "image/png");
		});

		return pngBlob ?? blob;
	} catch {
		return blob;
	}
}

export async function fetchImageBlob(imageUrl: string): Promise<Blob | null> {
	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			return null;
		}

		return response.blob();
	} catch {
		return null;
	}
}