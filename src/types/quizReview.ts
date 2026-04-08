
export interface QuizReviewPageProps {
	attemptId: string;
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
}

export interface ParsedAnswer {
	labelHtml: string;
	selected: boolean;
	incorrect: boolean;
	correct: boolean;
}

export type QuestionVerdict = "correct" | "incorrect" | "partial" | "unknown";

export interface ParsedQuestion {
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

export interface ParsedReview {
	grade: string;
	attemptLabel: string;
	state: string;
	questionCount: number;
	timestart: number | null;
	timefinish: number | null;
	sumgrades: number | string;
	questions: ParsedQuestion[];
}