import { useEffect, useState } from "preact/hooks";
import { enabledStorage } from "@/src/storage";

export function Popup() {
	const [enabled, setEnabled] = useState<boolean | null>(null);

	useEffect(() => {
		enabledStorage.getValue().then((v) => setEnabled(v ?? true));
		return enabledStorage.watch((v) => setEnabled(v ?? true));
	}, []);

	const toggle = async () => {
		const next = !enabled;
		await enabledStorage.setValue(next);
		setEnabled(next);
	};

	if (enabled === null) return null;

	return (
		<div class="w-60 p-4 flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-semibold">Sceless</p>
					<p class="text-xs text-gray-500">
						{enabled ? "Active on SCELE" : "Disabled"}
					</p>
				</div>

				<button
					type="button"
					role="switch"
					aria-checked={enabled}
					aria-label="Toggle Sceless"
					onClick={toggle}
					class={[
						"relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
						"transition-colors duration-200 ease-in-out",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
						enabled ? "bg-blue-600" : "bg-gray-300",
					].join(" ")}
				>
					<span
						aria-hidden="true"
						class={[
							"pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0",
							"transition-transform duration-200 ease-in-out",
							enabled ? "translate-x-5" : "translate-x-0",
						].join(" ")}
					/>
				</button>
			</div>

			{!enabled && (
				<p class="text-xs text-gray-400 border-t pt-2">
					Reload the tab to restore SCELE.
				</p>
			)}
		</div>
	);
}
