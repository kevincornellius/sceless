import { render } from "preact";
import QuizReviewPage from "@/src/pages/QuizReviewPage";
import tailwindCss from "@/src/assets/tailwind.css?inline";
import { quizReviewHijackStorage } from "@/src/storage";
import { initializeTheme } from "@/src/stores/theme";
import { buildQuizReviewPayloadFromDom } from "@/src/helper/quizReviewDom";
import { mountQuizReviewNative } from "@/src/helper/quizReviewNative";

const ROOT_ID = "sceless-quiz-review-root";
const STYLE_ID = "sceless-quiz-review-style";
const HIJACK_CLASS = "sceless-quiz-review-hijacked";

function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const styleElement = document.createElement("style");
	styleElement.id = STYLE_ID;
	styleElement.textContent = `${tailwindCss}
	html.${HIJACK_CLASS},
	body.${HIJACK_CLASS} {
		margin: 0 !important;
		padding: 0 !important;
		min-height: 100%;
		background: var(--theme-page-secondary, #f7f7f7);
	}

	body.${HIJACK_CLASS} > :not(#${ROOT_ID}) {
		display: none !important;
	}

	#${ROOT_ID} {
		display: block;
		min-height: 100vh;
		isolation: isolate;
	}

	#${ROOT_ID} .sceless-native-shell {
		min-height: 100vh;
		padding: 16px;
		background: var(--theme-page-secondary, #f7f7f7);
		color: var(--theme-content, #3c3c3c);
		font-family: "Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif;
	}

	#${ROOT_ID} .sceless-native-topbar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 16px;
		background: var(--theme-page, #ffffff);
		margin-bottom: 10px;
	}

	#${ROOT_ID} .sceless-native-top-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		margin-left: auto;
	}

	#${ROOT_ID} .sceless-native-brand {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 34px;
		padding: 0 9px;
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 10px;
		background: var(--theme-page-secondary, #f7f7f7);
		color: var(--theme-content, #3c3c3c);
		text-decoration: none;
	}

	#${ROOT_ID} .sceless-native-brand:hover {
		background: color-mix(in srgb, var(--theme-page-secondary, #f7f7f7) 84%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-brand-logo {
		display: block;
		line-height: 0;
	}

	#${ROOT_ID} .sceless-native-brand-svg {
		width: 72px;
		height: auto;
		display: block;
	}

	#${ROOT_ID} .sceless-native-title h1 {
		margin: 0;
		font-size: 22px;
		line-height: 1.2;
		color: var(--theme-content, #3c3c3c);
	}

	#${ROOT_ID} .sceless-native-title p {
		margin: 6px 0 0;
		font-size: 12px;
		font-weight: 600;
		color: var(--theme-content-muted, #8d8d8d);
	}

	#${ROOT_ID} .sceless-native-aside-tools {
		display: grid;
		gap: 8px;
		margin-bottom: 2px;
	}

	#${ROOT_ID} .sceless-native-aside-card {
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 14px;
		background: var(--theme-page, #ffffff);
		padding: 10px;
	}

	#${ROOT_ID} .sceless-native-aside-heading {
		margin: 0 0 8px;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--theme-content-muted, #8d8d8d);
	}

	#${ROOT_ID} .sceless-native-controls {
		display: grid;
		gap: 8px;
	}

	#${ROOT_ID} .sceless-native-toggle-card {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 12px;
		background: var(--theme-page-secondary, #f7f7f7);
		cursor: pointer;
	}

	#${ROOT_ID} .sceless-native-toggle-card input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	#${ROOT_ID} .sceless-native-toggle-meta {
		display: grid;
		gap: 0;
	}

	#${ROOT_ID} .sceless-native-toggle-meta strong {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--theme-content, #3c3c3c);
	}

	#${ROOT_ID} .sceless-native-toggle-track {
		position: relative;
		display: inline-flex;
		width: 36px;
		height: 20px;
		border-radius: 999px;
		background: var(--theme-edge, #e5e5e5);
		transition: background-color 120ms ease;
	}

	#${ROOT_ID} .sceless-native-toggle-track::after {
		content: "";
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #ffffff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
		transition: transform 120ms ease;
	}

	#${ROOT_ID} .sceless-native-toggle-card input:checked ~ .sceless-native-toggle-track {
		background: var(--theme-primary, #58cc02);
	}

	#${ROOT_ID} .sceless-native-toggle-card input:checked ~ .sceless-native-toggle-track::after {
		transform: translateX(16px);
	}

	#${ROOT_ID} .sceless-native-select {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 10px;
		background: var(--theme-page-secondary, #f7f7f7);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--theme-content-muted, #8d8d8d);
	}

	#${ROOT_ID} .sceless-native-select select {
		appearance: none;
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 8px;
		background: var(--theme-page, #ffffff);
		padding: 6px 8px;
		font-size: 11px;
		font-weight: 700;
		color: var(--theme-content, #3c3c3c);
	}

	#${ROOT_ID} .sceless-native-button {
		appearance: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid color-mix(in srgb, var(--theme-primary, #58cc02) 30%, var(--theme-page, #ffffff));
		border-radius: 10px;
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 12%, var(--theme-page, #ffffff));
		color: var(--theme-primary, #58cc02);
		padding: 7px 10px;
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: background-color 120ms ease;
	}

	#${ROOT_ID} .sceless-native-button:hover:not(:disabled) {
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 18%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	#${ROOT_ID} .sceless-native-navigation,
	#${ROOT_ID} .sceless-native-question-navigation {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 10px;
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 12px;
		background: var(--theme-page, #ffffff);
		margin-top: 8px;
		width: 100%;
	}

	#${ROOT_ID} .sceless-native-question-navigation {
		margin-top: 10px;
	}

	#${ROOT_ID} .sceless-native-view-actions {
		display: flex;
		margin-top: 8px;
	}

	#${ROOT_ID} .sceless-native-view-actions .sceless-native-button {
		width: 100%;
	}

	#${ROOT_ID} .sceless-native-nav-status {
		min-width: 96px;
		text-align: center;
		font-size: 11px;
		font-weight: 800;
		color: var(--theme-content-muted, #8d8d8d);
	}

	#${ROOT_ID} .sceless-native-jump {
		display: grid;
		grid-template-columns: repeat(auto-fill, 34px);
		justify-content: start;
		align-content: start;
		gap: 6px;
		padding-top: 2px;
	}

	#${ROOT_ID} .sceless-native-question-list .sceless-native-jump {
		max-height: 220px;
		overflow-y: auto;
		overflow-x: hidden;
		padding-right: 4px;
	}

	#${ROOT_ID} .sceless-native-jump-button {
		appearance: none;
		position: relative;
		overflow: hidden;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 8px;
		padding: 0;
		width: 34px;
		min-width: 34px;
		max-width: 34px;
		height: 34px;
		font-size: 9px;
		font-weight: 800;
		background: var(--theme-page, #ffffff);
		color: var(--theme-content, #3c3c3c);
		cursor: pointer;
		transition: background-color 120ms ease, box-shadow 120ms ease;
	}

	#${ROOT_ID} .sceless-native-jump-number {
		display: block;
		width: 100%;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: clip;
		font-size: 10px;
		font-weight: 800;
		line-height: 1;
		letter-spacing: 0;
		font-variant-numeric: tabular-nums;
	}

	#${ROOT_ID} .sceless-native-jump-button.tone-correct {
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 16%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-jump-button.tone-incorrect {
		background: color-mix(in srgb, var(--theme-danger, #ff4b4b) 14%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-jump-button.tone-filled {
		background: color-mix(in srgb, var(--theme-content-muted, #8d8d8d) 18%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-jump-button.is-flagged::before {
		content: "";
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		border-radius: 0;
		background: #f59e0b;
		box-shadow: 0 0 0 1px color-mix(in srgb, #f59e0b 55%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-jump-button.is-active {
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--theme-primary, #58cc02) 72%, var(--theme-edge, #e5e5e5));
	}

	#${ROOT_ID} .sceless-native-body {
		display: grid;
		gap: 12px;
	}

	@media (min-width: 1100px) {
		#${ROOT_ID} .sceless-native-body {
			grid-template-columns: 320px minmax(0, 1fr);
			align-items: start;
		}

		#${ROOT_ID} .sceless-native-summary {
			position: sticky;
			top: 14px;
			max-height: calc(100vh - 28px);
			overflow-y: auto;
			overflow-x: hidden;
			scrollbar-gutter: stable;
			overscroll-behavior: contain;
			padding-right: 4px;
		}
	}

	#${ROOT_ID} .sceless-native-summary {
		display: grid;
		gap: 10px;
		background: transparent !important;
		border: 0 !important;
		border-radius: 0;
		padding: 0;
	}

	#${ROOT_ID} .sceless-native-questions {
		border: 0;
		border-radius: 0;
		background: transparent;
		padding: 0;
	}

	#${ROOT_ID} .sceless-native-summary .sceless-native-summary-table,
	#${ROOT_ID} .sceless-native-summary .quizreviewsummary {
		width: 100% !important;
		margin: 0 !important;
		border: 0 !important;
		border-collapse: separate !important;
		border-spacing: 0 !important;
		table-layout: fixed;
		background: transparent !important;
		box-shadow: none !important;
		font-size: 12px;
	}

	#${ROOT_ID} .sceless-native-summary-card {
		padding: 8px;
	}

	#${ROOT_ID} .sceless-native-summary-card .sceless-native-aside-heading {
		margin-bottom: 6px;
	}

	#${ROOT_ID} .sceless-native-summary .sceless-native-summary-table tbody,
	#${ROOT_ID} .sceless-native-summary .quizreviewsummary tbody {
		display: grid;
		gap: 4px;
	}

	#${ROOT_ID} .sceless-native-summary .sceless-native-summary-row,
	#${ROOT_ID} .sceless-native-summary .quizreviewsummary tr {
		display: grid;
		grid-template-columns: minmax(86px, 36%) minmax(0, 1fr);
		align-items: start;
		gap: 6px;
		padding: 5px 7px;
		border: 1px solid color-mix(in srgb, var(--theme-edge, #e5e5e5) 88%, var(--theme-page, #ffffff)) !important;
		border-radius: 8px;
		background: var(--theme-page-secondary, #f7f7f7) !important;
		box-shadow: none !important;
	}

	#${ROOT_ID} .sceless-native-summary .sceless-native-summary-key,
	#${ROOT_ID} .sceless-native-summary .sceless-native-summary-value,
	#${ROOT_ID} .sceless-native-summary .quizreviewsummary th,
	#${ROOT_ID} .sceless-native-summary .quizreviewsummary td {
		padding: 0 !important;
		margin: 0 !important;
		border: 0 !important;
		text-align: left;
		vertical-align: top;
		background: transparent !important;
	}

	#${ROOT_ID} .sceless-native-summary .sceless-native-summary-key,
	#${ROOT_ID} .sceless-native-summary .quizreviewsummary th {
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--theme-content-muted, #8d8d8d);
	}

	#${ROOT_ID} .sceless-native-summary .sceless-native-summary-value,
	#${ROOT_ID} .sceless-native-summary .quizreviewsummary td {
		font-size: 12px;
		font-weight: 700;
		line-height: 1.25;
		color: var(--theme-content, #3c3c3c);
	}

	#${ROOT_ID} .sceless-native-summary .sceless-native-summary-value b,
	#${ROOT_ID} .sceless-native-summary .quizreviewsummary td b {
		font-size: 13px;
		font-weight: 900;
		color: var(--theme-primary, #58cc02);
	}

	@media (max-width: 520px) {
		#${ROOT_ID} .sceless-native-summary .sceless-native-summary-row,
		#${ROOT_ID} .sceless-native-summary .quizreviewsummary tr {
			grid-template-columns: 1fr;
			gap: 3px;
		}
	}

	#${ROOT_ID} .sceless-native-questions form.questionflagsaveform {
		margin: 0;
	}

	#${ROOT_ID} .sceless-native-question {
		border: 1px solid color-mix(in srgb, var(--theme-edge, #e5e5e5) 78%, var(--theme-page, #ffffff));
		border-radius: 16px;
		overflow: hidden;
		background: var(--theme-page, #ffffff);
		margin-bottom: 12px;
		box-shadow: 0 4px 14px rgba(18, 36, 51, 0.05);
	}

	#${ROOT_ID} .sceless-native-question:last-child {
		margin-bottom: 0;
	}

	#${ROOT_ID} .sceless-native-question,
	#${ROOT_ID} .sceless-native-question .info,
	#${ROOT_ID} .sceless-native-question .content,
	#${ROOT_ID} .sceless-native-question .formulation,
	#${ROOT_ID} .sceless-native-question .qtext,
	#${ROOT_ID} .sceless-native-question .ablock,
	#${ROOT_ID} .sceless-native-question .answer,
	#${ROOT_ID} .sceless-native-question .outcome,
	#${ROOT_ID} .sceless-native-question .feedback,
	#${ROOT_ID} .sceless-native-question .specificfeedback,
	#${ROOT_ID} .sceless-native-question .rightanswer {
		box-shadow: none !important;
	}

	#${ROOT_ID} .sceless-native-question .info > * {
		float: none !important;
		clear: none !important;
		margin: 0 !important;
	}

	#${ROOT_ID} .sceless-native-question .info::after {
		content: none !important;
		display: none !important;
	}

	#${ROOT_ID} .sceless-native-question-info {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 10px;
		float: none !important;
		width: auto !important;
		margin: 0 !important;
		clear: both !important;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--theme-page-secondary, #f7f7f7) 88%, var(--theme-page, #ffffff)),
			var(--theme-page-secondary, #f7f7f7)
		) !important;
		border: 0 !important;
		border-bottom: 1px solid color-mix(in srgb, var(--theme-edge, #e5e5e5) 72%, var(--theme-page, #ffffff)) !important;
		padding: 10px;
		min-height: 48px;
	}

	@media (max-width: 860px) {
		#${ROOT_ID} .sceless-native-question-info {
			gap: 7px;
		}

		#${ROOT_ID} .sceless-native-question-flag {
			margin-left: 0 !important;
		}

		#${ROOT_ID} .sceless-native-question-info > .sceless-native-question-tools {
			width: 100%;
			margin-left: 0;
			justify-content: flex-end;
		}
	}

	#${ROOT_ID} .sceless-native-question-title {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		flex: 1 1 220px;
		min-width: 0;
		margin: 0;
		padding: 0 !important;
		border: 0 !important;
		background: transparent !important;
		box-shadow: none !important;
		font-size: 14px;
		font-weight: 800;
		line-height: 1;
		color: var(--theme-content, #3c3c3c);
		float: none !important;
	}

	#${ROOT_ID} .sceless-native-question-title-label {
		display: inline-flex;
		align-items: center;
		padding: 5px 9px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--theme-primary, #58cc02) 36%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 10%, var(--theme-page, #ffffff));
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--theme-primary, #58cc02);
	}

	#${ROOT_ID} .sceless-native-question-title-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 26px;
		height: 26px;
		padding: 0 8px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 14%, var(--theme-page, #ffffff));
		border: 1px solid color-mix(in srgb, var(--theme-primary, #58cc02) 46%, var(--theme-edge, #e5e5e5));
		color: var(--theme-primary, #58cc02);
		font-size: 12px;
		font-weight: 900;
		white-space: nowrap;
		line-height: 1;
		flex-shrink: 0;
	}

	#${ROOT_ID} .sceless-native-question-state,
	#${ROOT_ID} .sceless-native-question-grade {
		display: inline-flex;
		align-items: center;
		padding: 5px 8px;
		border-radius: 999px;
		border: 1px solid var(--theme-edge, #e5e5e5);
		background: var(--theme-page, #ffffff);
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--theme-content-muted, #8d8d8d);
		float: none !important;
	}

	#${ROOT_ID} .sceless-native-question.correct .sceless-native-question-state {
		color: var(--theme-primary, #58cc02);
		border-color: color-mix(in srgb, var(--theme-primary, #58cc02) 32%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 11%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-question.incorrect .sceless-native-question-state,
	#${ROOT_ID} .sceless-native-question.partiallycorrect .sceless-native-question-state,
	#${ROOT_ID} .sceless-native-question.partially .sceless-native-question-state {
		color: var(--theme-danger, #ff4b4b);
		border-color: color-mix(in srgb, var(--theme-danger, #ff4b4b) 30%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-danger, #ff4b4b) 10%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-question-flag {
		margin: 0;
		margin-left: 0;
		float: none !important;
	}

	#${ROOT_ID} .sceless-native-question-flag .questionflagpostdata,
	#${ROOT_ID} .sceless-native-question-flag input[type='hidden'] {
		display: none !important;
	}

	#${ROOT_ID} .sceless-native-question-flag .aabtn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid var(--theme-edge, #e5e5e5);
		background: var(--theme-page, #ffffff);
		font-size: 11px;
		font-weight: 700;
		color: var(--theme-content-muted, #8d8d8d);
		text-decoration: none;
	}

	#${ROOT_ID} .sceless-native-question-flag .aabtn img {
		width: 14px;
		height: 14px;
	}

	#${ROOT_ID} .sceless-native-question-flag .aabtn[aria-pressed='true'] {
		border-color: color-mix(in srgb, #f59e0b 48%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, #f59e0b 14%, var(--theme-page, #ffffff));
		color: #b45309;
	}

	#${ROOT_ID} .sceless-native-question .content {
		padding: 12px 12px 10px;
		background: var(--theme-page, #ffffff) !important;
		margin: 0 !important;
		clear: both !important;
	}

	#${ROOT_ID} .sceless-native-formulation,
	#${ROOT_ID} .sceless-native-answer-block {
		background: transparent !important;
		border: 0 !important;
		padding: 0 !important;
		margin: 0 !important;
		overflow: visible !important;
	}

	#${ROOT_ID} .sceless-native-question-tools {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		margin-left: auto;
		flex: 1 1 auto;
	}

	#${ROOT_ID} .sceless-native-question-info > .sceless-native-question-tools {
		padding-left: 8px;
	}

	#${ROOT_ID} .sceless-native-practice-tools {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
		padding-top: 8px;
		border-top: 1px dashed color-mix(in srgb, var(--theme-edge, #e5e5e5) 86%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-question-prompt {
		font-size: 14px;
		line-height: 1.55;
		color: var(--theme-content, #3c3c3c);
		margin-bottom: 10px;
		background: var(--theme-page, #ffffff) !important;
		padding: 0 !important;
		border: 0 !important;
	}

	#${ROOT_ID} .sceless-native-question-prompt > *:first-child {
		margin-top: 0;
	}

	#${ROOT_ID} .sceless-native-question-prompt > *:last-child {
		margin-bottom: 0;
	}

	#${ROOT_ID} .sceless-native-question img,
	#${ROOT_ID} .sceless-native-question-prompt img,
	#${ROOT_ID} .sceless-native-answer-row img,
	#${ROOT_ID} .sceless-native-specific-feedback img,
	#${ROOT_ID} .sceless-native-right-answer img {
		max-width: 100%;
		height: auto;
		background: #ffffff !important;
		padding: 3px;
		border-radius: 6px;
		box-sizing: border-box;
	}

	#${ROOT_ID} .sceless-native-answer-list {
		display: grid;
		gap: 8px;
		background: transparent !important;
		margin: 0;
		padding: 0;
	}

	#${ROOT_ID} .sceless-native-answer-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 8px;
		align-items: start;
		padding: 9px 10px;
		border: 1px solid var(--theme-edge, #e5e5e5) !important;
		border-radius: 12px;
		background: var(--theme-page-secondary, #f7f7f7) !important;
		transition: border-color 120ms ease, background-color 120ms ease;
		margin: 0 !important;
		float: none !important;
		color: var(--theme-content, #3c3c3c) !important;
	}

	#${ROOT_ID} .sceless-native-answer-row [data-region='answer-label'],
	#${ROOT_ID} .sceless-native-answer-row [data-region='answer-label'] *,
	#${ROOT_ID} .sceless-native-answer-row .flex-fill,
	#${ROOT_ID} .sceless-native-answer-row .flex-fill * {
		color: var(--theme-content, #3c3c3c) !important;
	}

	#${ROOT_ID} .sceless-native-answer-row:hover {
		border-color: color-mix(in srgb, var(--theme-primary, #58cc02) 28%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 8%, var(--theme-page, #ffffff));
	}

	#${ROOT_ID} .sceless-native-answer-row:has(input:checked),
	#${ROOT_ID} .sceless-native-answer-row:has([data-sceless-practice-active='true']) {
		border: 2px solid color-mix(in srgb, var(--theme-primary, #58cc02) 42%, var(--theme-page, #ffffff)) !important;
		box-shadow: none !important;
	}

	#${ROOT_ID} .sceless-native-answer-row input {
		margin-top: 2px;
		accent-color: var(--theme-primary, #58cc02);
	}

	#${ROOT_ID} .sceless-native-answer-row.correct {
		border-color: color-mix(in srgb, var(--theme-primary, #58cc02) 34%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 9%, var(--theme-page, #ffffff)) !important;
	}

	#${ROOT_ID} .sceless-native-answer-row.incorrect {
		border-color: color-mix(in srgb, var(--theme-danger, #ff4b4b) 28%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-danger, #ff4b4b) 7%, var(--theme-page, #ffffff)) !important;
	}

	#${ROOT_ID} .sceless-native-answer-row [data-region='answer-label'] {
		display: flex !important;
		flex-direction: row !important;
		align-items: flex-start;
		line-height: 1.5;
		min-width: 0;
	}

	#${ROOT_ID} .sceless-native-answer-row > .icon {
		grid-column: 3;
		justify-self: end;
		align-self: center;
		margin: 0 !important;
	}

	#${ROOT_ID} .sceless-native-answer-row .answernumber {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		font-weight: 800;
		color: var(--theme-content-muted, #8d8d8d);
	}

	#${ROOT_ID} .sceless-native-answer-row .icon.text-success {
		color: var(--theme-success, #58cc02) !important;
	}

	#${ROOT_ID} .sceless-native-answer-row .icon.text-danger {
		color: var(--theme-danger, #ff4b4b) !important;
	}

	#${ROOT_ID} .sceless-native-outcome {
		margin-top: 11px;
		padding-top: 10px;
		border-top: 1px dashed color-mix(in srgb, var(--theme-edge, #e5e5e5) 90%, var(--theme-page, #ffffff));
		background: transparent !important;
		overflow: visible !important;
	}

	#${ROOT_ID} .sceless-native-feedback {
		display: grid;
		gap: 8px;
		margin: 0 !important;
		padding: 0 !important;
		border: 0 !important;
		background: transparent !important;
		color: var(--theme-content, #3c3c3c) !important;
	}

	#${ROOT_ID} .sceless-native-specific-feedback,
	#${ROOT_ID} .sceless-native-right-answer {
		border: 1px solid var(--theme-edge, #e5e5e5);
		border-radius: 11px;
		padding: 8px 10px;
		margin-top: 7px;
		font-size: 13px;
		line-height: 1.45;
		background: var(--theme-page-secondary, #f7f7f7) !important;
	}

	#${ROOT_ID} .sceless-native-right-answer {
		border-color: color-mix(in srgb, var(--theme-primary, #58cc02) 30%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 8%, var(--theme-page, #ffffff)) !important;
	}

	#${ROOT_ID} .sceless-native-specific-feedback,
	#${ROOT_ID} .sceless-native-specific-feedback *,
	#${ROOT_ID} .sceless-native-right-answer,
	#${ROOT_ID} .sceless-native-right-answer * {
		color: var(--theme-content, #3c3c3c) !important;
	}

	#${ROOT_ID} .sceless-native-specific-feedback p,
	#${ROOT_ID} .sceless-native-right-answer p {
		margin: 0;
	}

	#${ROOT_ID} .sceless-native-tool-button {
		appearance: none;
		border: 1px solid color-mix(in srgb, var(--theme-primary, #58cc02) 30%, var(--theme-page, #ffffff));
		border-radius: 9px;
		padding: 4px 8px;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 10%, var(--theme-page, #ffffff));
		color: var(--theme-primary, #58cc02);
		cursor: pointer;
	}

	#${ROOT_ID} .sceless-native-tool-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	#${ROOT_ID} .sceless-native-compare {
		display: inline-flex;
		align-items: center;
		padding: 4px 8px;
		border-radius: 8px;
		border: 1px solid var(--theme-edge, #e5e5e5);
		background: var(--theme-page-secondary, #f7f7f7);
		font-size: 10px;
		font-weight: 700;
		color: var(--theme-content-muted, #8d8d8d);
	}

	#${ROOT_ID} .sceless-native-compare.is-match {
		border-color: color-mix(in srgb, var(--theme-primary, #58cc02) 35%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 12%, var(--theme-page, #ffffff));
		color: var(--theme-primary, #58cc02);
	}

	#${ROOT_ID} .sceless-native-compare.is-different {
		border-color: color-mix(in srgb, var(--theme-danger, #ff4b4b) 35%, var(--theme-page, #ffffff));
		background: color-mix(in srgb, var(--theme-danger, #ff4b4b) 10%, var(--theme-page, #ffffff));
		color: var(--theme-danger, #ff4b4b);
	}

	#${ROOT_ID} .sceless-native-compare.is-incomplete {
		border-color: var(--theme-edge, #e5e5e5);
		background: var(--theme-page-secondary, #f7f7f7);
		color: var(--theme-content-muted, #8d8d8d);
	}

	#${ROOT_ID} .sceless-study-mode .que:not(.sceless-native-revealed) .outcome {
		display: none !important;
	}

	#${ROOT_ID} .sceless-study-mode .que:not(.sceless-native-revealed) .answer .icon,
	#${ROOT_ID} .sceless-study-mode .que:not(.sceless-native-revealed) .feedbackspan {
		display: none !important;
	}

	#${ROOT_ID} .sceless-study-mode .que:not(.sceless-native-revealed) .sceless-native-answer-row,
	#${ROOT_ID} .sceless-study-mode .que:not(.sceless-native-revealed) .sceless-native-answer-row.correct,
	#${ROOT_ID} .sceless-study-mode .que:not(.sceless-native-revealed) .sceless-native-answer-row.incorrect,
	#${ROOT_ID} .sceless-study-mode .que:not(.sceless-native-revealed) .sceless-native-answer-row.partiallycorrect {
		border-color: var(--theme-edge, #e5e5e5) !important;
		background: var(--theme-page-secondary, #f7f7f7) !important;
	}

	#${ROOT_ID} .sceless-study-mode [data-sceless-practice-active='true'] {
		border: 2px solid color-mix(in srgb, var(--theme-primary, #58cc02) 40%, var(--theme-page, #ffffff)) !important;
		background: color-mix(in srgb, var(--theme-primary, #58cc02) 10%, var(--theme-page, #ffffff)) !important;
		border-radius: 8px !important;
	}

	@media print {
		html.${HIJACK_CLASS},
		body.${HIJACK_CLASS} {
			background: #ffffff !important;
		}

		#${ROOT_ID} .sceless-native-topbar,
		#${ROOT_ID} .sceless-native-aside-tools,
		#${ROOT_ID} .sceless-native-navigation,
		#${ROOT_ID} .sceless-native-question-navigation,
		#${ROOT_ID} .sceless-native-jump,
		#${ROOT_ID} .sceless-native-question-tools,
		#${ROOT_ID} .sceless-native-practice-tools {
			display: none !important;
		}

		#${ROOT_ID} .sceless-native-shell {
			padding: 0 !important;
			background: #ffffff !important;
		}

		#${ROOT_ID} .sceless-native-body {
			display: block !important;
		}

		#${ROOT_ID} .sceless-native-summary,
		#${ROOT_ID} .sceless-native-questions,
		#${ROOT_ID} .sceless-native-question {
			border-radius: 0 !important;
			border-color: #d9d9d9 !important;
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
	`;

	document.head.appendChild(styleElement);
}

function ensureRoot() {
	const existingRoot = document.getElementById(ROOT_ID);
	if (existingRoot) {
		return existingRoot;
	}

	const root = document.createElement("div");
	root.id = ROOT_ID;
	document.body.prepend(root);
	return root;
}

function clearHijackState() {
	document.documentElement.classList.remove(HIJACK_CLASS);
	document.body.classList.remove(HIJACK_CLASS);
	document.getElementById(ROOT_ID)?.remove();
}

export default defineContentScript({
	matches: ["*://scele.cs.ui.ac.id/mod/quiz/review.php*"],
	runAt: "document_start",
	cssInjectionMode: "manual",

	async main() {
		const hijackEnabled =
			(await quizReviewHijackStorage.getValue()) ?? true;

		if (!hijackEnabled) {
			return;
		}

		const mountHijackedReview = async () => {
			if (!document.body || !document.head) {
				return;
			}

			if (document.getElementById(ROOT_ID)) {
				return;
			}

			const attemptParam = new URLSearchParams(window.location.search).get(
				"attempt",
			);
			const attemptId =
				attemptParam && Number.isFinite(Number(attemptParam))
					? String(Number(attemptParam))
					: attemptParam || "";

			ensureStyles();
			await initializeTheme();

			document.documentElement.classList.add(HIJACK_CLASS);
			document.body.classList.add(HIJACK_CLASS);

			const root = ensureRoot();

			const mountedNative = await mountQuizReviewNative({
				root,
				attemptId,
				showThemeSelector: true,
			});

			if (mountedNative) {
				return;
			}

			const payload = buildQuizReviewPayloadFromDom(document);
			if (!payload) {
				clearHijackState();
				return;
			}

			render(
				<div class="min-h-screen bg-page-secondary text-content">
					<div class="mx-auto max-w-400 h-screen">
						<QuizReviewPage
							attemptId={attemptId}
							initialPayload={payload}
							showThemeSelector
						/>
					</div>
				</div>,
				root,
			);
		};

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => {
				void mountHijackedReview();
			}, { once: true });
		} else {
			void mountHijackedReview();
		}
	},
});