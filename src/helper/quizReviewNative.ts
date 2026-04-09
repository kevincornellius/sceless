import { toBlob as htmlToImageBlob } from "html-to-image";
import { h, render as renderPreact } from "preact";
import { changeTheme, theme } from "@/src/stores/theme";
import { Logo } from "@/src/components/ui/Logo";
import { defaultThemes } from "@/src/types/themes";
import {
	blobToPng,
	collectImageSources,
	fetchImageBlob,
	htmlFragmentToMarkdown,
} from "@/src/helper/quizReview";

const QUESTION_BASE_CLASSES = new Set([
	"que",
	"deferredfeedback",
	"immediatefeedback",
	"correct",
	"incorrect",
	"partiallycorrect",
	"partially",
	"complete",
	"answered",
	"notanswered",
	"gradedright",
	"gradedwrong",
	"flagged",
]);

const REVEALED_CLASS = "sceless-native-revealed";
const COPY_FEEDBACK_MS = 1200;
const NATIVE_STYLE_ID = "sceless-quiz-review-style";

const EXPORT_DOCUMENT_STYLES = `
:root {
	color-scheme: light;
}

html,
body {
	margin: 0;
	padding: 0;
	background: #ffffff !important;
}

body {
	color: #1f2937;
	font-family: "Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif;
}

.sceless-export-wrap {
	padding: 14px;
}

.sceless-export-header {
	border: 1px solid #d7dde5;
	border-radius: 14px;
	padding: 10px 12px;
	margin-bottom: 12px;
	background: #ffffff;
}

.sceless-export-course {
	margin: 0 0 4px;
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: #6b7280;
}

.sceless-export-title {
	margin: 0;
	font-size: 22px;
	line-height: 1.2;
	color: #111827;
}

#sceless-quiz-review-root .sceless-native-shell {
	min-height: auto !important;
	padding: 0 !important;
	background: #ffffff !important;
}

#sceless-quiz-review-root .sceless-native-topbar,
#sceless-quiz-review-root .sceless-native-aside-tools,
#sceless-quiz-review-root .sceless-native-navigation,
#sceless-quiz-review-root .sceless-native-question-navigation,
#sceless-quiz-review-root .sceless-native-jump,
#sceless-quiz-review-root .sceless-native-question-tools,
#sceless-quiz-review-root .sceless-native-practice-tools {
	display: none !important;
}

#sceless-quiz-review-root .sceless-native-body {
	display: block !important;
}

#sceless-quiz-review-root .sceless-native-summary,
#sceless-quiz-review-root .sceless-native-questions {
	border: 0 !important;
	box-shadow: none !important;
	background: #ffffff !important;
}

#sceless-quiz-review-root .sceless-native-question-title {
	font-size: 12px !important;
}

#sceless-quiz-review-root .sceless-native-question-title-label {
	font-size: 9px !important;
	padding: 4px 8px !important;
}

#sceless-quiz-review-root .sceless-native-question-title-number {
	min-width: 22px !important;
	height: 22px !important;
	font-size: 11px !important;
}

#sceless-quiz-review-root .sceless-native-question-prompt {
	font-size: 12px !important;
	line-height: 1.45 !important;
}

#sceless-quiz-review-root .sceless-native-answer-row {
	padding: 7px 9px !important;
}

#sceless-quiz-review-root .sceless-native-answer-row [data-region='answer-label'],
#sceless-quiz-review-root .sceless-native-answer-row [data-region='answer-label'] *,
#sceless-quiz-review-root .sceless-native-answer-row .flex-fill,
#sceless-quiz-review-root .sceless-native-answer-row .flex-fill * {
	font-size: 12px !important;
	line-height: 1.4 !important;
}

#sceless-quiz-review-root .sceless-native-specific-feedback,
#sceless-quiz-review-root .sceless-native-right-answer {
	font-size: 11px !important;
	line-height: 1.4 !important;
}

#sceless-quiz-review-root .sceless-native-question img,
#sceless-quiz-review-root .sceless-native-question-prompt img,
#sceless-quiz-review-root .sceless-native-answer-row img,
#sceless-quiz-review-root .sceless-native-specific-feedback img,
#sceless-quiz-review-root .sceless-native-right-answer img {
	width: auto !important;
	height: auto !important;
	max-width: min(100%, 460px) !important;
	max-height: 220px !important;
	object-fit: contain !important;
	display: block;
}

#sceless-quiz-review-root .que {
	break-inside: avoid-page;
	page-break-inside: avoid;
}

@media print {
	@page {
		size: A4;
		margin: 10mm;
	}

	.sceless-export-wrap {
		padding: 0;
	}
}
`;

interface MountQuizReviewNativeOptions {
	root: HTMLElement;
	attemptId: string;
	showThemeSelector?: boolean;
}

type ClozeControl = HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement;

type CompareKind = "match" | "different" | "incomplete";

type QuestionListTone = "default" | "correct" | "incorrect" | "filled";

interface QuestionListVisualState {
	tone: QuestionListTone;
	flagged: boolean;
}

interface CompareResult {
	kind: CompareKind;
	message: string;
}

interface NativeQuestionContext {
	element: HTMLElement;
	slot: number;
	questionNumber: string;
	type: string;
	state: string;
	grade: string;
	listTone: QuestionListTone;
	isFlagged: boolean;
	answerInputs: HTMLInputElement[];
	answerOriginalChecked: boolean[];
	answerOriginalDisabled: boolean[];
	clozeControls: ClozeControl[];
	clozeOriginalValues: Map<string, string>;
	clozeOriginalDisabled: Map<string, boolean>;
	clozeOriginalReadOnly: Map<string, boolean>;
	revealed: boolean;
	canPractice: boolean;
	practiceTools: HTMLDivElement;
	revealButton: HTMLButtonElement;
	compareBadge: HTMLSpanElement;
	copyMarkdownButton: HTMLButtonElement;
	copyImageButton: HTMLButtonElement;
}

function normalizeText(value: string | null | undefined): string {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

function getHtml(container: ParentNode, selector: string): string {
	const node = container.querySelector<HTMLElement>(selector);
	return node?.innerHTML?.trim() ?? "";
}

function getText(container: ParentNode, selector: string): string {
	return normalizeText(container.querySelector<HTMLElement>(selector)?.textContent);
}

function getQuestionType(questionElement: HTMLElement): string {
	const candidates = Array.from(questionElement.classList).filter(
		(className) => !QUESTION_BASE_CLASSES.has(className),
	);

	return candidates[0] || "question";
}

function getQuestionSlot(questionElement: HTMLElement, fallbackSlot: number): number {
	const fromId = questionElement.id.match(/-(\d+)$/);
	if (fromId) {
		const parsed = Number(fromId[1]);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	const postData = questionElement.querySelector<HTMLInputElement>(
		".questionflagpostdata",
	)?.value;
	if (postData) {
		const parsedParams = new URLSearchParams(postData);
		const slotValue = Number(parsedParams.get("slot"));
		if (Number.isFinite(slotValue)) {
			return slotValue;
		}
	}

	return fallbackSlot;
}

function getQuestionNumber(questionElement: HTMLElement, fallbackNumber: number): string {
	return getText(questionElement, ".qno") || String(fallbackNumber);
}

function buildQnButtonClassMap(rootElement: ParentNode): Map<number, Set<string>> {
	const qnButtons = Array.from(
		rootElement.querySelectorAll<HTMLAnchorElement>(".qn_buttons .qnbutton"),
	);
	const map = new Map<number, Set<string>>();

	qnButtons.forEach((button) => {
		const idMatch = button.id.match(/quiznavbutton(\d+)$/i);
		if (!idMatch) {
			return;
		}

		const slot = Number(idMatch[1]);
		if (!Number.isFinite(slot)) {
			return;
		}

		map.set(slot, new Set(Array.from(button.classList)));
	});

	return map;
}

function getQuestionListVisualState(
	questionElement: HTMLElement,
	questionState: string,
	qnButtonClasses?: Set<string>,
): QuestionListVisualState {
	const classList = questionElement.classList;
	const hasQnButtonClasses = !!qnButtonClasses && qnButtonClasses.size > 0;
	const normalizedState = questionState.toLowerCase();
	const hasNotAnsweredState =
		normalizedState.includes("not answered") ||
		normalizedState.includes("notanswered") ||
		normalizedState.includes("unanswered");

	const isCorrect =
		qnButtonClasses?.has("correct") ||
		classList.contains("correct") ||
		classList.contains("gradedright");
	const isIncorrect =
		qnButtonClasses?.has("incorrect") ||
		classList.contains("incorrect") ||
		classList.contains("gradedwrong") ||
		classList.contains("partiallycorrect") ||
		classList.contains("partially");
	const isFilled =
		(hasQnButtonClasses
			? !!(
				qnButtonClasses?.has("free") ||
				qnButtonClasses?.has("answered") ||
				qnButtonClasses?.has("complete")
			)
			: false) ||
		(!hasNotAnsweredState &&
			(classList.contains("answered") ||
				classList.contains("complete") ||
				normalizedState.includes("answered"))) ||
		isCorrect ||
		isIncorrect;

	const flaggedInput = questionElement.querySelector<HTMLInputElement>("input[name$=':flagged']");
	const isFlagged =
		qnButtonClasses?.has("flagged") ||
		classList.contains("flagged") ||
		(flaggedInput?.value?.trim() === "1");

	let tone: QuestionListTone = "default";
	if (isCorrect) {
		tone = "correct";
	} else if (isIncorrect) {
		tone = "incorrect";
	} else if (isFilled) {
		tone = "filled";
	}

	return {
		tone,
		flagged: !!isFlagged,
	};
}

function getControlKey(control: ClozeControl, index: number, slot: number): string {
	const existing =
		control.dataset.scelessPracticeId ||
		control.getAttribute("id") ||
		`sceless-control-${slot}-${index + 1}`;

	control.dataset.scelessPracticeId = existing;
	if (!control.id) {
		control.id = existing;
	}

	return existing;
}

function getControlValue(control: ClozeControl): string {
	if (
		control instanceof HTMLInputElement ||
		control instanceof HTMLTextAreaElement ||
		control instanceof HTMLSelectElement
	) {
		return control.value;
	}

	return "";
}

function hasEmptyOption(selectElement: HTMLSelectElement): boolean {
	return Array.from(selectElement.options).some(
		(option) => option.value.trim() === "",
	);
}

function ensurePlaceholderOption(selectElement: HTMLSelectElement): void {
	if (hasEmptyOption(selectElement)) {
		return;
	}

	const placeholderOption = document.createElement("option");
	placeholderOption.value = "";
	placeholderOption.textContent = "Select answer";
	placeholderOption.dataset.scelessPlaceholder = "true";
	selectElement.prepend(placeholderOption);
}

function removePlaceholderOptions(selectElement: HTMLSelectElement): void {
	Array.from(selectElement.options).forEach((option) => {
		if (option.dataset.scelessPlaceholder === "true") {
			option.remove();
		}
	});
}

function areIndexSetsEqual(left: number[], right: number[]): boolean {
	if (left.length !== right.length) {
		return false;
	}

	const leftSorted = [...left].sort((a, b) => a - b);
	const rightSorted = [...right].sort((a, b) => a - b);

	return leftSorted.every((value, index) => value === rightSorted[index]);
}

function setTemporaryButtonState(button: HTMLButtonElement, copiedLabel: string): void {
	const baseLabel = button.dataset.baseLabel || button.textContent || "";
	button.dataset.baseLabel = baseLabel;
	button.textContent = copiedLabel;
	button.disabled = true;

	window.setTimeout(() => {
		button.textContent = baseLabel;
		button.disabled = false;
	}, COPY_FEEDBACK_MS);
}

function getCourseName(pageTitle: string, summaryDescription: string): string {
	const ignoredPattern = /^(site home|home|dashboard|my courses|courses|course categories)$/i;
	const breadcrumbNodes = Array.from(
		document.querySelectorAll<HTMLElement>(
			"#page-navbar li, #page-navbar .breadcrumb-item, .breadcrumb li, .breadcrumb-item",
		),
	);
	const breadcrumbTexts = breadcrumbNodes
		.map((node) => normalizeText(node.textContent))
		.filter((text, index, all) => text !== "" && all.indexOf(text) === index);

	for (let index = breadcrumbTexts.length - 1; index >= 0; index -= 1) {
		const candidate = breadcrumbTexts[index];
		if (
			!candidate ||
			candidate === pageTitle ||
			/attempt review/i.test(candidate) ||
			ignoredPattern.test(candidate)
		) {
			continue;
		}

		return candidate;
	}

	const contextHeader = normalizeText(
		document.querySelector(".page-context-header h1")?.textContent,
	);
	if (
		contextHeader &&
		contextHeader !== pageTitle &&
		!/attempt review/i.test(contextHeader)
	) {
		return contextHeader;
	}

	if (
		summaryDescription &&
		summaryDescription !== pageTitle &&
		!/attempt review/i.test(summaryDescription)
	) {
		return summaryDescription;
	}

	return "Course";
}

function buildPrintableShell(sourceShell: HTMLElement): HTMLElement {
	const printableShell = sourceShell.cloneNode(true) as HTMLElement;

	Array.from(
		printableShell.querySelectorAll<HTMLElement>("[data-copy-exclude='true']"),
	).forEach((node) => {
		node.remove();
	});

	Array.from(printableShell.querySelectorAll<HTMLElement>(".que")).forEach((questionElement) => {
		questionElement.hidden = false;
		questionElement.classList.add(REVEALED_CLASS);
	});

	return printableShell;
}

function waitForFrameImages(frameDocument: Document): Promise<void> {
	const pendingImages = Array.from(frameDocument.images).filter(
		(image) => !image.complete,
	);

	if (pendingImages.length === 0) {
		return Promise.resolve();
	}

	return Promise.all(
		pendingImages.map(
			(image) =>
				new Promise<void>((resolve) => {
					const finish = () => {
						image.removeEventListener("load", finish);
						image.removeEventListener("error", finish);
						resolve();
					};

					image.addEventListener("load", finish, { once: true });
					image.addEventListener("error", finish, { once: true });
					window.setTimeout(finish, 2000);
				}),
		),
	).then(() => undefined);
}

async function exportQuizReviewPdf(options: {
	shell: HTMLElement;
	pageTitle: string;
	courseName: string;
}): Promise<void> {
	const { shell, pageTitle, courseName } = options;
	const printableShell = buildPrintableShell(shell);
	const iframe = document.createElement("iframe");

	iframe.setAttribute("aria-hidden", "true");
	iframe.style.position = "fixed";
	iframe.style.right = "0";
	iframe.style.bottom = "0";
	iframe.style.width = "0";
	iframe.style.height = "0";
	iframe.style.opacity = "0";
	iframe.style.border = "0";
	iframe.style.pointerEvents = "none";
	document.body.append(iframe);

	const frameWindow = iframe.contentWindow;
	const frameDocument = iframe.contentDocument;

	if (!frameWindow || !frameDocument) {
		iframe.remove();
		return;
	}

	frameDocument.open();
	frameDocument.write("<!doctype html><html><head><meta charset='utf-8' /></head><body></body></html>");
	frameDocument.close();

	const pageTitleElement = frameDocument.createElement("title");
	pageTitleElement.textContent = pageTitle;
	frameDocument.head.append(pageTitleElement);

	const nativeStyleText = document.getElementById(NATIVE_STYLE_ID)?.textContent ?? "";
	if (nativeStyleText) {
		const inheritedStyle = frameDocument.createElement("style");
		inheritedStyle.textContent = nativeStyleText;
		frameDocument.head.append(inheritedStyle);
	}

	const exportStyle = frameDocument.createElement("style");
	exportStyle.textContent = EXPORT_DOCUMENT_STYLES;
	frameDocument.head.append(exportStyle);

	const exportWrap = frameDocument.createElement("div");
	exportWrap.className = "sceless-export-wrap";

	const exportHeader = frameDocument.createElement("header");
	exportHeader.className = "sceless-export-header";

	const exportCourse = frameDocument.createElement("p");
	exportCourse.className = "sceless-export-course";
	exportCourse.textContent = courseName;

	const exportTitle = frameDocument.createElement("h1");
	exportTitle.className = "sceless-export-title";
	exportTitle.textContent = pageTitle;

	exportHeader.append(exportCourse, exportTitle);

	const exportRoot = frameDocument.createElement("div");
	exportRoot.id = "sceless-quiz-review-root";
	exportRoot.append(frameDocument.importNode(printableShell, true));

	exportWrap.append(exportHeader, exportRoot);
	frameDocument.body.append(exportWrap);

	await waitForFrameImages(frameDocument);

	const cleanup = () => {
		window.setTimeout(() => {
			iframe.remove();
		}, 250);
	};

	frameWindow.onafterprint = cleanup;
	frameWindow.focus();
	frameWindow.print();
	window.setTimeout(cleanup, 4000);
}

function getQuestionTitle(context: NativeQuestionContext): string {
	return `Question ${context.questionNumber}`;
}

function buildQuestionMarkdown(context: NativeQuestionContext): string {
	const questionElement = context.element;
	const parts: string[] = [];
	parts.push(`# ${getQuestionTitle(context)}`);
	parts.push(`**Type:** ${context.type}`);

	if (context.state) {
		parts.push(`**State:** ${context.state}`);
	}

	if (context.grade) {
		parts.push(`**Grade:** ${context.grade}`);
	}

	parts.push("");

	const promptHtml = getHtml(questionElement, ".qtext");
	if (promptHtml) {
		parts.push(htmlFragmentToMarkdown(promptHtml));
		parts.push("");
	}

	const answerRows = Array.from(
		questionElement.querySelectorAll<HTMLElement>(".answer > div"),
	);

	if (answerRows.length > 0) {
		parts.push("## Options");

		answerRows.forEach((answerRow, index) => {
			const labelNode = answerRow.querySelector<HTMLElement>(
				"[data-region='answer-label']",
			);
			const answerHtml = labelNode?.innerHTML?.trim() || answerRow.innerHTML.trim();
			const selectedInput = answerRow.querySelector<HTMLInputElement>("input");
			const selected = selectedInput?.checked ?? false;
			const incorrect = answerRow.classList.contains("incorrect");
			const correct = answerRow.classList.contains("correct");
			const stateSuffix = selected
				? incorrect
					? " (selected, incorrect)"
					: " (selected)"
				: correct
					? " (correct)"
					: "";

			parts.push(
				`${index + 1}. ${htmlFragmentToMarkdown(answerHtml)}${stateSuffix}`,
			);
		});

		parts.push("");
	}

	const feedbackHtml = getHtml(questionElement, ".specificfeedback");
	if (feedbackHtml) {
		parts.push("## Feedback");
		parts.push(htmlFragmentToMarkdown(feedbackHtml));
		parts.push("");
	}

	const rightAnswerHtml = getHtml(questionElement, ".rightanswer");
	if (rightAnswerHtml) {
		parts.push("## Correct Answer");
		parts.push(htmlFragmentToMarkdown(rightAnswerHtml));
		parts.push("");
	}

	return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function getQuestionImageSources(context: NativeQuestionContext): string[] {
	const questionElement = context.element;
	const promptHtml = getHtml(questionElement, ".qtext");
	const feedbackHtml = getHtml(questionElement, ".specificfeedback");
	const rightAnswerHtml = getHtml(questionElement, ".rightanswer");
	const answerHtml = Array.from(
		questionElement.querySelectorAll<HTMLElement>(".answer > div"),
	).map((answerRow) => {
		const labelNode = answerRow.querySelector<HTMLElement>(
			"[data-region='answer-label']",
		);
		return labelNode?.innerHTML?.trim() || answerRow.innerHTML.trim();
	});

	return collectImageSources(promptHtml, ...answerHtml, feedbackHtml, rightAnswerHtml);
}

async function copyQuestionMarkdown(context: NativeQuestionContext): Promise<boolean> {
	const markdown = buildQuestionMarkdown(context);
	const imageSources = getQuestionImageSources(context);
	const firstImageSource = imageSources[0] ?? null;

	const clipboardPayload: Record<string, Blob> = {
		"text/plain": new Blob([markdown], { type: "text/plain" }),
	};

	try {
		if (
			typeof ClipboardItem !== "undefined" &&
			"supports" in ClipboardItem &&
			(
				ClipboardItem as typeof ClipboardItem & {
					supports?: (type: string) => boolean;
				}
			).supports?.("text/markdown")
		) {
			clipboardPayload["text/markdown"] = new Blob([markdown], {
				type: "text/markdown",
			});
		}

		if (firstImageSource) {
			const imageBlob = await fetchImageBlob(firstImageSource);
			if (imageBlob) {
				clipboardPayload["image/png"] = await blobToPng(imageBlob);
			}
		}

		if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
			await navigator.clipboard.write([new ClipboardItem(clipboardPayload)]);
		} else if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(markdown);
		} else {
			return false;
		}

		return true;
	} catch (error) {
		console.error("Failed to copy question markdown", error);
		return false;
	}
}

async function copyQuestionImage(context: NativeQuestionContext): Promise<boolean> {
	const questionElement = context.element;
	const markdown = buildQuestionMarkdown(context);
	const rootStyles = window.getComputedStyle(document.documentElement);
	const captureBackground =
		rootStyles.getPropertyValue("--theme-page").trim() ||
		window.getComputedStyle(questionElement).backgroundColor ||
		"#ffffff";

	try {
		const screenshotBlob = await htmlToImageBlob(questionElement, {
			cacheBust: true,
			pixelRatio: Math.min(window.devicePixelRatio || 2, 2),
			backgroundColor: captureBackground,
			filter: (node) =>
				!(
					node instanceof HTMLElement &&
					node.dataset.copyExclude === "true"
				),
		});

		if (!screenshotBlob) {
			return false;
		}

		const clipboardPayload: Record<string, Blob> = {
			"text/plain": new Blob([markdown], { type: "text/plain" }),
			"image/png": screenshotBlob,
		};

		if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
			await navigator.clipboard.write([new ClipboardItem(clipboardPayload)]);
		} else if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(markdown);
		} else {
			return false;
		}

		return true;
	} catch (error) {
		console.error("Failed to copy question image", error);
		return false;
	}
}

function clearCompareBadge(context: NativeQuestionContext): void {
	context.compareBadge.hidden = true;
	context.compareBadge.classList.remove("is-match", "is-different", "is-incomplete");
	context.compareBadge.textContent = "";
}

function setCompareBadge(context: NativeQuestionContext, result: CompareResult): void {
	context.compareBadge.hidden = false;
	context.compareBadge.classList.remove("is-match", "is-different", "is-incomplete");
	context.compareBadge.classList.add(
		result.kind === "match"
			? "is-match"
			: result.kind === "different"
				? "is-different"
				: "is-incomplete",
	);
	context.compareBadge.textContent = result.message;
}

function compareQuestionAttempt(context: NativeQuestionContext): CompareResult {
	if (context.clozeControls.length > 0) {
		let selectedCount = 0;
		let matchedCount = 0;

		context.clozeControls.forEach((control, index) => {
			const key = getControlKey(control, index, context.slot);
			const current = normalizeText(getControlValue(control));
			const original = normalizeText(context.clozeOriginalValues.get(key));

			if (current !== "") {
				selectedCount += 1;
			}

			if (current === original) {
				matchedCount += 1;
			}
		});

		if (selectedCount === 0) {
			return {
				kind: "incomplete",
				message: "Choose at least one response first.",
			};
		}

		const total = context.clozeControls.length;
		if (matchedCount === total) {
			return {
				kind: "match",
				message: "Matches your attempt.",
			};
		}

		return {
			kind: "different",
			message: `${matchedCount}/${total} parts match your attempt.`,
		};
	}

	if (context.answerInputs.length > 0) {
		const selectedIndexes = context.answerInputs.reduce<number[]>((indexes, input, index) => {
			if (input.checked) {
				indexes.push(index);
			}
			return indexes;
		}, []);

		if (selectedIndexes.length === 0) {
			return {
				kind: "incomplete",
				message: "Select an answer first.",
			};
		}

		const originalIndexes = context.answerOriginalChecked.reduce<number[]>((indexes, checked, index) => {
			if (checked) {
				indexes.push(index);
			}
			return indexes;
		}, []);

		if (areIndexSetsEqual(selectedIndexes, originalIndexes)) {
			return {
				kind: "match",
				message: "Matches your attempt.",
			};
		}

		return {
			kind: "different",
			message: "Different from your attempt.",
		};
	}

	return {
		kind: "incomplete",
		message: "No practice inputs for this question.",
	};
}

function setQuestionReveal(context: NativeQuestionContext, shouldReveal: boolean): void {
	context.revealed = shouldReveal;
	context.element.classList.toggle(REVEALED_CLASS, shouldReveal);

	if (shouldReveal) {
		const result = compareQuestionAttempt(context);
		setCompareBadge(context, result);
		context.revealButton.textContent = "Hide Answer";
	} else {
		clearCompareBadge(context);
		context.revealButton.textContent = "Reveal Answer";
	}
}

function setQuestionStudyMode(context: NativeQuestionContext, enabled: boolean): void {
	context.revealed = false;
	context.element.classList.remove(REVEALED_CLASS);
	clearCompareBadge(context);
	context.practiceTools.hidden = !enabled || !context.canPractice;

	if (enabled) {
		context.revealButton.hidden = !context.canPractice;
		context.revealButton.textContent = "Reveal Answer";

		context.answerInputs.forEach((input) => {
			input.disabled = false;
			input.checked = false;
			input.removeAttribute("checked");
		});

		context.clozeControls.forEach((control, index) => {
			const key = getControlKey(control, index, context.slot);
			if (control instanceof HTMLSelectElement) {
				ensurePlaceholderOption(control);
				control.disabled = false;
				control.value = "";
				control.setAttribute("data-sceless-practice-active", "true");
			} else if (control instanceof HTMLInputElement) {
				control.disabled = false;
				control.readOnly = false;
				control.value = "";
				if (!control.placeholder) {
					control.placeholder = "Type your answer";
				}
				control.setAttribute("data-sceless-practice-active", "true");
			} else if (control instanceof HTMLTextAreaElement) {
				control.disabled = false;
				control.readOnly = false;
				control.value = "";
				if (!control.placeholder) {
					control.placeholder = "Type your answer";
				}
				control.setAttribute("data-sceless-practice-active", "true");
			}

			if (!context.clozeOriginalValues.has(key)) {
				context.clozeOriginalValues.set(key, "");
			}
		});

		return;
	}

	context.revealButton.hidden = true;
	context.revealButton.textContent = "Reveal Answer";

	context.answerInputs.forEach((input, index) => {
		const originalChecked = context.answerOriginalChecked[index] ?? false;
		const originalDisabled = context.answerOriginalDisabled[index] ?? true;

		input.checked = originalChecked;
		if (originalChecked) {
			input.setAttribute("checked", "checked");
		} else {
			input.removeAttribute("checked");
		}
		input.disabled = originalDisabled;
	});

	context.clozeControls.forEach((control, index) => {
		const key = getControlKey(control, index, context.slot);
		const originalValue = context.clozeOriginalValues.get(key) ?? "";
		const originalDisabled = context.clozeOriginalDisabled.get(key) ?? true;
		const originalReadOnly = context.clozeOriginalReadOnly.get(key) ?? false;

		if (control instanceof HTMLSelectElement) {
			removePlaceholderOptions(control);
			control.disabled = originalDisabled;
			control.value = originalValue;
			control.removeAttribute("data-sceless-practice-active");
		} else if (control instanceof HTMLInputElement) {
			control.disabled = originalDisabled;
			control.readOnly = originalReadOnly;
			control.value = originalValue;
			control.removeAttribute("data-sceless-practice-active");
		} else if (control instanceof HTMLTextAreaElement) {
			control.disabled = originalDisabled;
			control.readOnly = originalReadOnly;
			control.value = originalValue;
			control.removeAttribute("data-sceless-practice-active");
		}
	});
}

function findScrollContainer(element: HTMLElement): HTMLElement {
	let current: HTMLElement | null = element.parentElement;

	while (current) {
		const style = window.getComputedStyle(current);

		if (
			/(auto|scroll|overlay)/.test(style.overflowY) &&
			current.scrollHeight > current.clientHeight
		) {
			return current;
		}

		current = current.parentElement;
	}

	return document.scrollingElement instanceof HTMLElement
		? document.scrollingElement
		: document.documentElement;
}

function scrollQuestionIntoView(element: HTMLElement): void {
	const container = findScrollContainer(element);
	const start =
		container === document.documentElement || container === document.body
			? window.scrollY
			: container.scrollTop;
	const containerTop =
		container === document.documentElement || container === document.body
			? 0
			: container.getBoundingClientRect().top;
	const targetTop = element.getBoundingClientRect().top - containerTop + start - 72;
	const distance = targetTop - start;
	const duration = 140;
	const startTime = performance.now();

	const animate = (now: number) => {
		const progress = Math.min((now - startTime) / duration, 1);
		const eased = 1 - Math.pow(1 - progress, 3);
		const nextPosition = start + distance * eased;

		if (container === document.documentElement || container === document.body) {
			window.scrollTo(0, nextPosition);
		} else {
			container.scrollTop = nextPosition;
		}

		if (progress < 1) {
			requestAnimationFrame(animate);
		}
	};

	requestAnimationFrame(animate);
}

function createQuestionTools() {
	const headerTools = document.createElement("div");
	headerTools.className = "sceless-native-question-tools";
	headerTools.dataset.copyExclude = "true";

	const copyMarkdownButton = document.createElement("button");
	copyMarkdownButton.type = "button";
	copyMarkdownButton.className = "sceless-native-tool-button";
	copyMarkdownButton.textContent = "Copy MD";

	const copyImageButton = document.createElement("button");
	copyImageButton.type = "button";
	copyImageButton.className = "sceless-native-tool-button";
	copyImageButton.textContent = "Copy IMG";

	const revealButton = document.createElement("button");
	revealButton.type = "button";
	revealButton.className = "sceless-native-tool-button sceless-native-reveal";
	revealButton.textContent = "Reveal Answer";
	revealButton.hidden = true;

	const compareBadge = document.createElement("span");
	compareBadge.className = "sceless-native-compare";
	compareBadge.hidden = true;

	const practiceTools = document.createElement("div");
	practiceTools.className = "sceless-native-practice-tools";
	practiceTools.dataset.copyExclude = "true";
	practiceTools.hidden = true;

	headerTools.append(copyMarkdownButton, copyImageButton);
	practiceTools.append(revealButton, compareBadge);

	return {
		headerTools,
		practiceTools,
		copyMarkdownButton,
		copyImageButton,
		revealButton,
		compareBadge,
	};
}

function createQuestionContext(
	questionElement: HTMLElement,
	fallbackSlot: number,
	qnButtonClassMap: Map<number, Set<string>>,
): NativeQuestionContext {
	const slot = getQuestionSlot(questionElement, fallbackSlot);
	const questionNumber = getQuestionNumber(questionElement, fallbackSlot);
	const type = getQuestionType(questionElement);
	const state = getText(questionElement, ".state");
	const grade = getText(questionElement, ".grade");
	const listVisualState = getQuestionListVisualState(
		questionElement,
		state,
		qnButtonClassMap.get(slot),
	);

	const answerInputs = Array.from(
		questionElement.querySelectorAll<HTMLInputElement>(
			".answer input[type='radio'], .answer input[type='checkbox']",
		),
	);
	const answerOriginalChecked = answerInputs.map(
		(input) => input.checked || input.hasAttribute("checked"),
	);
	const answerOriginalDisabled = answerInputs.map((input) => input.disabled);

	const clozeControls = Array.from(
		questionElement.querySelectorAll<ClozeControl>(
			".subquestion select, .subquestion input:not([type='hidden']), .subquestion textarea",
		),
	);

	const clozeOriginalValues = new Map<string, string>();
	const clozeOriginalDisabled = new Map<string, boolean>();
	const clozeOriginalReadOnly = new Map<string, boolean>();

	clozeControls.forEach((control, index) => {
		const key = getControlKey(control, index, slot);
		clozeOriginalValues.set(key, getControlValue(control));
		clozeOriginalDisabled.set(key, control.disabled);
		clozeOriginalReadOnly.set(
			key,
			control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement
				? control.readOnly
				: false,
		);
	});

	const {
		headerTools,
		practiceTools,
		copyMarkdownButton,
		copyImageButton,
		revealButton,
		compareBadge,
	} = createQuestionTools();
	const canPractice = answerInputs.length > 0 || clozeControls.length > 0;

	const infoContainer = questionElement.querySelector<HTMLElement>(".info");
	const contentContainer = questionElement.querySelector<HTMLElement>(".content");
	if (infoContainer) {
		infoContainer.append(headerTools);
	} else if (contentContainer) {
		contentContainer.prepend(headerTools);
	} else {
		questionElement.prepend(headerTools);
	}

	if (canPractice) {
		const answerContainer = questionElement.querySelector<HTMLElement>(".answer");
		const answerBlock = questionElement.querySelector<HTMLElement>(".ablock");
		const formulation = questionElement.querySelector<HTMLElement>(".formulation");

		if (answerContainer?.parentElement) {
			answerContainer.insertAdjacentElement("afterend", practiceTools);
		} else if (answerBlock?.parentElement) {
			answerBlock.insertAdjacentElement("afterend", practiceTools);
		} else if (formulation?.parentElement) {
			formulation.insertAdjacentElement("afterend", practiceTools);
		} else if (contentContainer) {
			contentContainer.append(practiceTools);
		} else {
			questionElement.append(practiceTools);
		}
	}

	return {
		element: questionElement,
		slot,
		questionNumber,
		type,
		state,
		grade,
		listTone: listVisualState.tone,
		isFlagged: listVisualState.flagged,
		answerInputs,
		answerOriginalChecked,
		answerOriginalDisabled,
		clozeControls,
		clozeOriginalValues,
		clozeOriginalDisabled,
		clozeOriginalReadOnly,
		revealed: false,
		canPractice,
		practiceTools,
		revealButton,
		compareBadge,
		copyMarkdownButton,
		copyImageButton,
	};
}

function updateQuestionMetadata(context: NativeQuestionContext): void {
	const questionElement = context.element;
	questionElement.classList.add("sceless-native-question");
	questionElement.dataset.questionSlot = String(context.slot);
	questionElement.dataset.questionNumber = context.questionNumber;

	const infoElement = questionElement.querySelector<HTMLElement>(".info");
	infoElement?.classList.add("sceless-native-question-info");

	const titleElement = infoElement?.querySelector<HTMLElement>(".no");
	if (titleElement) {
		titleElement.classList.add("sceless-native-question-title");

		if (titleElement.dataset.scelessStyled !== "true") {
			titleElement.dataset.scelessStyled = "true";
			const titleLabel = document.createElement("span");
			titleLabel.className = "sceless-native-question-title-label";
			titleLabel.textContent = "Question";

			const titleNumber = document.createElement("span");
			titleNumber.className = "sceless-native-question-title-number";
			titleNumber.textContent = context.questionNumber;

			titleElement.replaceChildren(titleLabel, titleNumber);
		}
	}

	infoElement
		?.querySelector<HTMLElement>(".state")
		?.classList.add("sceless-native-question-state");
	infoElement
		?.querySelector<HTMLElement>(".grade")
		?.classList.add("sceless-native-question-grade");
	infoElement
		?.querySelector<HTMLElement>(".questionflag")
		?.classList.add("sceless-native-question-flag");

	questionElement
		.querySelector<HTMLElement>(".qtext")
		?.classList.add("sceless-native-question-prompt");
	questionElement
		.querySelector<HTMLElement>(".content")
		?.classList.add("sceless-native-question-content");
	questionElement
		.querySelector<HTMLElement>(".formulation")
		?.classList.add("sceless-native-formulation");
	questionElement
		.querySelector<HTMLElement>(".ablock")
		?.classList.add("sceless-native-answer-block");

	const answerContainer = questionElement.querySelector<HTMLElement>(".answer");
	answerContainer?.classList.add("sceless-native-answer-list");

	Array.from(questionElement.querySelectorAll<HTMLElement>(".answer > div")).forEach(
		(answerRow) => {
			answerRow.classList.add("sceless-native-answer-row");
		},
	);

	questionElement
		.querySelector<HTMLElement>(".outcome")
		?.classList.add("sceless-native-outcome");
	questionElement
		.querySelector<HTMLElement>(".feedback")
		?.classList.add("sceless-native-feedback");
	questionElement
		.querySelector<HTMLElement>(".specificfeedback")
		?.classList.add("sceless-native-specific-feedback");
	questionElement
		.querySelector<HTMLElement>(".rightanswer")
		?.classList.add("sceless-native-right-answer");
}

export async function mountQuizReviewNative({
	root,
	attemptId,
	showThemeSelector = false,
}: MountQuizReviewNativeOptions): Promise<boolean> {
	const roleMain = document.querySelector<HTMLElement>("#region-main .card-body > div[role='main']")
		?? document.querySelector<HTMLElement>("div[role='main']");
	const questionForm = roleMain?.querySelector<HTMLFormElement>("form.questionflagsaveform");

	if (!(roleMain instanceof HTMLElement) || !(questionForm instanceof HTMLFormElement)) {
		return false;
	}

	const questionElements = Array.from(
		questionForm.querySelectorAll<HTMLElement>(".que"),
	);
	if (questionElements.length === 0) {
		return false;
	}

	const currentHeader = normalizeText(document.querySelector("#page-header h1")?.textContent);
	const rawDocumentTitle = normalizeText(document.title);
	const pageTitleWithoutSite = rawDocumentTitle.split(/\s+[|-]\s+/)[0]?.trim() || rawDocumentTitle;
	const quizNameFromDocumentTitle =
		/attempt review/i.test(pageTitleWithoutSite) && pageTitleWithoutSite.includes(":")
			? pageTitleWithoutSite.split(":")[0]?.trim() || pageTitleWithoutSite
			: pageTitleWithoutSite;
	const pageTitle =
		quizNameFromDocumentTitle ||
		currentHeader ||
		`Quiz Review ${attemptId}`;
	const summaryDescription =
		currentHeader ||
		pageTitleWithoutSite ||
		rawDocumentTitle ||
		`Attempt ${attemptId}`;
	const courseName = getCourseName(pageTitle, summaryDescription);
	const summaryTable = roleMain.querySelector<HTMLElement>(".quizreviewsummary");
	const qnButtonClassMap = buildQnButtonClassMap(document);

	if (summaryTable) {
		summaryTable.classList.add("sceless-native-summary-table");
		Array.from(summaryTable.querySelectorAll<HTMLTableRowElement>("tr")).forEach((row) => {
			row.classList.add("sceless-native-summary-row");
			row
				.querySelector<HTMLElement>("th")
				?.classList.add("sceless-native-summary-key");
			row
				.querySelector<HTMLElement>("td")
				?.classList.add("sceless-native-summary-value");
		});
	}

	root.innerHTML = "";

	const shell = document.createElement("div");
	shell.className = "sceless-native-shell";

	const topBar = document.createElement("header");
	topBar.className = "sceless-native-topbar";

	const titleBlock = document.createElement("div");
	titleBlock.className = "sceless-native-title";
	const title = document.createElement("h1");
	title.textContent = pageTitle;
	const subtitle = document.createElement("p");
	subtitle.textContent = summaryDescription;
	titleBlock.append(title, subtitle);

	const topActions = document.createElement("div");
	topActions.className = "sceless-native-top-actions";
	topActions.dataset.copyExclude = "true";

	const brandLink = document.createElement("a");
	brandLink.className = "sceless-native-brand";
	brandLink.href = "https://scele.cs.ui.ac.id/";
	brandLink.target = "_blank";
	brandLink.rel = "noreferrer noopener";
	brandLink.setAttribute("aria-label", "Open SCELE");

	const brandLogoMount = document.createElement("span");
	brandLogoMount.className = "sceless-native-brand-logo";
	renderPreact(
		h(Logo, {
			class: "sceless-native-brand-svg",
			"aria-hidden": "true",
		}),
		brandLogoMount,
	);

	brandLink.append(brandLogoMount);

	const controls = document.createElement("div");
	controls.className = "sceless-native-controls";
	controls.dataset.copyExclude = "true";

	const studyModeLabel = document.createElement("label");
	studyModeLabel.className = "sceless-native-toggle-card";
	const studyModeInput = document.createElement("input");
	studyModeInput.type = "checkbox";
	const studyModeMeta = document.createElement("span");
	studyModeMeta.className = "sceless-native-toggle-meta";
	const studyModeTitle = document.createElement("strong");
	studyModeTitle.textContent = "Study Mode";
	studyModeMeta.append(studyModeTitle);
	const studyModeTrack = document.createElement("span");
	studyModeTrack.className = "sceless-native-toggle-track";
	studyModeLabel.append(studyModeInput, studyModeMeta, studyModeTrack);

	const oneQuestionLabel = document.createElement("label");
	oneQuestionLabel.className = "sceless-native-toggle-card";
	const oneQuestionInput = document.createElement("input");
	oneQuestionInput.type = "checkbox";
	const oneQuestionMeta = document.createElement("span");
	oneQuestionMeta.className = "sceless-native-toggle-meta";
	const oneQuestionTitle = document.createElement("strong");
	oneQuestionTitle.textContent = "One Question";
	oneQuestionMeta.append(oneQuestionTitle);
	const oneQuestionTrack = document.createElement("span");
	oneQuestionTrack.className = "sceless-native-toggle-track";
	oneQuestionLabel.append(oneQuestionInput, oneQuestionMeta, oneQuestionTrack);

	const exportButton = document.createElement("button");
	exportButton.type = "button";
	exportButton.className = "sceless-native-button";
	exportButton.textContent = "Export PDF";
	exportButton.addEventListener("click", () => {
		void exportQuizReviewPdf({
			shell,
			pageTitle,
			courseName,
		});
	});

	controls.append(studyModeLabel, oneQuestionLabel);

	if (showThemeSelector) {
		const themeLabel = document.createElement("label");
		themeLabel.className = "sceless-native-select";

		const themeText = document.createElement("span");
		themeText.textContent = "Theme";

		const themeSelect = document.createElement("select");
		themeSelect.setAttribute("aria-label", "Theme selector");

		defaultThemes.forEach((themeOption) => {
			const option = document.createElement("option");
			option.value = themeOption.name;
			option.textContent = themeOption.name;
			themeSelect.append(option);
		});

		themeSelect.value = theme.value.name;
		themeSelect.addEventListener("change", (event) => {
			const nextThemeName = (event.currentTarget as HTMLSelectElement).value;
			const nextTheme = defaultThemes.find(
				(themeOption) => themeOption.name === nextThemeName,
			);
			if (!nextTheme) {
				return;
			}

			void changeTheme(nextTheme);
		});

		themeLabel.append(themeText, themeSelect);
		topActions.append(themeLabel);
		
	}
	topActions.append(brandLink);
	topBar.append(titleBlock, topActions);

	const navigation = document.createElement("div");
	navigation.className = "sceless-native-navigation";
	navigation.dataset.copyExclude = "true";
	navigation.hidden = true;

	const previousButton = document.createElement("button");
	previousButton.type = "button";
	previousButton.className = "sceless-native-button";
	previousButton.textContent = "Previous";

	const navigationStatus = document.createElement("span");
	navigationStatus.className = "sceless-native-nav-status";
	navigationStatus.textContent = `1 / ${questionElements.length}`;

	const nextButton = document.createElement("button");
	nextButton.type = "button";
	nextButton.className = "sceless-native-button";
	nextButton.textContent = "Next";

	navigation.append(previousButton, navigationStatus, nextButton);

	const questionNavigation = document.createElement("div");
	questionNavigation.className = "sceless-native-question-navigation";
	questionNavigation.dataset.copyExclude = "true";
	questionNavigation.hidden = true;

	const questionPreviousButton = document.createElement("button");
	questionPreviousButton.type = "button";
	questionPreviousButton.className = "sceless-native-button";
	questionPreviousButton.textContent = "Previous";

	const questionNavigationStatus = document.createElement("span");
	questionNavigationStatus.className = "sceless-native-nav-status";
	questionNavigationStatus.textContent = `1 / ${questionElements.length}`;

	const questionNextButton = document.createElement("button");
	questionNextButton.type = "button";
	questionNextButton.className = "sceless-native-button";
	questionNextButton.textContent = "Next";

	questionNavigation.append(
		questionPreviousButton,
		questionNavigationStatus,
		questionNextButton,
	);

	const questionJump = document.createElement("div");
	questionJump.className = "sceless-native-jump";
	questionJump.dataset.copyExclude = "true";

	const viewCard = document.createElement("section");
	viewCard.className = "sceless-native-aside-card sceless-native-view-controls";
	const viewHeading = document.createElement("h2");
	viewHeading.className = "sceless-native-aside-heading";
	viewHeading.textContent = "View Controls";
	const viewActions = document.createElement("div");
	viewActions.className = "sceless-native-view-actions";
	viewActions.append(exportButton);
	viewCard.append(viewHeading, controls, navigation, viewActions);

	const questionListCard = document.createElement("section");
	questionListCard.className = "sceless-native-aside-card sceless-native-question-list";
	const questionListHeading = document.createElement("h2");
	questionListHeading.className = "sceless-native-aside-heading";
	questionListHeading.textContent = "Question List";
	questionListCard.append(questionListHeading, questionJump);

	const asideTools = document.createElement("div");
	asideTools.className = "sceless-native-aside-tools";
	asideTools.dataset.copyExclude = "true";
	asideTools.append(questionListCard, viewCard);

	const body = document.createElement("div");
	body.className = "sceless-native-body";

	const summaryPanel = document.createElement("section");
	summaryPanel.className = "sceless-native-summary";
	summaryPanel.append(asideTools);

	if (summaryTable) {
		const summaryCard = document.createElement("section");
		summaryCard.className = "sceless-native-aside-card sceless-native-summary-card";
		const summaryHeading = document.createElement("h2");
		summaryHeading.className = "sceless-native-aside-heading";
		summaryHeading.textContent = `Attempt Summary - ${pageTitle}`;
		summaryCard.append(summaryHeading, summaryTable);
	
		summaryPanel.append(summaryCard);
	}

	const questionsPanel = document.createElement("section");
	questionsPanel.className = "sceless-native-questions";
	questionsPanel.append(questionForm, questionNavigation);

	body.append(summaryPanel, questionsPanel);
	shell.append(topBar, body);
	root.append(shell);

	const contexts = questionElements.map((questionElement, index) =>
		createQuestionContext(questionElement, index + 1, qnButtonClassMap),
	);

	contexts.forEach((context) => {
		updateQuestionMetadata(context);
	});

	let oneQuestionModeEnabled = false;
	let studyModeEnabled = false;
	let activeQuestionIndex = 0;

	const jumpButtons = contexts.map((context, index) => {
		const jumpButton = document.createElement("button");
		jumpButton.type = "button";
		jumpButton.className = "sceless-native-jump-button";
		jumpButton.classList.add(`tone-${context.listTone}`);
		jumpButton.classList.toggle("is-flagged", context.isFlagged);

		const jumpNumber = document.createElement("span");
		jumpNumber.className = "sceless-native-jump-number";
		jumpNumber.textContent = context.questionNumber;

		jumpButton.append(jumpNumber);
		jumpButton.title = `Question ${context.questionNumber}${
			context.isFlagged ? " (flagged)" : ""
		}`;
		jumpButton.addEventListener("click", () => {
			moveToQuestion(index);
		});
		questionJump.append(jumpButton);
		return jumpButton;
	});

	const updateVisibility = () => {
		contexts.forEach((context, index) => {
			const visible = !oneQuestionModeEnabled || index === activeQuestionIndex;
			context.element.hidden = !visible;
			jumpButtons[index]?.classList.toggle("is-active", index === activeQuestionIndex);
		});

		navigation.hidden = !oneQuestionModeEnabled;
		questionNavigation.hidden = !oneQuestionModeEnabled;
		navigationStatus.textContent = `${activeQuestionIndex + 1} / ${contexts.length}`;
		questionNavigationStatus.textContent = `${activeQuestionIndex + 1} / ${contexts.length}`;
		previousButton.disabled = !oneQuestionModeEnabled || activeQuestionIndex <= 0;
		questionPreviousButton.disabled =
			!oneQuestionModeEnabled || activeQuestionIndex <= 0;
		nextButton.disabled =
			!oneQuestionModeEnabled || activeQuestionIndex >= contexts.length - 1;
		questionNextButton.disabled =
			!oneQuestionModeEnabled || activeQuestionIndex >= contexts.length - 1;
	};

	const moveToQuestion = (nextIndex: number) => {
		if (nextIndex < 0 || nextIndex >= contexts.length) {
			return;
		}

		activeQuestionIndex = nextIndex;
		updateVisibility();

		const activeContext = contexts[activeQuestionIndex];
		if (activeContext) {
			scrollQuestionIntoView(activeContext.element);
		}
	};

	const setStudyMode = (enabled: boolean) => {
		studyModeEnabled = enabled;
		shell.classList.toggle("sceless-study-mode", enabled);
		contexts.forEach((context) => {
			setQuestionStudyMode(context, enabled);
		});
	};

	studyModeInput.addEventListener("change", () => {
		setStudyMode(studyModeInput.checked);
	});

	oneQuestionInput.addEventListener("change", () => {
		oneQuestionModeEnabled = oneQuestionInput.checked;
		updateVisibility();
		const activeContext = contexts[activeQuestionIndex];
		if (oneQuestionModeEnabled && activeContext) {
			scrollQuestionIntoView(activeContext.element);
		}
	});

	previousButton.addEventListener("click", () => {
		moveToQuestion(activeQuestionIndex - 1);
	});

	nextButton.addEventListener("click", () => {
		moveToQuestion(activeQuestionIndex + 1);
	});

	questionPreviousButton.addEventListener("click", () => {
		moveToQuestion(activeQuestionIndex - 1);
	});

	questionNextButton.addEventListener("click", () => {
		moveToQuestion(activeQuestionIndex + 1);
	});

	contexts.forEach((context) => {
		context.copyMarkdownButton.addEventListener("click", () => {
			void copyQuestionMarkdown(context).then((copied) => {
				if (copied) {
					setTemporaryButtonState(context.copyMarkdownButton, "Copied");
				}
			});
		});

		context.copyImageButton.addEventListener("click", () => {
			void copyQuestionImage(context).then((copied) => {
				if (copied) {
					setTemporaryButtonState(context.copyImageButton, "Copied");
				}
			});
		});

		context.revealButton.addEventListener("click", () => {
			if (!studyModeEnabled) {
				return;
			}

			setQuestionReveal(context, !context.revealed);
		});
	});

	setStudyMode(false);
	updateVisibility();

	return true;
}
