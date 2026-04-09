import type { QuizReviewPayload, RawQuestion } from "@/src/types/quizReview";

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

function normalizeText(value: string | null | undefined): string {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseLocalizedNumber(value: string): number | null {
	const match = value.match(/-?\d+(?:[.,]\d+)?/);
	if (!match) {
		return null;
	}

	const parsed = Number(match[0].replace(",", "."));
	return Number.isFinite(parsed) ? parsed : null;
}

function parseDateToUnix(value: string): number | null {
	const parsed = Date.parse(value);
	if (Number.isNaN(parsed)) {
		return null;
	}

	return Math.floor(parsed / 1000);
}

function getSummaryMap(root: ParentNode): Map<string, string> {
	const summaryRows = root.querySelectorAll<HTMLTableRowElement>(
		".quizreviewsummary tr",
	);
	const summaryMap = new Map<string, string>();

	summaryRows.forEach((row) => {
		const key = normalizeText(row.querySelector("th")?.textContent).toLowerCase();
		const value = normalizeText(row.querySelector("td")?.textContent);

		if (key && value) {
			summaryMap.set(key, value);
		}
	});

	return summaryMap;
}

function getSummaryValue(
	summaryMap: Map<string, string>,
	keywords: string[],
): string {
	for (const [key, value] of summaryMap.entries()) {
		if (keywords.some((keyword) => key.includes(keyword))) {
			return value;
		}
	}

	return "";
}

function parseAttemptNumber(root: ParentNode): number | null {
	const headingText = normalizeText(
		root.querySelector("#page-header h1, h1")?.textContent,
	);
	const match = headingText.match(/(?:attempt|percobaan|usaha)\s*(\d+)/i);

	if (!match) {
		return null;
	}

	const parsed = Number(match[1]);
	return Number.isFinite(parsed) ? parsed : null;
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

function getQuestionNumber(questionElement: HTMLElement, fallbackNumber: number): number {
	const text = normalizeText(questionElement.querySelector(".qno")?.textContent);
	const parsed = Number(text);

	if (!Number.isFinite(parsed)) {
		return fallbackNumber;
	}

	return parsed;
}

function getDocumentRef(root: ParentNode): Document | null {
	if (root instanceof Document) {
		return root;
	}

	return root.ownerDocument;
}

function getQuestionPage(
	root: ParentNode,
	slot: number,
	fallbackPage: number,
): number {
	const navButton = root.querySelector<HTMLElement>(`#quiznavbutton${slot}`);
	const page = Number(navButton?.dataset.quizPage);

	if (!Number.isFinite(page)) {
		return fallbackPage;
	}

	return page;
}

function isQuestionFlagged(
	root: ParentNode,
	questionElement: HTMLElement,
	slot: number,
): boolean {
	const flaggedInput = questionElement.querySelector<HTMLInputElement>(
		".questionflagvalue",
	);
	if (flaggedInput?.value === "1") {
		return true;
	}

	const pressedState = questionElement.querySelector(".questionflag a")?.getAttribute(
		"aria-pressed",
	);
	if (pressedState === "true") {
		return true;
	}

	const navButton = root.querySelector(`#quiznavbutton${slot}`);
	return navButton?.classList.contains("flagged") ?? false;
}

function getQuestions(root: ParentNode): RawQuestion[] {
	const questionNodes = Array.from(
		root.querySelectorAll<HTMLElement>("form.questionflagsaveform .que"),
	);

	return questionNodes.map((questionElement, index) => {
		const fallbackSlot = index + 1;
		const slot = getQuestionSlot(questionElement, fallbackSlot);
		const number = getQuestionNumber(questionElement, fallbackSlot);

		return {
			slot,
			type: getQuestionType(questionElement),
			page: getQuestionPage(root, slot, index),
			html: questionElement.outerHTML,
			status: normalizeText(questionElement.querySelector(".state")?.textContent),
			state: normalizeText(questionElement.querySelector(".state")?.textContent),
			mark: normalizeText(questionElement.querySelector(".grade")?.textContent),
			number,
			flagged: isQuestionFlagged(root, questionElement, slot),
		};
	});
}

export function buildQuizReviewPayloadFromDom(
	root: ParentNode = document,
): QuizReviewPayload | null {
	const questions = getQuestions(root);
	if (questions.length === 0) {
		return null;
	}

	const documentRef = getDocumentRef(root);
	const reviewTitle = normalizeText(documentRef?.title);
	const courseName = normalizeText(
		root.querySelector("#page-header .page-header-headings h1")?.textContent,
	);

	const summaryMap = getSummaryMap(root);
	const grade =
		getSummaryValue(summaryMap, ["grade", "nilai"]) ||
		normalizeText(
			root.querySelector(".quizreviewsummary tr:last-child td")?.textContent,
		);
	const state =
		getSummaryValue(summaryMap, ["state", "status"]) ||
		normalizeText(root.querySelector(".quizreviewsummary")?.textContent);
	const started = getSummaryValue(summaryMap, ["started on", "started", "dimulai"]);
	const completed = getSummaryValue(summaryMap, ["completed on", "completed", "selesai"]);
	const sumgrades = parseLocalizedNumber(grade);
	const attemptNumber = parseAttemptNumber(root);

	const attempt: Record<string, unknown> = {
		state: state || "finished",
		sumgrades: sumgrades ?? "—",
	};

	if (attemptNumber !== null) {
		attempt.attempt = attemptNumber;
	}

	const timestart = parseDateToUnix(started);
	if (timestart !== null) {
		attempt.timestart = timestart;
	}

	const timefinish = parseDateToUnix(completed);
	if (timefinish !== null) {
		attempt.timefinish = timefinish;
	}

	return {
		grade: grade || "—",
		attempt,
		questions,
		reviewTitle: reviewTitle || undefined,
		courseName: courseName || undefined,
	};
}
