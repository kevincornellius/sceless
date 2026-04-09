import { useEffect, useRef, useState } from "preact/hooks";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-preact";
import { toBlob as htmlToImageBlob } from "html-to-image";
import { Logo } from "@/src/components/ui/Logo";
import { getAttemptReview } from "../data/adapter/moodlews/quiz";
import { changeTheme, theme } from "../stores/theme";
import type {
	QuizReviewPageProps,
	QuizReviewPayload,
	ParsedQuestion,
	ParsedReview,
	QuestionVerdict,
	RawQuestion,
	ParsedAnswer,
	ParsedClozeDropdown,
} from "../types/quizReview";
import {
	blobToPng,
	getHtml,
	getText,
	buildQuestionMarkdown,
	fetchImageBlob,
	collectImageSources,
	CopyStatus,
} from "../helper/quizReview";
import { defaultThemes } from "../types/themes";

function formatUnixTime(value: number | null): string {
	if (value === null || Number.isNaN(value)) {
		return "—";
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value * 1000));
}

function getAttemptNumber(
	attempt: Record<string, unknown>,
	key: string,
): number | null {
	const value = attempt[key];
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	return null;
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

function scrollQuestionIntoView(element: HTMLElement) {
	const container = findScrollContainer(element);
	const start =
		container === document.documentElement || container === document.body
			? window.scrollY
			: container.scrollTop;
	const containerTop =
		container === document.documentElement || container === document.body
			? 0
			: container.getBoundingClientRect().top;
	const targetTop =
		element.getBoundingClientRect().top - containerTop + start - 72;
	const distance = targetTop - start;
	const duration = 140;
	const startTime = performance.now();

	const animate = (now: number) => {
		const progress = Math.min((now - startTime) / duration, 1);
		const eased = 1 - Math.pow(1 - progress, 3);
		const nextPosition = start + distance * eased;

		if (
			container === document.documentElement ||
			container === document.body
		) {
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

function resolveVerdict(
	state: string,
	answers: ParsedAnswer[],
): { verdict: QuestionVerdict; verdictLabel: string } {
	const normalized = state.toLowerCase();

	if (normalized.includes("incorrect")) {
		return { verdict: "incorrect", verdictLabel: "Incorrect" };
	}

	if (normalized.includes("partial")) {
		return { verdict: "partial", verdictLabel: "Partial" };
	}

	if (normalized.includes("correct") || normalized.includes("right")) {
		return { verdict: "correct", verdictLabel: "Correct" };
	}

	if (answers.some((answer) => answer.selected && answer.incorrect)) {
		return { verdict: "incorrect", verdictLabel: "Incorrect" };
	}

	if (answers.some((answer) => answer.selected)) {
		return { verdict: "unknown", verdictLabel: "Answered" };
	}

	return { verdict: "unknown", verdictLabel: state || "Unknown" };
}

function getVerdictStyles(verdict: QuestionVerdict) {
	switch (verdict) {
		case "correct":
			return {
				badge: "bg-primary/20 text-primary",
				chip: "border-primary/30 bg-primary/10 text-primary",
				icon: CheckCircle2,
			};
		case "incorrect":
			return {
				badge: "bg-danger/10 text-danger",
				chip: "border-danger/30 bg-danger/10 text-danger",
				icon: XCircle,
			};
		case "partial":
			return {
				badge: "bg-edge text-content",
				chip: "border-edge bg-edge/70 text-content-muted",
				icon: CircleHelp,
			};
		default:
			return {
				badge: "bg-edge text-content-muted",
				chip: "border-edge bg-edge/70 text-content-muted",
				icon: CircleHelp,
			};
	}
}

type PracticeComparisonKind = "match" | "different" | "incomplete";

interface PracticeComparisonResult {
	kind: PracticeComparisonKind;
	message: string;
}

function getPracticeComparisonStyles(kind: PracticeComparisonKind): string {
	switch (kind) {
		case "match":
			return "border-primary/30 bg-primary/10 text-primary";
		case "different":
			return "border-danger/30 bg-danger/10 text-danger";
		default:
			return "border-edge bg-page text-content-muted";
	}
}

function normalizePracticeValue(value: string | null | undefined): string {
	return (value ?? "").trim();
}

function areIndexSetsEqual(left: number[], right: number[]): boolean {
	if (left.length !== right.length) {
		return false;
	}

	const leftSorted = [...left].sort((a, b) => a - b);
	const rightSorted = [...right].sort((a, b) => a - b);

	return leftSorted.every((value, index) => value === rightSorted[index]);
}

const CLOZE_SELECT_CLASSES =
	"p-1.5 border-2 border-primary/40 rounded-lg bg-primary/10 text-content text-sm font-semibold min-w-[11rem] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary";

const CLOZE_INPUT_CLASSES =
	"px-2 py-1.5 border-2 border-primary/40 rounded-lg bg-primary/10 text-content text-sm font-semibold min-w-[10rem] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary";

function escapeHtmlText(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function getMultianswerPrompt(selectNode: HTMLSelectElement, index: number): string {
	const parentCell = selectNode.closest("td");
	const row = parentCell?.closest("tr");
	const table = row?.closest("table");

	if (!row || !table || !parentCell) {
		return `Part ${index + 1}`;
	}

	const rowCells = Array.from(row.children);
	const cellIndex = rowCells.indexOf(parentCell);
	const rowLabel =
		(rowCells[0]?.textContent ?? "").replace(/\s+/g, " ").trim() ||
		`Part ${index + 1}`;
	const headerRow = table.querySelector("tr");
	const headerCells = headerRow ? Array.from(headerRow.children) : [];
	const columnLabel =
		cellIndex >= 0
			? (headerCells[cellIndex]?.textContent ?? "")
					.replace(/\s+/g, " ")
					.trim()
			: "";

	if (!columnLabel || columnLabel === rowLabel) {
		return rowLabel;
	}

	return `${rowLabel} - ${columnLabel}`;
}

function parseFeedbackScore(scoreText: string): number | null {
	const scoreMatch = scoreText.match(/(-?\d+(?:\.\d+)?)(?=\s*out of|\s*$)/i);
	if (!scoreMatch) {
		return null;
	}

	const parsed = Number(scoreMatch[1]);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseMultianswerDropdowns(formulation: HTMLElement): ParsedClozeDropdown[] {
	const subquestions = Array.from(
		formulation.querySelectorAll<HTMLElement>(".subquestion"),
	);

	return subquestions.map((subquestion, index) => {
		const selectNode = subquestion.querySelector<HTMLSelectElement>("select");
		if (!(selectNode instanceof HTMLSelectElement)) {
			return {
				id: `cloze-${index + 1}`,
				prompt: `Part ${index + 1}`,
				options: [],
				originalSelectedValue: null,
				originalSelectedText: "—",
				scoreText: "",
				score: null,
			};
		}

		const options = Array.from(selectNode.options)
			.filter((option) => option.value.trim() !== "")
			.map((option) => ({
				value: option.value,
				label: option.textContent?.replace(/\s+/g, " ").trim() || "",
				selected: option.selected || option.hasAttribute("selected"),
			}));

		const selectedOption =
			options.find((option) => option.selected) ??
			options.find((option) => option.value === selectNode.value) ??
			null;
		const scoreText =
			subquestion
				.querySelector(".feedbackspan")
				?.textContent?.replace(/\s+/g, " ")
				.trim() || "";

		return {
			id: selectNode.id || `cloze-${index + 1}`,
			prompt: getMultianswerPrompt(selectNode, index),
			options,
			originalSelectedValue:
				selectedOption && selectedOption.value.trim() !== ""
					? selectedOption.value
					: null,
			originalSelectedText: selectedOption?.label || "—",
			scoreText,
			score: parseFeedbackScore(scoreText),
		};
	});
}

function createMultianswerRenderHtml(formulation: HTMLElement): string {
	const renderClone = formulation.cloneNode(true) as HTMLElement;
	renderClone.querySelectorAll(".feedbackspan").forEach((node) => node.remove());
	renderClone.querySelectorAll(".accesshide").forEach((node) => node.remove());
	renderClone
		.querySelectorAll("input[type='hidden']")
		.forEach((node) => node.remove());

	Array.from(renderClone.querySelectorAll<HTMLSelectElement>("select")).forEach(
		(selectNode, index) => {
			const practiceId = selectNode.id || `cloze-${index + 1}`;

			if (!selectNode.id) {
				selectNode.id = practiceId;
			}

			selectNode.setAttribute("data-practice-id", practiceId);
			selectNode.removeAttribute("disabled");
			selectNode.setAttribute("class", CLOZE_SELECT_CLASSES);
			selectNode.setAttribute("data-practice-select", "true");
		},
	);

	Array.from(
		renderClone.querySelectorAll<HTMLInputElement>(
			".subquestion input:not([type='hidden'])",
		),
	).forEach((inputNode, index) => {
		const practiceId = inputNode.id || `cloze-input-${index + 1}`;

		if (!inputNode.id) {
			inputNode.id = practiceId;
		}

		inputNode.setAttribute("data-practice-id", practiceId);
		inputNode.removeAttribute("disabled");
		inputNode.removeAttribute("readonly");
		inputNode.setAttribute("class", CLOZE_INPUT_CLASSES);
		inputNode.setAttribute("data-practice-input", "true");
	});

	Array.from(renderClone.querySelectorAll<HTMLTextAreaElement>("textarea")).forEach(
		(textareaNode, index) => {
			const practiceId = textareaNode.id || `cloze-textarea-${index + 1}`;

			if (!textareaNode.id) {
				textareaNode.id = practiceId;
			}

			textareaNode.setAttribute("data-practice-id", practiceId);
			textareaNode.removeAttribute("disabled");
			textareaNode.removeAttribute("readonly");
			textareaNode.setAttribute("data-practice-input", "true");
		},
	);

	return renderClone.innerHTML.trim();
}

function createMaskedPracticeHtml(readyToRenderHtml: string): string {
	if (!readyToRenderHtml) {
		return "";
	}

	const maskedContainer = document.createElement("div");
	maskedContainer.innerHTML = readyToRenderHtml;

	Array.from(maskedContainer.querySelectorAll<HTMLSelectElement>("select")).forEach(
		(selectNode) => {
			Array.from(selectNode.options).forEach((option) => {
				option.removeAttribute("selected");
			});

			let emptyOption = Array.from(selectNode.options).find(
				(option) => option.value.trim() === "",
			);

			if (!emptyOption) {
				emptyOption = document.createElement("option");
				emptyOption.value = "";
				emptyOption.textContent = "Select answer";
				selectNode.prepend(emptyOption);
			}

			emptyOption.setAttribute("selected", "selected");
			selectNode.value = "";
		},
	);

	Array.from(
		maskedContainer.querySelectorAll<HTMLInputElement>(
			".subquestion input:not([type='hidden'])",
		),
	).forEach((inputNode) => {
		inputNode.value = "";
		inputNode.setAttribute("value", "");
		if (!inputNode.hasAttribute("placeholder")) {
			inputNode.setAttribute("placeholder", "Type your answer");
		}
	});

	Array.from(maskedContainer.querySelectorAll<HTMLTextAreaElement>("textarea")).forEach(
		(textareaNode) => {
			textareaNode.value = "";
			textareaNode.textContent = "";
			if (!textareaNode.hasAttribute("placeholder")) {
				textareaNode.setAttribute("placeholder", "Type your answer");
			}
		},
	);

	return maskedContainer.innerHTML.trim();
}

function applyPracticeValuesToHtml(
	html: string,
	valuesById: Record<string, string> | undefined,
): string {
	if (!html || !valuesById || Object.keys(valuesById).length === 0) {
		return html;
	}

	const container = document.createElement("div");
	container.innerHTML = html;

	Array.from(
		container.querySelectorAll<HTMLSelectElement>("[data-practice-select='true']"),
	).forEach((selectNode, index) => {
		const practiceId =
			selectNode.dataset.practiceId || selectNode.id || `cloze-${index + 1}`;
		const storedValue = valuesById[practiceId];

		if (typeof storedValue !== "string") {
			return;
		}

		const hasOption = Array.from(selectNode.options).some(
			(option) => option.value === storedValue,
		);
		selectNode.value = hasOption ? storedValue : "";
	});

	Array.from(
		container.querySelectorAll<HTMLInputElement>("[data-practice-input='true']"),
	).forEach((inputNode, index) => {
		const practiceId =
			inputNode.dataset.practiceId ||
			inputNode.id ||
			`cloze-input-${index + 1}`;
		const storedValue = valuesById[practiceId];

		if (typeof storedValue !== "string") {
			return;
		}

		inputNode.value = storedValue;
		inputNode.setAttribute("value", storedValue);
	});

	Array.from(
		container.querySelectorAll<HTMLTextAreaElement>(
			"textarea[data-practice-input='true']",
		),
	).forEach((textareaNode, index) => {
		const practiceId =
			textareaNode.dataset.practiceId ||
			textareaNode.id ||
			`cloze-textarea-${index + 1}`;
		const storedValue = valuesById[practiceId];

		if (typeof storedValue !== "string") {
			return;
		}

		textareaNode.value = storedValue;
		textareaNode.textContent = storedValue;
	});

	return container.innerHTML.trim();
}

function getClozeOptionLabel(
	dropdown: ParsedClozeDropdown,
	value: string,
): string {
	const option = dropdown.options.find((item) => item.value === value);
	return option?.label || value || "—";
}

function buildMultianswerSummaryAnswers(
	clozeDropdowns: ParsedClozeDropdown[],
): ParsedAnswer[] {
	return clozeDropdowns.map((dropdown) => {
		const hasSelection = dropdown.originalSelectedValue !== null;
		const isIncorrect = hasSelection && dropdown.score === 0;
		const isCorrect = hasSelection && dropdown.score !== null && dropdown.score > 0;

		return {
			labelHtml: `<p><strong>${escapeHtmlText(dropdown.prompt)}</strong></p><p>Selected: ${escapeHtmlText(dropdown.originalSelectedText)}</p>${dropdown.scoreText ? `<p>Score: ${escapeHtmlText(dropdown.scoreText)}</p>` : ""}`,
			selected: hasSelection,
			incorrect: isIncorrect,
			correct: isCorrect,
		};
	});
}

function getQuestionPromptHtml(container: HTMLElement): string {
	const qTextHtml = getHtml(container, ".qtext");
	if (qTextHtml) {
		return qTextHtml;
	}

	const formulation = container.querySelector(".formulation");
	if (!(formulation instanceof HTMLElement)) {
		return "";
	}

	const promptClone = formulation.cloneNode(true) as HTMLElement;
	promptClone
		.querySelectorAll(
			"script, .subquestion, .feedbackspan, .accesshide, input, select, textarea, .questionflag",
		)
		.forEach((node) => node.remove());

	return promptClone.innerHTML.trim();
}

function getPracticeSelectionMode(
	container: HTMLElement,
	isMultianswer: boolean,
): "single" | "multiple" {
	if (isMultianswer) {
		return "multiple";
	}

	const inputs = Array.from(
		container.querySelectorAll<HTMLInputElement>(
			".answer input[type='radio'], .answer input[type='checkbox']",
		),
	);

	if (inputs.some((input) => input.type === "checkbox")) {
		return "multiple";
	}

	if (inputs.some((input) => input.type === "radio")) {
		return "single";
	}

	return "multiple";
}

function parseQuestion(question: RawQuestion): ParsedQuestion {
	const container = document.createElement("div");
	container.innerHTML = question.html || "";
	container.querySelectorAll("script").forEach((node) => node.remove());

	const questionNumber =
		getText(container, ".qno") || String(question.number ?? question.slot);
	const state =
		getText(container, ".state") || question.status || question.state || "";
	const grade = getText(container, ".grade") || question.mark || "";
	const flagged = Boolean(question.flagged);
	const questionHtml = getQuestionPromptHtml(container);
	const feedbackHtml = getHtml(container, ".specificfeedback");
	const rightAnswerHtml = getHtml(container, ".rightanswer");
	const formulation = container.querySelector(".formulation");
	const isMultianswer = question.type === "multianswer";
	const practiceSelectionMode = getPracticeSelectionMode(
		container,
		isMultianswer,
	);
	const clozeDropdowns =
		isMultianswer && formulation instanceof HTMLElement
			? parseMultianswerDropdowns(formulation)
			: [];
	const readyToRenderHtml =
		isMultianswer && formulation instanceof HTMLElement
			? createMultianswerRenderHtml(formulation)
			: "";

	const answers =
		isMultianswer
			? buildMultianswerSummaryAnswers(clozeDropdowns)
			: Array.from(container.querySelectorAll(".answer > div")).map(
					(option) => {
						const labelNode = option.querySelector(
							"[data-region='answer-label']",
						);
						const selected =
							option.classList.contains("incorrect") ||
							option.querySelector("input[checked]") !== null ||
							option.querySelector("input:checked") !== null;

						return {
							labelHtml:
								labelNode?.innerHTML?.trim() || option.innerHTML.trim(),
							selected,
							incorrect: option.classList.contains("incorrect"),
							correct: option.classList.contains("correct"),
						};
					},
			  );

	const { verdict, verdictLabel } = resolveVerdict(state, answers);

	return {
		slot: question.slot,
		type: question.type,
		page: question.page,
		questionNumber,
		practiceSelectionMode,
		state,
		verdict,
		verdictLabel,
		grade,
		flagged,
		questionHtml,
		readyToRenderHtml,
		clozeDropdowns,
		answers,
		feedbackHtml,
		rightAnswerHtml,
		hasRenderedBlock: Boolean(
			questionHtml ||
			readyToRenderHtml ||
			clozeDropdowns.length ||
			answers.length ||
			feedbackHtml ||
			rightAnswerHtml,
		),
	};
}

function parseReview(review: QuizReviewPayload): ParsedReview {
	const questions = (review.questions ?? []).map(parseQuestion);
	const attempt = review.attempt ?? {};
	const timestart = getAttemptNumber(attempt, "timestart");
	const timefinish = getAttemptNumber(attempt, "timefinish");
	const sumgrades = attempt.sumgrades;

	return {
		grade: String(review.grade ?? "—"),
		displayTitle: String(review.reviewTitle ?? ""),
		courseName: String(review.courseName ?? ""),
		attemptLabel:
			review.attempt && typeof review.attempt.attempt !== "undefined"
				? `Attempt ${String(review.attempt.attempt)}`
				: "Attempt",
		state:
			review.attempt && typeof review.attempt.state !== "undefined"
				? String(review.attempt.state)
				: "finished",
		questionCount: questions.length,
		timestart,
		timefinish,
		sumgrades:
			typeof sumgrades === "number"
				? sumgrades
				: String(sumgrades ?? "—"),
		questions,
	};
}

export default function QuizReviewPage({
	attemptId,
	initialPayload = null,
	showThemeSelector = false,
}: QuizReviewPageProps) {
	const [review, setReview] = useState<ParsedReview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showOneQuestionAtATime, setShowOneQuestionAtATime] = useState(false);
	const [studyModeActive, setStudyModeActive] = useState(false);
	const [answeredRevealed, setAnsweredRevealed] = useState<
		Record<number, boolean>
	>({});
	const [activeQuestionSlot, setActiveQuestionSlot] = useState<number | null>(
		null,
	);
	const [copiedQuestionStatus, setCopiedQuestionStatus] =
		useState<CopyStatus | null>(null);
	const [practiceSelections, setPracticeSelections] = useState<
		Record<number, number[]>
	>({});
	const [practiceClozeSelections, setPracticeClozeSelections] = useState<
		Record<number, Record<string, string>>
	>({});
	const [practiceComparisons, setPracticeComparisons] = useState<
		Record<number, PracticeComparisonResult>
	>({});
	const pageContainerRef = useRef<HTMLDivElement>(null);
	const copiedResetTimerRef = useRef<number | null>(null);

	const clearPracticeComparison = (questionSlot: number) => {
		setPracticeComparisons((current) => {
			if (!current[questionSlot]) {
				return current;
			}

			const next = { ...current };
			delete next[questionSlot];
			return next;
		});
	};

	const setPracticeClozeValues = (
		questionSlot: number,
		valuesById: Record<string, string>,
	) => {
		if (Object.keys(valuesById).length === 0) {
			return;
		}

		setPracticeClozeSelections((current) => ({
			...current,
			[questionSlot]: {
				...(current[questionSlot] ?? {}),
				...valuesById,
			},
		}));
	};

	const readPracticeClozeValuesFromDom = (
		questionSlot: number,
	): Record<string, string> => {
		const questionElement = document.getElementById(`question-${questionSlot}`);
		if (!(questionElement instanceof HTMLElement)) {
			return {};
		}

		const valuesById: Record<string, string> = {};

		Array.from(
			questionElement.querySelectorAll<HTMLSelectElement>(
				"[data-practice-select='true']",
			),
		).forEach((selectNode, index) => {
			const practiceId =
				selectNode.dataset.practiceId ||
				selectNode.id ||
				`cloze-${index + 1}`;
			valuesById[practiceId] = normalizePracticeValue(selectNode.value);
		});

		Array.from(
			questionElement.querySelectorAll<HTMLInputElement>(
				"[data-practice-input='true']",
			),
		).forEach((inputNode, index) => {
			const practiceId =
				inputNode.dataset.practiceId ||
				inputNode.id ||
				`cloze-input-${index + 1}`;
			valuesById[practiceId] = normalizePracticeValue(inputNode.value);
		});

		Array.from(
			questionElement.querySelectorAll<HTMLTextAreaElement>(
				"textarea[data-practice-input='true']",
			),
		).forEach((textareaNode, index) => {
			const practiceId =
				textareaNode.dataset.practiceId ||
				textareaNode.id ||
				`cloze-textarea-${index + 1}`;
			valuesById[practiceId] = normalizePracticeValue(textareaNode.value);
		});

		return valuesById;
	};

	const togglePracticeSelection = (
		question: ParsedQuestion,
		answerIndex: number,
	) => {
		const questionSlot = question.slot;
		const selectionMode = question.practiceSelectionMode;

		setPracticeSelections((current) => {
			const existing = current[questionSlot] ?? [];
			const next =
				selectionMode === "single"
					? existing.includes(answerIndex)
						? existing
						: [answerIndex]
					: existing.includes(answerIndex)
						? existing.filter((index) => index !== answerIndex)
						: [...existing, answerIndex];

			return {
				...current,
				[questionSlot]: next,
			};
		});

		clearPracticeComparison(questionSlot);
	};

	const setPracticeComparison = (
		questionSlot: number,
		result: PracticeComparisonResult,
	) => {
		setPracticeComparisons((current) => ({
			...current,
			[questionSlot]: result,
		}));
	};

	const compareQuestionAttempt = (
		question: ParsedQuestion,
		clozeSelectionOverride?: Record<string, string>,
	) => {
		const isMultianswerPractice =
			question.type === "multianswer" && question.readyToRenderHtml.length > 0;

		if (isMultianswerPractice && question.clozeDropdowns.length > 0) {
			const mergedSelections = {
				...(practiceClozeSelections[question.slot] ?? {}),
				...readPracticeClozeValuesFromDom(question.slot),
				...(clozeSelectionOverride ?? {}),
			};
			setPracticeClozeValues(question.slot, mergedSelections);

			const hasAnySelection = question.clozeDropdowns.some((dropdown, index) => {
				const key = dropdown.id || `cloze-${index + 1}`;
				return normalizePracticeValue(mergedSelections[key]) !== "";
			});

			if (!hasAnySelection) {
				setPracticeComparison(question.slot, {
					kind: "incomplete",
					message: "Choose at least one option first.",
				});
				return;
			}

			const total = question.clozeDropdowns.length;
			const matchedCount = question.clozeDropdowns.filter(
				(dropdown, index) => {
					const key = dropdown.id || `cloze-${index + 1}`;
					const currentValue = normalizePracticeValue(mergedSelections[key]);
					const knownValue = normalizePracticeValue(
						dropdown.originalSelectedValue,
					);

					return currentValue === knownValue;
				},
			).length;

			setPracticeComparison(question.slot, {
				kind: matchedCount === total ? "match" : "different",
				message:
					matchedCount === total
						? "Matches your attempt."
						: `${matchedCount}/${total} parts match your attempt.`,
			});

			return;
		}

		const knownSelectionIndexes = question.answers.reduce<number[]>(
			(indices, answer, index) => {
				if (answer.selected) {
					indices.push(index);
				}

				return indices;
			},
			[],
		);
		const selectedIndexes = practiceSelections[question.slot] ?? [];

		if (selectedIndexes.length === 0) {
			setPracticeComparison(question.slot, {
				kind: "incomplete",
				message: "Select an answer first.",
			});
			return;
		}

		setPracticeComparison(question.slot, {
			kind: areIndexSetsEqual(selectedIndexes, knownSelectionIndexes)
				? "match"
				: "different",
			message: areIndexSetsEqual(selectedIndexes, knownSelectionIndexes)
				? "Matches your attempt."
				: "Different from your attempt.",
		});
	};

	const toggleRevealAnswer = (question: ParsedQuestion) => {
		const questionSlot = question.slot;
		const currentlyRevealed = answeredRevealed[questionSlot] ?? false;

		if (!currentlyRevealed) {
			const latestFromDom = readPracticeClozeValuesFromDom(questionSlot);
			if (Object.keys(latestFromDom).length > 0) {
				setPracticeClozeValues(questionSlot, latestFromDom);
			}

			compareQuestionAttempt(question, latestFromDom);
		} else {
			clearPracticeComparison(questionSlot);
		}

		setAnsweredRevealed((current) => ({
			...current,
			[questionSlot]: !current[questionSlot],
		}));
	};

	useEffect(() => {
		let cancelled = false;

		const loadReview = async () => {
			setIsLoading(true);
			setError(null);

			try {
				if (initialPayload) {
					setReview(parseReview(initialPayload));
					return;
				}

				const pageParam = new URLSearchParams(
					window.location.search,
				).get("page");
				const page =
					pageParam !== null && Number.isFinite(Number(pageParam))
						? Number(pageParam)
						: -1;
				const payload = (await getAttemptReview(
					Number(attemptId),
					page,
				)) as QuizReviewPayload | undefined;

				if (cancelled) return;

				if (!payload) {
					setReview(null);
					setError("No data returned.");
					return;
				}

				setReview(parseReview(payload));
			} catch (err) {
				if (cancelled) return;

				setError(
					err instanceof Error
						? err.message
						: "Failed to load quiz review.",
				);
				setReview(null);
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		loadReview();

		return () => {
			cancelled = true;
		};
	}, [attemptId, initialPayload]);

	useEffect(() => {
		if (!review || review.questions.length === 0) {
			setActiveQuestionSlot(null);
			return;
		}

		setActiveQuestionSlot((current) => {
			if (current === null) {
				return review.questions[0].slot;
			}

			if (
				!review.questions.some((question) => question.slot === current)
			) {
				return review.questions[0].slot;
			}

			return current;
		});
	}, [review]);

	useEffect(() => {
		setPracticeSelections({});
		setPracticeClozeSelections({});
		setPracticeComparisons({});
	}, [review]);

	useEffect(() => {
		return () => {
			if (copiedResetTimerRef.current !== null) {
				window.clearTimeout(copiedResetTimerRef.current);
			}
		};
	}, []);

	const activeQuestion =
		review?.questions.find(
			(question) => question.slot === activeQuestionSlot,
		) ??
		review?.questions[0] ??
		null;
	const activeQuestionIndex =
		review && activeQuestion
			? review.questions.findIndex(
					(question) => question.slot === activeQuestion.slot,
				)
			: -1;
	const hasPreviousQuestion = activeQuestionIndex > 0;
	const hasNextQuestion =
		review !== null &&
		activeQuestionIndex >= 0 &&
		activeQuestionIndex < review.questions.length - 1;

	const selectQuestion = (questionSlot: number) => {
		setActiveQuestionSlot(questionSlot);

		if (showOneQuestionAtATime) {
			pageContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const goToPreviousQuestion = () => {
		if (!review || activeQuestionIndex <= 0) {
			return;
		}

		const previousQuestion = review.questions[activeQuestionIndex - 1];
		if (!previousQuestion) {
			return;
		}

		selectQuestion(previousQuestion.slot);
	};

	const goToNextQuestion = () => {
		if (
			!review ||
			activeQuestionIndex < 0 ||
			activeQuestionIndex >= review.questions.length - 1
		) {
			return;
		}

		const nextQuestion = review.questions[activeQuestionIndex + 1];
		if (!nextQuestion) {
			return;
		}

		selectQuestion(nextQuestion.slot);
	};

	const exportQuizToPdf = () => {
		if (!review) {
			return;
		}

		const iframe = document.createElement("iframe");
		iframe.setAttribute("aria-hidden", "true");
		iframe.tabIndex = -1;
		iframe.style.position = "fixed";
		iframe.style.left = "0";
		iframe.style.top = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.opacity = "0";
		iframe.style.border = "0";
		iframe.style.pointerEvents = "none";
		document.body.appendChild(iframe);

		const cleanup = () => {
			iframe.remove();
		};

		const escapeHtml = (value: string) =>
			value
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;")
				.replaceAll('"', "&quot;")
				.replaceAll("'", "&#39;");

		const buildQuestionPrintHtml = (question: ParsedQuestion) => {
			const isMultianswerQuestion =
				question.type === "multianswer" &&
				question.readyToRenderHtml.trim().length > 0;
			const answerItems = question.answers
				.map((answer) => {
					const answerClass = answer.selected
						? answer.incorrect
							? "answer answer-incorrect"
							: "answer answer-selected"
						: "answer";
					const answerHtml = answer.labelHtml.trim();

					return `<div class="${answerClass}"><div class="answer-bullet"></div><div class="answer-body">${answerHtml}</div></div>`;
				})
				.join("");

			const feedbackHtml = question.feedbackHtml
				? `<section class="panel panel-muted"><div class="section-title">Feedback</div><div class="richtext">${question.feedbackHtml}</div></section>`
				: "";
			const rightAnswerHtml = question.rightAnswerHtml
				? `<section class="panel panel-correct"><div class="section-title">Correct Answer</div><div class="richtext">${question.rightAnswerHtml}</div></section>`
				: "";
			const questionBodyHtml = isMultianswerQuestion
				? `<section class="panel"><div class="section-title">Practice Table</div><div class="richtext cloze-richtext">${question.readyToRenderHtml}</div></section>`
				: question.questionHtml
					? `<section class="panel"><div class="richtext">${question.questionHtml}</div></section>`
					: "";
			const answersHtml =
				!isMultianswerQuestion && answerItems
					? `<section class="answers">${answerItems}</section>`
					: "";

			return `
				<article class="question-card">
					<header class="question-head">
						<div class="question-meta">
							<span class="question-pill">Q${escapeHtml(question.questionNumber)}</span>
							<span class="question-type">${escapeHtml(question.type)}</span>
							${question.state ? `<span class="question-state">${escapeHtml(question.state)}</span>` : ""}
						</div>
						<div class="question-meta">
							${question.grade ? `<span class="question-grade">${escapeHtml(question.grade)}</span>` : ""}
							<span class="question-verdict ${escapeHtml(question.verdict)}">${escapeHtml(question.verdictLabel)}</span>
						</div>
					</header>
					<div class="question-body">
						${questionBodyHtml}
						${answersHtml}
						${feedbackHtml}
						${rightAnswerHtml}
					</div>
				</article>
			`;
		};

		const printHtml = review.questions.map(buildQuestionPrintHtml).join("");
		const documentTitle = `${review.displayTitle || "Quiz Review"}`;
		const activeTheme = theme.value;
		const summaryHeader = `
			<header class="document-header">
				<div>
					<div class="eyebrow">${escapeHtml(review.courseName || "Review")}</div>
					<h1>${escapeHtml(documentTitle)}</h1>
					<p>Rendered with sceless.</p>
				</div>
				<div class="summary-grid">
					<div class="summary-card">
						<span>Attempt</span>
						<strong>${escapeHtml(review.attemptLabel)}</strong>
					</div>
					<div class="summary-card">
						<span>Grade</span>
						<strong>${escapeHtml(review.grade)}</strong>
					</div>
					<div class="summary-card">
						<span>Questions</span>
						<strong>${escapeHtml(String(review.questionCount))}</strong>
					</div>
					<div class="summary-card">
						<span>Sum Grades</span>
						<strong>${escapeHtml(String(review.sumgrades))}</strong>
					</div>
					<div class="summary-card">
						<span>Time Start</span>
						<strong>${escapeHtml(formatUnixTime(review.timestart))}</strong>
					</div>
					<div class="summary-card">
						<span>Time Finish</span>
						<strong>${escapeHtml(formatUnixTime(review.timefinish))}</strong>
					</div>
				</div>
			</header>
		`;
		const html = `<!doctype html>
		<html>
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>${escapeHtml(documentTitle)}</title>
			<style>
				@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

				:root {
					color-scheme: light;
					--bg: ${activeTheme.bg};
					--page: ${activeTheme.bg};
					--page-secondary: ${activeTheme.bgSecondary};
					--page-accent: ${activeTheme.highlight};
					--edge: ${activeTheme.border};
					--content: ${activeTheme.text};
					--content-muted: ${activeTheme.textMuted};
					--primary: ${activeTheme.primary};
					--primary-strong: ${activeTheme.primaryDark};
					--on-primary: ${activeTheme.onPrimary};
					--danger: ${activeTheme.danger};
					--success: ${activeTheme.success};
				}
				* { box-sizing: border-box; }
				body {
					margin: 0;
					padding: 10px;
					background: var(--bg);
					color: var(--content);
					font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif;
					-webkit-font-smoothing: antialiased;
					text-rendering: optimizeLegibility;
				}
				.document-header {
					display: grid;
					grid-template-columns: minmax(0, 1fr) minmax(210px, 320px);
					gap: 8px;
					align-items: start;
					padding: 9px 10px 8px;
					margin-bottom: 8px;
					background: linear-gradient(
						135deg,
						color-mix(in srgb, var(--primary) 12%, var(--page)),
						color-mix(in srgb, var(--page-secondary) 88%, var(--page))
					);
					border: 1px solid color-mix(in srgb, var(--primary) 22%, white);
					border-radius: 14px;
				}
				.brand-row {
					display: inline-flex;
					align-items: center;
					gap: 6px;
					margin-bottom: 6px;
				}
				.brand-mark {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 26px;
					height: 14px;
					color: var(--primary-strong);
				}
				.brand-mark svg {
					width: 100%;
					height: 100%;
					display: block;
				}
				.brand-word {
					font-size: 10px;
					font-weight: 800;
					letter-spacing: 0.1em;
					text-transform: uppercase;
					color: var(--content-muted);
				}
				.eyebrow {
					display: inline-flex;
					align-items: center;
					padding: 3px 7px;
					border-radius: 999px;
					background: color-mix(in srgb, var(--primary) 14%, white);
					color: var(--primary-strong);
					font-size: 9px;
					font-weight: 800;
					letter-spacing: 0.08em;
					text-transform: uppercase;
					margin-bottom: 6px;
				}
				.document-header h1 {
					margin: 0;
					font-size: 18px;
					line-height: 1.1;
					letter-spacing: -0.02em;
				}
				.document-header p {
					margin: 5px 0 0;
					max-width: 56ch;
					color: var(--content-muted);
					font-size: 10px;
					line-height: 1.4;
				}
				.summary-grid {
					display: grid;
					grid-template-columns: repeat(2, minmax(0, 1fr));
					gap: 6px;
				}
				.summary-card {
					padding: 3px 4px;
					border-radius: 10px;
					border: 1px solid color-mix(in srgb, var(--primary) 18%, white);
					background: color-mix(in srgb, var(--page) 88%, var(--primary) 12%);
				}
				.summary-card span {
					display: block;
					font-size: 7px;
					font-weight: 800;
					text-transform: uppercase;
					letter-spacing: 0.08em;
					color: var(--content-muted);
					margin-bottom: 3px;
				}
				.summary-card strong {
					display: block;
					font-size: 10px;
					line-height: 1.2;
					color: var(--content);
				}
				.questions {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}
				.question-card {
					background: var(--page);
					border: 1px solid color-mix(in srgb, var(--edge) 88%, white);
					border-radius: 12px;
					overflow: hidden;
					break-inside: avoid;
					page-break-inside: avoid;
				}
				.question-head {
					display: flex;
					justify-content: space-between;
					gap: 12px;
					padding: 3px 6px;
					background: var(--page-secondary);
					border-bottom: 1px solid color-mix(in srgb, var(--edge) 88%, white);
					flex-wrap: wrap;
				}
				.question-meta {
					display: flex;
					gap: 4px;
					align-items: center;
					flex-wrap: wrap;
				}
				.question-pill,
				.question-state,
				.question-grade,
				.question-verdict,
				.question-type {
					display: inline-flex;
					align-items: center;
					border-radius: 999px;
					padding: 3px 6px;
					font-size: 8px;
					font-weight: 700;
					line-height: 1;
				}
				.question-pill { background: var(--primary); color: var(--on-primary); }
				.question-type { background: color-mix(in srgb, var(--edge) 38%, var(--page)); color: var(--content); }
				.question-state { background: color-mix(in srgb, var(--edge) 38%, var(--page)); color: var(--content-muted); }
				.question-grade { background: color-mix(in srgb, var(--primary) 18%, white); color: var(--primary-strong); }
				.question-verdict.correct { background: color-mix(in srgb, var(--primary) 18%, white); color: var(--primary-strong); }
				.question-verdict.incorrect { background: color-mix(in srgb, var(--danger) 18%, white); color: var(--danger); }
				.question-verdict.partial,
				.question-verdict.unknown { background: color-mix(in srgb, var(--edge) 38%, var(--page)); color: var(--content-muted); }
				.question-body { padding: 10px; display: grid; gap: 8px; }
				.panel {
					/* border intentionally omitted for cleaner print cards */
					border-radius: 10px;
					background: var(--page-secondary);
					padding: 9px;
				}
				.panel-muted { background: color-mix(in srgb, var(--page-secondary) 88%, var(--page)); }
				.panel-correct { background: color-mix(in srgb, var(--primary) 6%, white); border-color: color-mix(in srgb, var(--primary) 28%, white); }
				.section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--content-muted); margin-bottom: 5px; }
				.answers { display: grid; gap: 6px; }
				.answer {
					display: flex;
					gap: 5px;
					align-items: flex-start;
					padding: 4px 6px;
					border-radius: 8px;
					border: 1px solid color-mix(in srgb, var(--edge) 88%, white);
					background: var(--page-secondary);
				}
				.answer-selected { border-color: color-mix(in srgb, var(--primary) 38%, white); background: color-mix(in srgb, var(--primary) 8%, white); }
				.answer-incorrect { border-color: color-mix(in srgb, var(--danger) 38%, white); background: color-mix(in srgb, var(--danger) 8%, white); }
				.answer-bullet {
					width: 8px;
					height: 8px;
					border-radius: 999px;
					margin-top: 3px;
					border: 2px solid color-mix(in srgb, var(--edge) 85%, white);
					background: white;
					flex: none;
				}
				.answer-selected .answer-bullet { border-color: var(--primary); background: var(--primary); }
				.answer-incorrect .answer-bullet { border-color: var(--danger); background: var(--danger); }
				.answer-body, .richtext { font-size: 12px; line-height: 1.35; }
				.answer-body > :first-child { margin-top: 0 !important; }
				.answer-body > :last-child { margin-bottom: 0 !important; }
				.answer-body .answernumber {
					display: inline;
					margin-right: 0.2rem;
				}
				.answer-body .flex-fill {
					display: inline-block;
					vertical-align: top;
					min-width: 0;
				}
				.answer-body .flex-fill > :first-child { margin-top: 0 !important; }
				.answer-body .flex-fill > :last-child { margin-bottom: 0 !important; }
				.answer-body .flex-fill p { display: inline; margin: 0; }
				.answer-body p { margin: 0 0 0.35em; }
				.answer-body img,
				.richtext img {
					max-width: 58%;
					max-height: none;
					width: auto;
					height: auto;
					display: block;
				}
				.richtext p { margin: 0 0 0.5em; }
				.richtext p:last-child { margin-bottom: 0; }
				.richtext table { border-collapse: collapse; }
				.richtext td, .richtext th { border: 1px solid var(--edge); padding: 4px 6px; }
				.cloze-richtext [data-practice-select='true'],
				.cloze-richtext [data-practice-input='true'],
				.cloze-richtext textarea {
					padding: 4px 8px;
					border: 1.5px solid color-mix(in srgb, var(--primary) 42%, white);
					border-radius: 8px;
					background: color-mix(in srgb, var(--primary) 10%, white);
					color: var(--content);
					font: inherit;
					min-width: 10rem;
				}
				.cloze-richtext [data-practice-select='true'] { min-width: 11rem; }
				.richtext a { color: var(--primary); }
				.richtext ul, .richtext ol { padding-left: 1rem; margin: 0.15rem 0 0.45rem; }
				.richtext li { margin-bottom: 0.15rem; }
				@page { margin: 8mm; }
				@media print {
					body { background: white; padding: 0; }
					.question-card { break-inside: avoid; page-break-inside: avoid; }
				}
			</style>
		</head>
		<body>
			${summaryHeader}
			<div class="questions">${printHtml}</div>
		</body>
		</html>`;

		iframe.addEventListener(
			"load",
			() => {
				const frameWindow = iframe.contentWindow;
				const frameDocument = iframe.contentDocument;

				if (!frameWindow || !frameDocument) {
					cleanup();
					return;
				}

				const waitForImages = Array.from(frameDocument.images).map(
					(image) => {
						if (image.complete) {
							return Promise.resolve();
						}

						return new Promise<void>((resolve) => {
							image.addEventListener("load", () => resolve(), {
								once: true,
							});
							image.addEventListener("error", () => resolve(), {
								once: true,
							});
						});
					},
				);

				const handleAfterPrint = () => {
					frameWindow.removeEventListener(
						"afterprint",
						handleAfterPrint,
					);
					cleanup();
				};

				frameWindow.addEventListener("afterprint", handleAfterPrint);
				Promise.all(waitForImages).then(() => {
					frameWindow.focus();
					frameWindow.print();
					window.setTimeout(cleanup, 1000);
				});
			},
			{ once: true },
		);

		iframe.srcdoc = html;
	};

	const copyQuestionMarkdownToClipboard = async (
		question: ParsedQuestion,
	) => {
		const markdown = buildQuestionMarkdown(question);
		const imageSources = collectImageSources(
			question.questionHtml,
			...question.answers.map((answer) => answer.labelHtml),
			question.feedbackHtml,
			question.rightAnswerHtml,
		);
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

			if (
				navigator.clipboard?.write &&
				typeof ClipboardItem !== "undefined"
			) {
				await navigator.clipboard.write([
					new ClipboardItem(clipboardPayload),
				]);
			} else if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(markdown);
			}

			setCopiedQuestionStatus({ slot: question.slot, mode: "markdown" });
			if (copiedResetTimerRef.current !== null) {
				window.clearTimeout(copiedResetTimerRef.current);
			}
			copiedResetTimerRef.current = window.setTimeout(() => {
				setCopiedQuestionStatus(null);
			}, 1200);
		} catch (copyError) {
			console.error("Failed to copy question content", copyError);
		}
	};

	const copyQuestionScreenshotToClipboard = async (
		question: ParsedQuestion,
	) => {
		const questionElement = document.getElementById(
			`question-${question.slot}`,
		);

		if (!(questionElement instanceof HTMLElement)) {
			return;
		}

		const markdown = buildQuestionMarkdown(question);
		const rootStyles = window.getComputedStyle(document.documentElement);
		const captureBackground =
			rootStyles.getPropertyValue("--page").trim() ||
			rootStyles.getPropertyValue("--bg").trim() ||
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

			const clipboardPayload: Record<string, Blob> = {
				"text/plain": new Blob([markdown], { type: "text/plain" }),
			};

			if (screenshotBlob) {
				clipboardPayload["image/png"] = screenshotBlob;
			}

			if (
				navigator.clipboard?.write &&
				typeof ClipboardItem !== "undefined"
			) {
				await navigator.clipboard.write([
					new ClipboardItem(clipboardPayload),
				]);
			} else if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(markdown);
			}

			setCopiedQuestionStatus({ slot: question.slot, mode: "image" });
			if (copiedResetTimerRef.current !== null) {
				window.clearTimeout(copiedResetTimerRef.current);
			}
			copiedResetTimerRef.current = window.setTimeout(() => {
				setCopiedQuestionStatus(null);
			}, 1200);
		} catch (copyError) {
			console.error("Failed to copy question screenshot", copyError);
		}
	};
	const questionsToRender = review
		? showOneQuestionAtATime && activeQuestion
			? [activeQuestion]
			: review.questions
		: [];
	const displayTitle = review?.displayTitle || `Quiz Review ${attemptId}`;
	const courseName = review?.courseName || "";

	const handleThemeChange = async (event: Event) => {
		const nextThemeName = (event.currentTarget as HTMLSelectElement).value;
		const nextTheme = defaultThemes.find((item) => item.name === nextThemeName);

		if (!nextTheme) {
			return;
		}

		await changeTheme(nextTheme);
	};

	return (
		<div
			ref={pageContainerRef}
			class="p-4 lg:p-6 h-full overflow-y-auto"
			style={{
				fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif",
			}}
		>
			<div class="mb-5 flex flex-col gap-3">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="flex min-w-0 items-center gap-3">
						<div class="rounded-2xl! border border-edge bg-page px-3 py-2">
							<Logo class="w-24 text-primary" />
						</div>
						<div class="min-w-0">
							<h1 class="truncate text-xl font-bold text-content">
								{displayTitle}
							</h1>
							{courseName && (
								<p class="mt-1 text-xs font-semibold text-content-muted">
									{courseName}
								</p>
							)}
						</div>
					</div>
					<div class="ml-auto flex flex-col items-end gap-2">
						{showThemeSelector && (
							<label class="flex items-center rounded-xl! border border-edge bg-page px-2.5 py-1.5">
								<span class="text-[10px] font-semibold uppercase tracking-wide text-content-muted">
									Theme
								</span>
								<select
									value={theme.value.name}
									onChange={(event) => {
										void handleThemeChange(event);
									}}
									class="rounded-xl! ml-4 border-2 border-edge bg-page-secondary px-2.5 py-1.5 text-xs font-semibold text-content focus:outline-none focus:ring-2 focus:ring-primary/40"
								>
									{defaultThemes.map((themeOption) => (
										<option key={themeOption.name} value={themeOption.name}>
											{themeOption.name}
										</option>
									))}
								</select>
							</label>
						)}
						{review && (
							<div class="flex items-center gap-2">
								<span class="text-xs font-semibold px-2 py-1 rounded-lg bg-primary/20 text-primary">
									{review.grade}
								</span>
								<span class="text-xs font-semibold px-2 py-1 rounded-lg bg-edge text-content-muted capitalize">
									{review.state}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{isLoading ? (
				<div class="flex items-center justify-center min-h-64">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				</div>
			) : error ? (
				<div class="rounded-xl border-2 border-danger bg-danger/10 p-4 text-sm text-danger">
					{error}
				</div>
			) : review ? (
				<div class="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
					<div class="space-y-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto print:hidden">
						<aside class="rounded-2xl border-2 border-edge bg-page-secondary p-3 flex-1 min-h-0">
							<div class="flex items-center justify-between gap-2 mb-3">
								<div>
									<div class="text-sm font-semibold text-content">
										Questions
									</div>
								</div>
							</div>
							<div class="grid grid-cols-[repeat(auto-fit,32px)] gap-1">
								{review.questions.map((question) => {
									const verdictStyles = getVerdictStyles(
										question.verdict,
									);

									return (
										<button
											key={`nav-${question.slot}-${question.page}`}
											type="button"
											onClick={() => {
												selectQuestion(question.slot);

												if (showOneQuestionAtATime) {
													return;
												}

												const target =
													document.getElementById(
														`question-${question.slot}`,
													);

												if (
													target instanceof
													HTMLElement
												) {
													scrollQuestionIntoView(
														target,
													);
												}
											}}
											class={`group rounded-lg border-2 transition-all duration-150 w-8 h-8 p-0 hover:-translate-y-0.5 hover:shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${question.flagged ? "border-r-4 border-r-amber-400" : ""} ${verdictStyles.chip}`}
											title={`Question ${question.questionNumber}: ${question.verdictLabel}`}
										>
											<div class="flex h-full items-center justify-center">
												<span class="text-[11px] font-bold leading-none">
													{question.questionNumber}
												</span>
											</div>
										</button>
									);
								})}
							</div>
						</aside>
						<aside class="rounded-2xl border-2 border-edge bg-page-secondary p-3">
							<div class="mb-3 space-y-2">
								<div class="text-sm font-semibold text-content">
									View Controls
								</div>
								<div class="grid grid-cols-1 gap-2">
									<button
										type="button"
										onClick={() =>
											setShowOneQuestionAtATime(
												(current) => !current,
											)
										}
										aria-pressed={showOneQuestionAtATime}
													class={`rounded-xl! border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${showOneQuestionAtATime ? "border-primary bg-primary text-on-primary" : "border-edge bg-page text-content-muted hover:border-primary/40 hover:text-content"}`}
									>
										One-at-a-time
									</button>
									<button
										type="button"
										onClick={() =>
											setStudyModeActive((current) => !current)
										}
										aria-pressed={studyModeActive}
													class={`rounded-xl! border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${studyModeActive ? "border-primary bg-primary text-on-primary" : "border-edge bg-page text-content-muted hover:border-primary/40 hover:text-content"}`}
									>
										Study Mode
									</button>
								</div>
							</div>

							<button
								type="button"
								onClick={exportQuizToPdf}
								class="mb-3 w-full rounded-xl! border-2 border-primary bg-primary/15 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/20 print:hidden"
							>
								EXPORT QUIZ TO PDF
							</button>

							<div class="grid grid-cols-2 gap-1.5">
								<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
									<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">
										Attempt
									</div>
									<div class="text-[11px] font-semibold text-content leading-tight">
										{review.attemptLabel}
									</div>
								</div>
								<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
									<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">
										Questions
									</div>
									<div class="text-[11px] font-semibold text-content leading-tight">
										{review.questionCount}
									</div>
								</div>
								<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
									<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">
										Sum Grades
									</div>
									<div class="text-[11px] font-semibold text-content leading-tight">
										{String(review.sumgrades)}
									</div>
								</div>
								<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
									<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">
										Time Start
									</div>
									<div class="text-[11px] font-semibold text-content leading-tight">
										{formatUnixTime(review.timestart)}
									</div>
								</div>
								<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
									<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">
										Time Finish
									</div>
									<div class="text-[11px] font-semibold text-content leading-tight">
										{formatUnixTime(review.timefinish)}
									</div>
								</div>
							</div>
						</aside>
					</div>

					<div class="space-y-4">
						<div class="space-y-3">
							{questionsToRender.map((question) => {
								const verdictStyles = getVerdictStyles(
									question.verdict,
								);

								const isRevealed =
									answeredRevealed[question.slot] ?? false;
								const practiceSelectionIndexes =
									practiceSelections[question.slot] ?? [];
								const clozeSelectionValues =
									practiceClozeSelections[question.slot] ?? {};
								const practiceComparison =
									practiceComparisons[question.slot] ?? null;
								const isMultianswerPractice =
									question.type === "multianswer" &&
									question.readyToRenderHtml.length > 0;
								const hidePracticeAnswers =
									studyModeActive && !isRevealed;
								const basePracticeHtml =
									hidePracticeAnswers && isMultianswerPractice
										? createMaskedPracticeHtml(
												question.readyToRenderHtml,
										  )
										: question.readyToRenderHtml;
								const practiceHtml =
									isMultianswerPractice
										? applyPracticeValuesToHtml(
												basePracticeHtml,
												clozeSelectionValues,
										  )
										: question.readyToRenderHtml;
								const clozeNowVsPast = question.clozeDropdowns.map(
									(dropdown, index) => {
										const key = dropdown.id || `cloze-${index + 1}`;
										const nowValue = normalizePracticeValue(
											clozeSelectionValues[key],
										);
										const pastValue = normalizePracticeValue(
											dropdown.originalSelectedValue,
										);
										const hasNowSelection = nowValue !== "";

										return {
											id: key,
											prompt: dropdown.prompt,
											nowLabel: hasNowSelection
												? getClozeOptionLabel(dropdown, nowValue)
												: "—",
											pastLabel: dropdown.originalSelectedText || "—",
											hasNowSelection,
											matchesPast: hasNowSelection && nowValue === pastValue,
										};
									},
								);

								return (
									<article
										key={`${question.slot}-${question.page}`}
										id={`question-${question.slot}`}
										class="scroll-mt-4 rounded-3xl! border-2 border-edge bg-page overflow-hidden "
									>
										<div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-page-secondary border-b-2 border-edge">
											<div class="flex flex-wrap items-center gap-2">
												<span
													class={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-primary text-on-primary uppercase ${question.flagged ? "border-r-4 border-r-amber-400" : ""}`}
												>
													Q{question.questionNumber}
												</span>
												{question.grade && (
													<span class="text-[10px] font-semibold px-2 py-1 rounded-lg bg-primary/20 text-primary">
														{question.grade}
													</span>
												)}
												<span
													class={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide ${verdictStyles.badge}`}
												>
													{question.verdictLabel}
												</span>
											</div>
											<div class="flex items-center gap-2 print:hidden">
												<button
													type="button"
													onClick={() => {
														void copyQuestionMarkdownToClipboard(
															question,
														);
													}}
													data-copy-exclude="true"
													class={`rounded-lg cursor-pointer border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${copiedQuestionStatus?.slot === question.slot && copiedQuestionStatus.mode === "markdown" ? "border-primary/30 bg-primary/15 text-primary" : "border-edge bg-page-secondary text-content-muted hover:bg-page"}`}
													aria-label={`Copy question ${question.questionNumber} as markdown`}
												>
													{copiedQuestionStatus?.slot ===
														question.slot &&
													copiedQuestionStatus.mode ===
														"markdown"
														? "Copied MD"
														: "Copy MD"}
												</button>
												<button
													type="button"
													onClick={() => {
														void copyQuestionScreenshotToClipboard(
															question,
														);
													}}
													data-copy-exclude="true"
													class={`rounded-lg cursor-pointer border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${copiedQuestionStatus?.slot === question.slot && copiedQuestionStatus.mode === "image" ? "border-primary/30 bg-primary/15 text-primary" : "border-edge bg-page-secondary text-content-muted hover:bg-page"}`}
													aria-label={`Copy question ${question.questionNumber} as image`}
												>
													{copiedQuestionStatus?.slot ===
														question.slot &&
													copiedQuestionStatus.mode ===
														"image"
														? "Copied IMG"
														: "Copy IMG"}
												</button>
											</div>
										</div>

										<div class="p-3 space-y-3">
											{isMultianswerPractice ? (
												<section class="space-y-2">
													<div class="text-[10px] flex items-center gap-2 font-semibold uppercase tracking-wide text-content-muted">
														Practice Table
														{studyModeActive && (
															<button
																type="button"
																class="rounded-lg border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 cursor-pointer"
																onClick={() => toggleRevealAnswer(question)}
																aria-label={`Reveal answer for question ${question.questionNumber}`}
															>
																{isRevealed ? "HIDE ANSWER" : "REVEAL ANSWER"}
															</button>
														)}
													</div>
													{studyModeActive &&
														practiceComparison && (
															<div
																class={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${getPracticeComparisonStyles(practiceComparison.kind)}`}
															>
																{practiceComparison.message}
															</div>
														)}
													<div
														onChange={(event) => {
															const target = event.target;

															if (
																!(target instanceof HTMLSelectElement) &&
																!(target instanceof HTMLInputElement) &&
																!(target instanceof HTMLTextAreaElement)
															) {
																return;
															}

															if (
																target.dataset.practiceSelect !== "true" &&
																target.dataset.practiceInput !== "true"
															) {
																return;
															}

															const practiceId =
																target.dataset.practiceId || target.id;
															if (!practiceId) {
																return;
															}

															const nextForQuestion = {
																...clozeSelectionValues,
																[practiceId]: normalizePracticeValue(target.value),
															};

															setPracticeClozeValues(question.slot, nextForQuestion);

															if (studyModeActive && isRevealed) {
																compareQuestionAttempt(question, nextForQuestion);
															} else {
																clearPracticeComparison(question.slot);
															}
														}}
														onInput={(event) => {
															const target = event.target;

															if (
																!(target instanceof HTMLInputElement) &&
																!(target instanceof HTMLTextAreaElement)
															) {
																return;
															}

															if (target.dataset.practiceInput !== "true") {
																return;
															}

															const practiceId =
																target.dataset.practiceId || target.id;
															if (!practiceId) {
																return;
															}

															const nextForQuestion = {
																...clozeSelectionValues,
																[practiceId]: normalizePracticeValue(target.value),
															};

															setPracticeClozeValues(question.slot, nextForQuestion);

															if (studyModeActive && isRevealed) {
																compareQuestionAttempt(question, nextForQuestion);
															} else {
																clearPracticeComparison(question.slot);
															}
														}}
														class="rounded-2xl! border border-edge bg-page-secondary p-3 text-sm question-html [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-edge [&_th]:border [&_th]:border-edge [&_th]:bg-page [&_th]:px-2 [&_th]:py-1.5 [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1.5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline"
													>
														<div
															dangerouslySetInnerHTML={{
																__html: practiceHtml,
															}}
														/>
													</div>
													{studyModeActive &&
														isRevealed &&
														clozeNowVsPast.length > 0 && (
															<section class="rounded-2xl! border border-edge bg-page-secondary p-3 space-y-2">
																<div class="text-[10px] font-semibold uppercase tracking-wide text-content-muted">
																	Now vs Past Selection
																</div>
																<div class="space-y-1.5">
																	{clozeNowVsPast.map((part) => (
																		<div
																			key={`${question.slot}-${part.id}`}
																			class={`rounded-xl! border px-2 py-1.5 ${part.hasNowSelection ? (part.matchesPast ? "border-primary/30 bg-primary/10" : "border-danger/30 bg-danger/10") : "border-edge bg-page"}`}
																		>
																			<div class="text-[10px] font-semibold text-content">
																				{part.prompt}
																			</div>
																			<div class="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
																				<div class="rounded-lg! border border-edge bg-page px-2 py-1 text-[10px]">
																					<span class="mr-1 font-bold uppercase tracking-wide text-primary">
																						Now:
																					</span>
																					<span class="text-content">
																						{part.nowLabel}
																					</span>
																				</div>
																				<div class="rounded-lg! border border-edge bg-page px-2 py-1 text-[10px]">
																					<span class="mr-1 font-bold uppercase tracking-wide text-content-muted">
																						Past:
																					</span>
																					<span class="text-content">
																						{part.pastLabel}
																					</span>
																				</div>
																			</div>
																		</div>
																	))}
																</div>
															</section>
														)}


												</section>
											) : (
												question.questionHtml && (
															<section class="rounded-2xl! border border-edge bg-page-secondary p-3 text-sm question-html [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-edge [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline">
														<div
															dangerouslySetInnerHTML={{
																__html: question.questionHtml,
															}}
														/>
													</section>
												)
											)}

											{!isMultianswerPractice &&
												question.answers.length > 0 && (
												<section class="space-y-1">
													<div class="text-[10px] flex items-center gap-2 font-semibold uppercase tracking-wide text-content-muted">
														Answers
														{studyModeActive && (
															<button
																type="button"
																class="rounded-lg border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 cursor-pointer"
																onClick={() => toggleRevealAnswer(question)}
																aria-label={`Reveal answer for question ${question.questionNumber}`}
															>
																{isRevealed ? "Hide" : "Reveal"}
															</button>
														)}
													</div>
													{studyModeActive &&
														practiceComparison && (
															<div
																class={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${getPracticeComparisonStyles(practiceComparison.kind)}`}
															>
																{practiceComparison.message}
															</div>
														)}
													<div class="space-y-1">
														{question.answers.map(
															(answer, index) => {
																const hideState =
																	studyModeActive &&
																	!isRevealed;
																			const showRevealedPractice =
																				studyModeActive &&
																				isRevealed;
																const practiceSelected =
																	practiceSelectionIndexes.includes(index);
																			const pastSelected = answer.selected;
																			const answerCardClasses = [
																				"!rounded-2xl border-2 p-1.5 transition-colors",
																				hideState ? "cursor-pointer" : "",
																				showRevealedPractice && practiceSelected
																					? "ring-2 ring-primary/40"
																					: "",
																				!hideState && pastSelected
																					? answer.incorrect
																						? "border-danger bg-danger/10"
																						: "border-primary bg-primary/10"
																					: hideState && practiceSelected
																						? "border-primary bg-primary/10"
																						: showRevealedPractice && practiceSelected
																							? "border-primary/40 bg-primary/5"
																							: "border-edge bg-page-secondary",
																			].join(" ");
																			const bulletClasses = [
																				"mt-1 h-3 w-3 shrink-0 rounded-full border-2",
																				!hideState && pastSelected
																					? answer.incorrect
																						? "border-danger bg-danger"
																						: "border-primary bg-primary"
																					: (hideState || showRevealedPractice) && practiceSelected
																						? "border-primary bg-primary"
																						: "border-edge bg-page",
																			].join(" ");

																return (
																	<div
																		key={`${question.slot}-${index}`}
																		onClick={() => {
																			if (!hideState) {
																				return;
																			}

																			togglePracticeSelection(
																						question,
																				index,
																			);
																		}}
																		onKeyDown={(event) => {
																			if (
																				!hideState ||
																				(event.key !== "Enter" &&
																					event.key !== " ")
																			) {
																				return;
																			}

																			event.preventDefault();
																			togglePracticeSelection(
																						question,
																				index,
																			);
																		}}
																		role={hideState ? "button" : undefined}
																		tabIndex={hideState ? 0 : undefined}
																					class={answerCardClasses}
																	>
																		<div class="flex items-start gap-2">
																			<div
																							class={bulletClasses}
																			/>
																			<div class="flex-1 min-w-0 text-sm question-answer [&_p]:mb-2 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline">
																				<div
																					dangerouslySetInnerHTML={{
																						__html: answer.labelHtml,
																					}}
																				/>
																			</div>
																					{!studyModeActive &&
																						pastSelected && (
																					<span class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-edge text-content-muted uppercase">
																						Selected
																					</span>
																				)}
																					{(hideState || showRevealedPractice) &&
																						practiceSelected && (
																					<span class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary uppercase">
																								Now
																							</span>
																						)}
																					{showRevealedPractice &&
																						pastSelected && (
																							<span class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-edge text-content-muted uppercase">
																								Past
																					</span>
																				)}
																		</div>
																	</div>
																);
															},
														)}
													</div>
												</section>
											)}

											{(question.feedbackHtml ||
												question.rightAnswerHtml) &&
												(!studyModeActive ||
													isRevealed) && (
															<section class="grid grid-cols-1 lg:grid-cols-2 gap-3">
														{question.feedbackHtml && (
																	<div class="rounded-2xl! border-2 border-edge bg-page-secondary p-2">
																		<div class="text-[11px] font-semibold uppercase tracking-wide text-content-muted mb-1">
																	Feedback
																</div>
																<div
																			class="text-sm leading-relaxed question-feedback [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:mb-1.5 [&_ol]:mb-1.5 [&_a]:text-primary [&_a]:underline"
																	dangerouslySetInnerHTML={{
																		__html: question.feedbackHtml,
																	}}
																/>
															</div>
														)}
														{question.rightAnswerHtml && (
																<div class="rounded-2xl! border-2 border-primary/30 bg-primary/5 p-2">
																	<div class="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">
																	Correct
																	Answer
																</div>
																<div
																		class="text-sm leading-relaxed question-correct [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:mb-1.5 [&_ol]:mb-1.5 [&_a]:text-primary [&_a]:underline"
																	dangerouslySetInnerHTML={{
																		__html: question.rightAnswerHtml,
																	}}
																/>
															</div>
														)}
													</section>
												)}

											{!question.hasRenderedBlock && (
												<details class="rounded-xl border-2 border-edge bg-page-secondary p-3">
													<summary class="cursor-pointer text-sm font-semibold text-content">
														View HTML
													</summary>
													<div
														class="mt-3 text-sm question-html [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-3 [&_p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline"
														dangerouslySetInnerHTML={{
															__html:
																question.questionHtml ||
																"",
														}}
													/>
												</details>
											)}

											{showOneQuestionAtATime &&
												activeQuestion && (
													<div class="flex flex-wrap items-center justify-between gap-2 border-t-2 border-edge pt-3 print:hidden">
														<div class="text-xs font-medium text-content-muted">
															Showing question{" "}
															{
																activeQuestion.questionNumber
															}{" "}
															of{" "}
															{
																review.questionCount
															}
														</div>
														<div class="flex items-center gap-2">
															<button
																type="button"
																onClick={
																	goToPreviousQuestion
																}
																disabled={
																	!hasPreviousQuestion
																}
																data-copy-exclude="true"
																class="rounded-lg border border-edge bg-page px-1.5 py-0.5 text-[11px] font-semibold text-content disabled:cursor-not-allowed disabled:opacity-40"
															>
																Prev
															</button>
															<button
																type="button"
																onClick={
																	goToNextQuestion
																}
																disabled={
																	!hasNextQuestion
																}
																data-copy-exclude="true"
																class="rounded-lg border border-edge bg-page px-1.5 py-0.5 text-[11px] font-semibold text-content disabled:cursor-not-allowed disabled:opacity-40"
															>
																Next
															</button>
														</div>
													</div>
												)}
										</div>
									</article>
								);
							})}
						</div>
					</div>
				</div>
			) : (
				<div class="rounded-xl border-2 border-edge bg-page-secondary p-4 text-sm text-content-muted">
					No questions were returned.
				</div>
			)}
		</div>
	);
}
