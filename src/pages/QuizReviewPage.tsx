import { useEffect, useRef, useState } from "preact/hooks";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-preact";
import { toBlob as htmlToImageBlob } from "html-to-image";
import { getAttemptReview } from "../data/adapter/moodlews/quiz";
import type {
	QuizReviewPageProps,
	QuizReviewPayload,
	ParsedQuestion,
	ParsedReview,
	QuestionVerdict,
	RawQuestion,
	ParsedAnswer,
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
	const questionHtml = getHtml(container, ".qtext");
	const feedbackHtml = getHtml(container, ".specificfeedback");
	const rightAnswerHtml = getHtml(container, ".rightanswer");

	const answers = Array.from(container.querySelectorAll(".answer > div")).map(
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
		state,
		verdict,
		verdictLabel,
		grade,
		flagged,
		questionHtml,
		answers,
		feedbackHtml,
		rightAnswerHtml,
		hasRenderedBlock: Boolean(
			questionHtml || answers.length || feedbackHtml || rightAnswerHtml,
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

export default function QuizReviewPage({ attemptId }: QuizReviewPageProps) {
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
	const pageContainerRef = useRef<HTMLDivElement>(null);
	const copiedResetTimerRef = useRef<number | null>(null);

	const toogleRevealAnswer = (questionSlot: number) => {
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
	}, [attemptId]);

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
						${question.questionHtml ? `<section class="panel"><div class="richtext">${question.questionHtml}</div></section>` : ""}
						${answerItems ? `<section class="answers">${answerItems}</section>` : ""}
						${feedbackHtml}
						${rightAnswerHtml}
					</div>
				</article>
			`;
		};

		const printHtml = review.questions.map(buildQuestionPrintHtml).join("");
		const documentTitle = `Quiz Review ${attemptId}`;
		const summaryHeader = `
			<header class="document-header">
				<div>
					<div class="eyebrow">Quiz Review</div>
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
					--bg: #f5efe5;
					--page: #fffdf8;
					--page-secondary: #f4ead8;
					--page-accent: #eef4ff;
					--edge: #d9c9b0;
					--content: #1f2937;
					--content-muted: #6b7280;
					--primary: #2153d3;
					--primary-strong: #1238a8;
					--danger: #c2410c;
					--success: #0f766e;
					--shadow: 0 18px 50px rgba(31, 41, 55, 0.09);
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
					background: linear-gradient(135deg, rgba(33, 83, 211, 0.08), rgba(245, 239, 229, 0.94));
					border: 1px solid color-mix(in srgb, var(--primary) 22%, white);
					border-radius: 14px;
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
					background: rgba(255, 255, 255, 0.8);
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
					box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
				}
				.question-pill { background: var(--primary); color: white; }
				.question-type { background: #e7ebf0; color: var(--content); }
				.question-state { background: #e7ebf0; color: var(--content-muted); }
				.question-grade { background: color-mix(in srgb, var(--primary) 18%, white); color: var(--primary-strong); }
				.question-verdict.correct { background: color-mix(in srgb, var(--primary) 18%, white); color: var(--primary-strong); }
				.question-verdict.incorrect { background: color-mix(in srgb, var(--danger) 18%, white); color: var(--danger); }
				.question-verdict.partial,
				.question-verdict.unknown { background: #e7ebf0; color: var(--content-muted); }
				.question-body { padding: 10px; display: grid; gap: 8px; }
				.panel {
					border: 1px solid color-mix(in srgb, var(--edge) 88%, white);
					border-radius: 10px;
					background: var(--page-secondary);
					padding: 9px;
				}
				.panel-muted { background: #fafbfc; }
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

		try {
			const screenshotBlob = await htmlToImageBlob(questionElement, {
				cacheBust: true,
				pixelRatio: Math.min(window.devicePixelRatio || 2, 2),
				backgroundColor: window.getComputedStyle(document.body)
					.backgroundColor,
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

	return (
		<div ref={pageContainerRef} class="p-4 lg:p-6 h-full overflow-y-auto">
			<div class="mb-4 flex flex-col gap-3">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-xl font-bold text-content">
						Quiz Review {attemptId}
					</h1>
					{review && (
						<>
							<span class="text-xs font-semibold px-2 py-1 rounded-lg bg-primary/20 text-primary">
								{review.grade}
							</span>
							<span class="text-xs font-semibold px-2 py-1 rounded-lg bg-edge text-content-muted capitalize">
								{review.state}
							</span>
						</>
					)}
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
							<div class="mb-3 flex items-center justify-between gap-2">
								<div class="text-sm font-semibold text-content">
									Review
								</div>
								<button
									type="button"
									onClick={() =>
										setShowOneQuestionAtATime(
											(current) => !current,
										)
									}
									aria-pressed={showOneQuestionAtATime}
									class={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${showOneQuestionAtATime ? "border-primary/30 bg-primary/10 text-primary" : "border-edge bg-page text-content-muted"}`}
								>
									One at a time
								</button>
								<button
									type="button"
									onClick={() =>
										setStudyModeActive(
											(current) => !current,
										)
									}
									aria-pressed={studyModeActive}
									class={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${studyModeActive ? "border-primary/30 bg-primary/10 text-primary" : "border-edge bg-page text-content-muted"}`}
								>
									Study Mode
								</button>
							</div>

							<button
								type="button"
								onClick={exportQuizToPdf}
								class="mb-3 w-full rounded-xl border-2 border-primary bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/15 print:hidden"
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

								return (
									<article
										key={`${question.slot}-${question.page}`}
										id={`question-${question.slot}`}
										class="scroll-mt-4 rounded-2xl border-2 border-edge bg-page overflow-hidden shadow-sm"
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
													class={`rounded-lg cursor-pointer border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${copiedQuestionStatus?.slot === question.slot && copiedQuestionStatus.mode === "markdown" ? "border-primary/30 bg-primary/10 text-primary" : "border-edge bg-page-secondary text-content-muted hover:bg-page"}`}
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
													class={`rounded-lg cursor-pointer border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${copiedQuestionStatus?.slot === question.slot && copiedQuestionStatus.mode === "image" ? "border-primary/30 bg-primary/10 text-primary" : "border-edge bg-page-secondary text-content-muted hover:bg-page"}`}
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
											{question.questionHtml && (
												<section class="rounded-xl border border-edge bg-page-secondary p-3 text-sm question-html [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:border-collapse [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline">
													<div
														dangerouslySetInnerHTML={{
															__html: question.questionHtml,
														}}
													/>
												</section>
											)}

											{question.answers.length > 0 && (
												<section class="space-y-1.5">
													<div class="text-[10px] flex items-center gap-2 font-semibold uppercase tracking-wide text-content-muted">
														Answers
														{studyModeActive && (
															<button
																class="rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
																onClick={() =>
																	toogleRevealAnswer(
																		question.slot,
																	)
																}
																aria-label={`Reveal answer for question ${question.questionNumber}`}
															>
																{isRevealed
																	? "Hide"
																	: "Reveal"}
															</button>
														)}
													</div>
													<div class="space-y-1.5">
														{question.answers.map(
															(answer, index) => {
																const hideState =
																	studyModeActive &&
																	!isRevealed;

																return (
																	<div
																		key={`${question.slot}-${index}`}
																		class={[
																			"rounded-xl border-2 p-2.5 transition-colors",
																			!hideState &&
																			answer.selected
																				? answer.incorrect
																					? "border-danger bg-danger/10"
																					: "border-primary bg-primary/10"
																				: "border-edge bg-page-secondary",
																		].join(
																			" ",
																		)}
																	>
																		<div class="flex items-start gap-2.5">
																			<div
																				class={[
																					"mt-1 h-3 w-3 shrink-0 rounded-full border-2",
																					!hideState &&
																					answer.selected
																						? answer.incorrect
																							? "border-danger bg-danger"
																							: "border-primary bg-primary"
																						: "border-edge bg-page",
																				].join(
																					" ",
																				)}
																			/>
																			<div class="flex-1 min-w-0 text-sm question-answer [&_p]:mb-2 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline">
																				<div
																					dangerouslySetInnerHTML={{
																						__html: answer.labelHtml,
																					}}
																				/>
																			</div>
																			{!hideState &&
																				answer.selected && (
																					<span class="shrink-0 text-[10px] font-bold px-1.5 py-1 rounded-lg bg-edge text-content-muted uppercase">
																						Selected
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
													<section class="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
														{question.feedbackHtml && (
															<div class="rounded-xl border-2 border-edge bg-page-secondary p-3">
																<div class="text-[10px] font-semibold uppercase tracking-wide text-content-muted mb-2">
																	Feedback
																</div>
																<div
																	class="text-sm question-feedback [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline"
																	dangerouslySetInnerHTML={{
																		__html: question.feedbackHtml,
																	}}
																/>
															</div>
														)}
														{question.rightAnswerHtml && (
															<div class="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
																<div class="text-[10px] font-semibold uppercase tracking-wide text-primary mb-2">
																	Correct
																	Answer
																</div>
																<div
																	class="text-sm question-correct [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline"
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
																class="rounded-lg border border-edge bg-page px-2 py-1 text-xs font-semibold text-content disabled:cursor-not-allowed disabled:opacity-40"
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
																class="rounded-lg border border-edge bg-page px-2 py-1 text-xs font-semibold text-content disabled:cursor-not-allowed disabled:opacity-40"
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
