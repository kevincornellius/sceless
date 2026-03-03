import { BookOpen, ChevronRight, Pin } from "lucide-preact";
import type { Course } from "../../types/scele";
import { isPinned, togglePin } from "../../stores/pins";
import { navigate, Tab } from "@/src/routing/router";

interface CourseCardProps {
	course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
	const pinned = isPinned(course.id);

	const courseTab: Tab = {
		type: "course",
		url: course.url,
		title: course.name,
	} as const;

	return (
		<div
			className={`group relative flex flex-col justify-between p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
				course.isArchived
					? "bg-page border-edge opacity-70 hover:opacity-100 grayscale-[0.5] hover:grayscale-0"
					: "bg-panel border-edge hover:border-accent hover:shadow-md hover:-translate-y-1"
			}`}
			onClick={() => navigate(courseTab)}
		>
			{/* Pin button */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					togglePin(course.id);
				}}
				className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all cursor-pointer ${
					pinned
						? "text-warn bg-warn-soft"
						: "text-content-dim hover:text-warn hover:bg-warn-soft opacity-0 group-hover:opacity-100"
				}`}
				aria-label={pinned ? "Unpin course" : "Pin course"}
				title={pinned ? "Unpin" : "Pin"}
			>
				<Pin
					size={14}
					strokeWidth={2.5}
					className={pinned ? "fill-warn" : ""}
				/>
			</button>

			<div>
				<div className="flex justify-between items-start mb-3">
					<div
						className={`p-2 rounded-lg transition-colors ${
							course.isArchived
								? "bg-muted text-content-secondary"
								: "bg-accent-soft text-accent group-hover:bg-accent-muted group-hover:text-accent-fg"
						}`}
					>
						<BookOpen size={20} strokeWidth={2.5} />
					</div>
					{course.isArchived && (
						<span className="text-[10px] uppercase tracking-wider font-bold text-content-dim bg-subtle px-2 py-1 rounded">
							Archived
						</span>
					)}
				</div>

				<h3 className="font-semibold text-content leading-snug line-clamp-2 group-hover:text-accent transition-colors">
					{course.name}
				</h3>
			</div>

			<div className="mt-5 flex items-center text-sm font-semibold text-accent opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2.5 group-hover:translate-x-0">
				Buka Kelas <ChevronRight size={16} className="ml-1" />
			</div>
		</div>
	);
}
