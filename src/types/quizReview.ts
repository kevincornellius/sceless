
export interface QuizReviewPageProps {
	attemptId: string;
	initialPayload?: QuizReviewPayload | null;
	showThemeSelector?: boolean;
}

export interface RawQuestion {
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

export interface QuizReviewPayload {
	grade?: string | number;
	attempt?: Record<string, unknown>;
	additionaldata?: Array<Record<string, unknown>>;
	questions?: RawQuestion[];
	reviewTitle?: string;
	courseName?: string;
}

export interface ParsedAnswer {
	labelHtml: string;
	selected: boolean;
	incorrect: boolean;
	correct: boolean;
}

export interface ParsedClozeOption {
	value: string;
	label: string;
	selected: boolean;
}

export interface ParsedClozeDropdown {
	id: string;
	prompt: string;
	options: ParsedClozeOption[];
	originalSelectedValue: string | null;
	originalSelectedText: string;
	scoreText: string;
	score: number | null;
}

export type QuestionVerdict = "correct" | "incorrect" | "partial" | "unknown";

export interface ParsedQuestion {
	slot: number;
	type: string;
	page: number;
	questionNumber: string;
	practiceSelectionMode: "single" | "multiple";
	state: string;
	verdict: QuestionVerdict;
	verdictLabel: string;
	grade: string;
	flagged: boolean;
	questionHtml: string;
	readyToRenderHtml: string;
	clozeDropdowns: ParsedClozeDropdown[];
	answers: ParsedAnswer[];
	feedbackHtml: string;
	rightAnswerHtml: string;
	hasRenderedBlock: boolean;
}

export interface ParsedReview {
	grade: string;
	displayTitle: string;
	courseName: string;
	attemptLabel: string;
	state: string;
	questionCount: number;
	timestart: number | null;
	timefinish: number | null;
	sumgrades: number | string;
	questions: ParsedQuestion[];
}