import { useState } from "preact/hooks";
import { ChevronDown } from "lucide-preact";
import type { Course } from "../../types/scele";
import CourseCard from "./CourseCard";

interface TermSectionProps {
	term: string;
	courses: Course[];
	defaultExpanded?: boolean;
}

export default function TermSection({
	term,
	courses,
	defaultExpanded = false,
}: TermSectionProps) {
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<section>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between pb-2 mb-4 border-b border-edge cursor-pointer group"
			>
				<h2 className="text-lg font-semibold text-content flex items-center gap-2">
					{term}
					<span className="bg-subtle text-content-secondary text-xs px-2 py-0.5 rounded-full font-bold">
						{courses.length}
					</span>
				</h2>
				<ChevronDown
					size={18}
					className={`text-content-dim group-hover:text-content-secondary transition-transform duration-200 ${
						expanded ? "" : "-rotate-90"
					}`}
				/>
			</button>

			{expanded && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{courses.map((course) => (
						<CourseCard key={course.id} course={course} />
					))}
				</div>
			)}
		</section>
	);
}
