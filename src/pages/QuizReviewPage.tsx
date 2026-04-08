import { useEffect, useRef, useState } from "preact/hooks";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-preact";
import { toBlob as htmlToImageBlob } from "html-to-image";
import { getAttemptReview } from "../data/adapter/moodlews/quiz";

interface QuizReviewPageProps {
	attemptId: string;
}

interface RawQuestion {
	slot: number;
	type: string;
	page: number;
	html: string;
	status?: string;
	state?: string;
	mark?: string;
	maxmark?: number;
	number?: number;
	flagged?: boolean;
}

interface QuizReviewPayload {
	grade?: string | number;
	attempt?: Record<string, unknown>;
	additionaldata?: Array<Record<string, unknown>>;
	questions?: RawQuestion[];
}

interface ParsedAnswer {
	labelHtml: string;
	selected: boolean;
	incorrect: boolean;
	correct: boolean;
}

type QuestionVerdict = "correct" | "incorrect" | "partial" | "unknown";

interface ParsedQuestion {
	slot: number;
	type: string;
	page: number;
	questionNumber: string;
	state: string;
	verdict: QuestionVerdict;
	verdictLabel: string;
	grade: string;
	flagged: boolean;
	questionHtml: string;
	answers: ParsedAnswer[];
	feedbackHtml: string;
	rightAnswerHtml: string;
	hasRenderedBlock: boolean;
}

interface ParsedReview {
	grade: string;
	attemptLabel: string;
	state: string;
	questionCount: number;
	timestart: number | null;
	timefinish: number | null;
	sumgrades: number | string;
	questions: ParsedQuestion[];
}

function getHtml(container: Element, selector: string): string {
	return container.querySelector(selector)?.innerHTML?.trim() ?? "";
}

function getText(container: Element, selector: string): string {
	return container.querySelector(selector)?.textContent?.trim() ?? "";
}

function htmlFragmentToMarkdown(fragmentHtml: string): string {
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

function collectImageSources(...htmlFragments: string[]): string[] {
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

type CopyMode = "markdown" | "image";

interface CopyStatus {
	slot: number;
	mode: CopyMode;
}

function buildQuestionMarkdown(question: ParsedQuestion): string {
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

async function blobToPng(blob: Blob): Promise<Blob> {
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

async function fetchImageBlob(imageUrl: string): Promise<Blob | null> {
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

function formatUnixTime(value: number | null): string {
	if (value === null || Number.isNaN(value)) {
		return "—";
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value * 1000));
}

function getAttemptNumber(attempt: Record<string, unknown>, key: string): number | null {
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

		if (/(auto|scroll|overlay)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) {
			return current;
		}

		current = current.parentElement;
	}

	return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : document.documentElement;
}

function scrollQuestionIntoView(element: HTMLElement) {
	const container = findScrollContainer(element);
	const start = container === document.documentElement || container === document.body ? window.scrollY : container.scrollTop;
	const containerTop = container === document.documentElement || container === document.body ? 0 : container.getBoundingClientRect().top;
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

function resolveVerdict(state: string, answers: ParsedAnswer[]): { verdict: QuestionVerdict; verdictLabel: string } {
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

	const questionNumber = getText(container, ".qno") || String(question.number ?? question.slot);
	const state = getText(container, ".state") || question.status || question.state || "";
	const grade = getText(container, ".grade") || question.mark || "";
	const flagged = Boolean(question.flagged);
	const questionHtml = getHtml(container, ".qtext");
	const feedbackHtml = getHtml(container, ".specificfeedback");
	const rightAnswerHtml = getHtml(container, ".rightanswer");

	const answers = Array.from(container.querySelectorAll(".answer > div")).map((option) => {
		const labelNode = option.querySelector("[data-region='answer-label']");
		const selected =
			option.classList.contains("incorrect") ||
			option.querySelector("input[checked]") !== null ||
			option.querySelector("input:checked") !== null;

		return {
			labelHtml: labelNode?.innerHTML?.trim() || option.innerHTML.trim(),
			selected,
			incorrect: option.classList.contains("incorrect"),
			correct: option.classList.contains("correct"),
		};
	});

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
		hasRenderedBlock: Boolean(questionHtml || answers.length || feedbackHtml || rightAnswerHtml),
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
		sumgrades: typeof sumgrades === "number" ? sumgrades : String(sumgrades ?? "—"),
		questions,
	};
}

export default function QuizReviewPage({ attemptId }: QuizReviewPageProps) {
	const [review, setReview] = useState<ParsedReview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showOneQuestionAtATime, setShowOneQuestionAtATime] = useState(false);
	const [activeQuestionSlot, setActiveQuestionSlot] = useState<number | null>(null);
	const [copiedQuestionStatus, setCopiedQuestionStatus] = useState<CopyStatus | null>(null);
	const pageContainerRef = useRef<HTMLDivElement>(null);
	const copiedResetTimerRef = useRef<number | null>(null);

	useEffect(() => {
		let cancelled = false;

		const loadReview = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const pageParam = new URLSearchParams(window.location.search).get("page");
				const page = pageParam !== null && Number.isFinite(Number(pageParam)) ? Number(pageParam) : -1;
				const payload = (await getAttemptReview(Number(attemptId), page)) as QuizReviewPayload | undefined;

				if (cancelled) return;

				if (!payload) {
					setReview(null);
					setError("No data returned.");
					return;
				}

				setReview(parseReview(payload));
			} catch (err) {
				if (cancelled) return;

				setError(err instanceof Error ? err.message : "Failed to load quiz review.");
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

			if (!review.questions.some((question) => question.slot === current)) {
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
		review?.questions.find((question) => question.slot === activeQuestionSlot) ?? review?.questions[0] ?? null;
	const activeQuestionIndex = review && activeQuestion ? review.questions.findIndex((question) => question.slot === activeQuestion.slot) : -1;
	const hasPreviousQuestion = activeQuestionIndex > 0;
	const hasNextQuestion = review !== null && activeQuestionIndex >= 0 && activeQuestionIndex < review.questions.length - 1;

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
		if (!review || activeQuestionIndex < 0 || activeQuestionIndex >= review.questions.length - 1) {
			return;
		}

		const nextQuestion = review.questions[activeQuestionIndex + 1];
		if (!nextQuestion) {
			return;
		}

		selectQuestion(nextQuestion.slot);
	};

	const copyQuestionMarkdownToClipboard = async (question: ParsedQuestion) => {
		const markdown = buildQuestionMarkdown(question);
		const imageSources = collectImageSources(question.questionHtml, ...question.answers.map((answer) => answer.labelHtml), question.feedbackHtml, question.rightAnswerHtml);
		const firstImageSource = imageSources[0] ?? null;
		const clipboardPayload: Record<string, Blob> = {
			"text/plain": new Blob([markdown], { type: "text/plain" }),
		};

		try {
			if (typeof ClipboardItem !== "undefined" && "supports" in ClipboardItem && (ClipboardItem as typeof ClipboardItem & { supports?: (type: string) => boolean }).supports?.("text/markdown")) {
				clipboardPayload["text/markdown"] = new Blob([markdown], { type: "text/markdown" });
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

	const copyQuestionScreenshotToClipboard = async (question: ParsedQuestion) => {
		const questionElement = document.getElementById(`question-${question.slot}`);

		if (!(questionElement instanceof HTMLElement)) {
			return;
		}

		const markdown = buildQuestionMarkdown(question);

		try {
			const screenshotBlob = await htmlToImageBlob(questionElement, {
				cacheBust: true,
				pixelRatio: Math.min(window.devicePixelRatio || 2, 2),
				backgroundColor: window.getComputedStyle(document.body).backgroundColor,
				filter: (node) => !(node instanceof HTMLElement && node.dataset.copyExclude === "true"),
			});

			const clipboardPayload: Record<string, Blob> = {
				"text/plain": new Blob([markdown], { type: "text/plain" }),
			};

			if (screenshotBlob) {
				clipboardPayload["image/png"] = screenshotBlob;
			}

			if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
				await navigator.clipboard.write([new ClipboardItem(clipboardPayload)]);
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
					<h1 class="text-xl font-bold text-content">Quiz Review {attemptId}</h1>
					{review && (
						<>
							<span class="text-xs font-semibold px-2 py-1 rounded-lg bg-primary/20 text-primary">{review.grade}</span>
							<span class="text-xs font-semibold px-2 py-1 rounded-lg bg-edge text-content-muted capitalize">{review.state}</span>
						</>
					)}
				</div>
			</div>

			{isLoading ? (
				<div class="flex items-center justify-center min-h-64">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				</div>
			) : error ? (
				<div class="rounded-xl border-2 border-danger bg-danger/10 p-4 text-sm text-danger">{error}</div>
			) : review ? (
				<div class="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
					<div class="space-y-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
						
                        <aside class="rounded-2xl border-2 border-edge bg-page-secondary p-3 flex-1 min-h-0">
						<div class="flex items-center justify-between gap-2 mb-3">
							<div>
								<div class="text-sm font-semibold text-content">Questions</div>
							</div>
						</div>
						<div class="grid grid-cols-[repeat(auto-fit,32px)] gap-1">
							{review.questions.map((question) => {
								const verdictStyles = getVerdictStyles(question.verdict);

								return (
									<button
										key={`nav-${question.slot}-${question.page}`}
										type="button"
										onClick={() => {
											selectQuestion(question.slot);

											if (showOneQuestionAtATime) {
												return;
											}

											const target = document.getElementById(`question-${question.slot}`);

											if (target instanceof HTMLElement) {
												scrollQuestionIntoView(target);
											}
										}}
										class={`group rounded-lg border-2 transition-all duration-150 w-8 h-8 p-0 hover:-translate-y-0.5 hover:shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${question.slot === activeQuestionSlot ? "ring-2 ring-primary/40" : ""} ${question.flagged ? "border-r-4 border-r-amber-400" : ""} ${verdictStyles.chip}`}
										title={`Question ${question.questionNumber}: ${question.verdictLabel}`}
									>
										<div class="flex h-full items-center justify-center">
											<span class="text-[11px] font-bold leading-none">{question.questionNumber}</span>
										</div>
									</button>
								);
							})}
						</div>
						</aside>
                        <aside class="rounded-2xl border-2 border-edge bg-page-secondary p-3">
						<div class="mb-3 flex items-center justify-between gap-2">
							<div class="text-sm font-semibold text-content">Questions</div>
							<button
								type="button"
								onClick={() => setShowOneQuestionAtATime((current) => !current)}
								aria-pressed={showOneQuestionAtATime}
								class={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${showOneQuestionAtATime ? "border-primary/30 bg-primary/10 text-primary" : "border-edge bg-page text-content-muted"}`}
							>
								One at a time
							</button>
						</div>

						<div class="grid grid-cols-2 gap-1.5">
							<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
								<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">Attempt</div>
								<div class="text-[11px] font-semibold text-content leading-tight">{review.attemptLabel}</div>
							</div>
							<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
								<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">Questions</div>
								<div class="text-[11px] font-semibold text-content leading-tight">{review.questionCount}</div>
							</div>
							<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
								<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">Sum Grades</div>
								<div class="text-[11px] font-semibold text-content leading-tight">{String(review.sumgrades)}</div>
							</div>
							<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
								<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">Time Start</div>
								<div class="text-[11px] font-semibold text-content leading-tight">{formatUnixTime(review.timestart)}</div>
							</div>
							<div class="rounded-xl border border-edge bg-page p-2 min-h-12 flex flex-col justify-between gap-0.5">
								<div class="text-[8px] font-semibold uppercase tracking-wide text-content-muted leading-none">Time Finish</div>
								<div class="text-[11px] font-semibold text-content leading-tight">{formatUnixTime(review.timefinish)}</div>
							</div>
						</div>
						</aside>

						
					</div>

					<div class="space-y-4">
						<div class="space-y-3">
							{questionsToRender.map((question) => {
								const verdictStyles = getVerdictStyles(question.verdict);

								return (
									<article
										key={`${question.slot}-${question.page}`}
										id={`question-${question.slot}`}
										class="scroll-mt-4 rounded-2xl border-2 border-edge bg-page overflow-hidden shadow-sm"
									>
										<div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-page-secondary border-b-2 border-edge">
											<div class="flex flex-wrap items-center gap-2">
												<span class={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-primary text-on-primary uppercase ${question.flagged ? "border-r-4 border-r-amber-400" : ""}`}>
													Q{question.questionNumber}
												</span>
												<span class="text-sm font-semibold text-content capitalize">{question.type}</span>
												{question.state && (
													<span class="text-[10px] font-semibold px-2 py-1 rounded-lg bg-edge text-content-muted">{question.state}</span>
												)}
											</div>
											<div class="flex items-center gap-2">
												{question.grade && (
													<span class="text-[10px] font-semibold px-2 py-1 rounded-lg bg-primary/20 text-primary">{question.grade}</span>
												)}
												<span class={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide ${verdictStyles.badge}`}>
													{question.verdictLabel}
												</span>
												<button
													type="button"
													onClick={() => {
														void copyQuestionMarkdownToClipboard(question);
													}}
													data-copy-exclude="true"
													class={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${copiedQuestionStatus?.slot === question.slot && copiedQuestionStatus.mode === "markdown" ? "border-primary/30 bg-primary/10 text-primary" : "border-edge bg-page-secondary text-content-muted hover:bg-page"}`}
													aria-label={`Copy question ${question.questionNumber} as markdown`}
												>
													{copiedQuestionStatus?.slot === question.slot && copiedQuestionStatus.mode === "markdown" ? "Copied MD" : "Copy MD"}
												</button>
												<button
													type="button"
													onClick={() => {
														void copyQuestionScreenshotToClipboard(question);
													}}
													data-copy-exclude="true"
													class={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${copiedQuestionStatus?.slot === question.slot && copiedQuestionStatus.mode === "image" ? "border-primary/30 bg-primary/10 text-primary" : "border-edge bg-page-secondary text-content-muted hover:bg-page"}`}
													aria-label={`Copy question ${question.questionNumber} as image`}
												>
													{copiedQuestionStatus?.slot === question.slot && copiedQuestionStatus.mode === "image" ? "Copied IMG" : "Copy IMG"}
												</button>
											</div>
										</div>

										<div class="p-3 space-y-3">
											{question.questionHtml && (
												<section class="rounded-xl border border-edge bg-page-secondary p-3 text-sm question-html [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:border-collapse [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline">
													<div dangerouslySetInnerHTML={{ __html: question.questionHtml }} />
												</section>
											)}

											{question.answers.length > 0 && (
												<section class="space-y-1.5">
													<div class="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Answers</div>
													<div class="space-y-1.5">
														{question.answers.map((answer, index) => (
															<div
																key={`${question.slot}-${index}`}
																class={[
																	"rounded-xl border-2 p-2.5 transition-colors",
																	answer.selected
																		? answer.incorrect
																			? "border-danger bg-danger/10"
																			: "border-primary bg-primary/10"
																		: "border-edge bg-page-secondary",
																].join(" ")}
															>
																<div class="flex items-start gap-2.5">
																	<div
																		class={[
																			"mt-1 h-3 w-3 shrink-0 rounded-full border-2",
																			answer.selected
																				? answer.incorrect
																					? "border-danger bg-danger"
																					: "border-primary bg-primary"
																				: "border-edge bg-page",
																			].join(" ")}
																	/>
																	<div class="flex-1 min-w-0 text-sm question-answer [&_p]:mb-2 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline">
																		<div dangerouslySetInnerHTML={{ __html: answer.labelHtml }} />
																	</div>
																	{answer.selected && (
																		<span class="shrink-0 text-[10px] font-bold px-1.5 py-1 rounded-lg bg-edge text-content-muted uppercase">Selected</span>
																	)}
																</div>
															</div>
														))}
													</div>
												</section>
											)}

											{(question.feedbackHtml || question.rightAnswerHtml) && (
												<section class="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
													{question.feedbackHtml && (
														<div class="rounded-xl border-2 border-edge bg-page-secondary p-3">
															<div class="text-[10px] font-semibold uppercase tracking-wide text-content-muted mb-2">Feedback</div>
															<div class="text-sm question-feedback [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: question.feedbackHtml }} />
														</div>
													)}
													{question.rightAnswerHtml && (
														<div class="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
															<div class="text-[10px] font-semibold uppercase tracking-wide text-primary mb-2">Correct Answer</div>
															<div class="text-sm question-correct [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: question.rightAnswerHtml }} />
														</div>
													)}
												</section>
											)}

											{!question.hasRenderedBlock && (
												<details class="rounded-xl border-2 border-edge bg-page-secondary p-3">
													<summary class="cursor-pointer text-sm font-semibold text-content">View HTML</summary>
													<div class="mt-3 text-sm question-html [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-3 [&_p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: question.questionHtml || "" }} />
												</details>
											)}

											{showOneQuestionAtATime && activeQuestion && (
												<div class="flex flex-wrap items-center justify-between gap-2 border-t-2 border-edge pt-3">
													<div class="text-xs font-medium text-content-muted">
														Showing question {activeQuestion.questionNumber} of {review.questionCount}
													</div>
													<div class="flex items-center gap-2">
														<button
															type="button"
															onClick={goToPreviousQuestion}
															disabled={!hasPreviousQuestion}
															data-copy-exclude="true"
															class="rounded-lg border border-edge bg-page px-2 py-1 text-xs font-semibold text-content disabled:cursor-not-allowed disabled:opacity-40"
														>
															Prev
														</button>
														<button
															type="button"
															onClick={goToNextQuestion}
															disabled={!hasNextQuestion}
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
				<div class="rounded-xl border-2 border-edge bg-page-secondary p-4 text-sm text-content-muted">No questions were returned.</div>
			)}
		</div>
	);
}