import { render } from "preact";
import QuizReviewPage from "@/src/pages/QuizReviewPage";
import tailwindCss from "@/src/assets/tailwind.css?inline";
import { quizReviewHijackStorage } from "@/src/storage";
import { initializeTheme } from "@/src/stores/theme";
import { buildQuizReviewPayloadFromDom } from "@/src/helper/quizReviewDom";

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

			const payload = buildQuizReviewPayloadFromDom(document);
			if (!payload) {
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