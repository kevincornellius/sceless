import { useEffect, useState } from "preact/hooks";
import { enabledStorage, quizReviewHijackStorage, sceleModStorage } from "@/src/storage";

interface ToggleSwitchProps {
	checked: boolean;
	onToggle: () => void;
	ariaLabel: string;
	activeClass?: string;
}

function ToggleSwitch({
	checked,
	onToggle,
	ariaLabel,
	activeClass = "bg-blue-600",
}: ToggleSwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={ariaLabel}
			onClick={onToggle}
			class={[
				"relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
				"transition-colors duration-200 ease-in-out",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
				checked ? activeClass : "bg-gray-300",
			].join(" ")}
		>
			<span
				aria-hidden="true"
				class={[
					"pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0",
					"transition-transform duration-200 ease-in-out",
					checked ? "translate-x-5" : "translate-x-0",
				].join(" ")}
			/>
		</button>
	);
}

export function Popup() {
	const [mainEnabled, setMainEnabled] = useState<boolean | null>(null);
	const [quizHijackEnabled, setQuizHijackEnabled] = useState<boolean | null>(null);
	const [sceleModEnabled, setSceleModEnabled] = useState<boolean | null>(null);

	useEffect(() => {
		enabledStorage.getValue().then((value) => setMainEnabled(value ?? true));
		quizReviewHijackStorage.getValue().then((value) => setQuizHijackEnabled(value ?? true));
		sceleModStorage.getValue().then((value) => setSceleModEnabled(value ?? true));

		const unwatchMain = enabledStorage.watch((value) => setMainEnabled(value ?? true));
		const unwatchQuizHijack = quizReviewHijackStorage.watch((value) => setQuizHijackEnabled(value ?? true));
		const unwatchSceleMod = sceleModStorage.watch((value) => setSceleModEnabled(value ?? true));

		return () => {
			unwatchMain();
			unwatchQuizHijack();
			unwatchSceleMod();
		};
	}, []);

	const toggleMainEnabled = async () => {
		const next = !mainEnabled;
		await enabledStorage.setValue(next);
		setMainEnabled(next);
	};

	const toggleQuizHijackEnabled = async () => {
		const next = !quizHijackEnabled;
		await quizReviewHijackStorage.setValue(next);
		setQuizHijackEnabled(next);
	};

	const toggleSceleModEnabled = async () => {
		const next = !sceleModEnabled;
		await sceleModStorage.setValue(next);
		setSceleModEnabled(next);
	};

	if (mainEnabled === null || quizHijackEnabled === null || sceleModEnabled === null) {
		return null;
	}

	return (
		<div class="w-72 p-4 flex flex-col gap-3">
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-sm font-semibold">Sceless</p>
					<p class="text-xs text-gray-500">
						{mainEnabled ? "Active on SCELE" : "Disabled"}
					</p>
				</div>

				<ToggleSwitch
					checked={mainEnabled}
					onToggle={() => {
						void toggleMainEnabled();
					}}
					ariaLabel="Toggle Sceless"
				/>
			</div>

			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-sm font-semibold">Quiz Review</p>
					<p class="text-xs text-gray-500">
						{quizHijackEnabled
							? "Replace review with Sceless UI"
							: "Use original SCELE review page"}
					</p>
				</div>

				<ToggleSwitch
					checked={quizHijackEnabled}
					onToggle={() => {
						void toggleQuizHijackEnabled();
					}}
					ariaLabel="Toggle Quiz Review Hijack"
					activeClass="bg-emerald-600"
				/>
			</div>

			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-sm font-semibold">Stylized Native Pages</p>
					<p class="text-xs text-gray-500">
						{sceleModEnabled
							? "Sceless styles on SCELE pages"
							: "Use original SCELE styles"}
					</p>
				</div>
				<ToggleSwitch
					checked={sceleModEnabled}
					onToggle={() => { void toggleSceleModEnabled(); }}
					ariaLabel="Toggle Stylized Native Pages"
					activeClass="bg-emerald-600"
				/>
			</div>

			{(!mainEnabled || !quizHijackEnabled) && (
				<p class="text-xs text-gray-400 border-t pt-2">
					Reload the tab after changing toggles.
				</p>
			)}
		</div>
	);
}
