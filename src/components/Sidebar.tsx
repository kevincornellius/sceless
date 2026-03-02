import { useEffect, useRef, useState } from "preact/hooks";
import type { initialData } from "@/src/types/scele";

const MIN_W = 64;
const MAX_W = 280;
const COLLAPSE_THRESHOLD = 72;
const DEFAULT_W = 192;

const NAV_ITEMS = [
	{ label: "Dashboard", href: "#" },
	{ label: "Courses", href: "#" },
];

const Sidebar = ({ data }: { data: initialData }) => {
	const [width, setWidth] = useState(DEFAULT_W);
	const [animate, setAnimate] = useState(false);
	const dragging = useRef(false);
	const startX = useRef(0);
	const startW = useRef(0);

	const expanded = width > COLLAPSE_THRESHOLD;

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!dragging.current) return;
			const delta = e.clientX - startX.current;
			const next = Math.min(
				MAX_W,
				Math.max(MIN_W, startW.current + delta),
			);
			setWidth(next);
		};
		const onMouseUp = () => {
			if (!dragging.current) return;
			dragging.current = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			setWidth((w) => w);
		};
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
		return () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};
	}, []);

	const onDragHandleMouseDown = (e: MouseEvent) => {
		e.preventDefault();
		setAnimate(false);
		dragging.current = true;
		startX.current = e.clientX;
		startW.current = width;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	};

	return (
		<aside
			style={{ width: `${width}px` }}
			class={`relative shrink-0 flex flex-col px-3 py-6 gap-6${animate ? " transition-[width] duration-200" : ""}`}
		>
			<button
				onClick={() => {
					setAnimate(true);
					setWidth((w) =>
						w > COLLAPSE_THRESHOLD ? MIN_W : DEFAULT_W,
					);
				}}
				class="flex cursor-pointer items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors overflow-hidden"
			>
				{expanded ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M15 18l-6-6 6-6" />
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M9 18l6-6-6-6" />
					</svg>
				)}
			</button>

			{/* Nav */}
			<nav class="flex flex-col gap-1 flex-1 overflow-hidden">
				{NAV_ITEMS.map(({ label, href }) => (
					<a
						key={label}
						href={href}
						title={!expanded ? label : undefined}
						class="flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors overflow-hidden"
					>
						<span class="w-5 h-5 shrink-0 rounded bg-gray-200 inline-block" />
						{expanded && <span class="truncate">{label}</span>}
					</a>
				))}
			</nav>

			<div class="border-t border-gray-100 pt-4 flex flex-col gap-1 overflow-hidden">
				{expanded ? (
					<>
						<p class="px-2 text-xs font-semibold text-gray-900 truncate">
							{data.username}
						</p>
						<a
							href={data.logoutUrl}
							class="px-2 text-xs text-red-500 hover:text-red-600 transition-colors"
						>
							Log out
						</a>
					</>
				) : (
					<a
						href={data.logoutUrl}
						title="Log out"
						class="flex justify-center p-1 text-red-400 hover:text-red-600 transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
					</a>
				)}
			</div>

			{/* Drag handle */}
			<div
				onMouseDown={onDragHandleMouseDown}
				class="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors"
			/>
		</aside>
	);
};

export default Sidebar;
