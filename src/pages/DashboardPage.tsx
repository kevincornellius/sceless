import { useState, useEffect } from "preact/hooks";
import { Archive, GraduationCap, Pin, Clock, AlertCircle } from "lucide-preact";
import type { InitialData } from "../types/scele";
import { courses, coursesLoading, groupedCourses } from "../stores/courses";
import { pinnedIds } from "../stores/pins";
import {
	getUpcomingEvents,
	getUpcomingLoading,
	getUpcomingError,
	loadUpcomingEvents,
} from "../stores/upcomingEvents";
import TermSection from "../components/dashboard/TermSection";
import CourseCard from "../components/dashboard/CourseCard";

interface DashboardProps {
	data: InitialData;
}

export default function Dashboard({ data }: DashboardProps) {
	const [showArchived, setShowArchived] = useState(false);

	const isLoading = coursesLoading.value;
	const grouped = groupedCourses(showArchived);
	const pins = pinnedIds.value;
	const pinnedCourses = courses.value.filter((c) => pins.has(c.id));

	// Load upcoming events on mount
	useEffect(() => {
		loadUpcomingEvents();
	}, []);

	const upcomingEvents = getUpcomingEvents();
	const upcomingLoading = getUpcomingLoading();
	const upcomingError = getUpcomingError();

	if (isLoading) {
		return (
			<div className="max-w-5xl mx-auto p-6 w-full antialiased font-sans">
				<div className="flex justify-between items-center mb-8">
					<div>
						<div className="h-8 w-64 bg-muted rounded-md animate-pulse mb-2" />
						<div className="h-4 w-48 bg-subtle rounded-md animate-pulse" />
					</div>
					<div className="h-10 w-36 bg-subtle rounded-full animate-pulse" />
				</div>
				<div className="h-6 w-40 bg-muted rounded-md animate-pulse mb-6" />
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<div
							key={i}
							className="p-5 rounded-xl border border-edge bg-panel shadow-sm h-32 flex flex-col justify-between"
						>
							<div>
								<div className="h-10 w-10 bg-subtle rounded-lg animate-pulse mb-3" />
								<div className="h-5 w-3/4 bg-muted rounded-md animate-pulse mb-2" />
								<div className="h-5 w-1/2 bg-subtle rounded-md animate-pulse" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto p-6 antialiased font-sans text-content">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-content flex items-center gap-2">
						<GraduationCap className="text-accent" size={32} />
						Dashboard
					</h1>
					<p className="text-content-secondary mt-1">
						Welcome, {data.username}!
					</p>
				</div>

				<button
					onClick={() => setShowArchived(!showArchived)}
					className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer ${
						showArchived
							? "bg-invert text-content-invert border-invert shadow-md"
							: "bg-panel text-content-secondary border-edge hover:bg-subtle hover:border-edge-strong"
					}`}
				>
					<Archive size={16} />
					{showArchived ? "Sembunyikan Arsip" : "Tampilkan Arsip"}
				</button>
			</div>

			{/* Upcoming assignments & Pinned courses - Side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
				{/* Upcoming assignments section */}
				<div>
					{upcomingLoading && (
						<section>
							<h2 className="text-lg font-semibold text-content mb-4 pb-2 border-b border-danger-edge flex items-center gap-2">
								<Clock size={16} className="text-danger" />
								Upcoming
								<span className="bg-danger-soft text-danger-fg text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
									...
								</span>
							</h2>
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className="p-3 rounded-lg border border-edge bg-panel"
									>
										<div className="space-y-2">
											<div className="h-4 bg-muted rounded animate-pulse w-3/4" />
											<div className="h-3 bg-subtle rounded animate-pulse w-1/2" />
											<div className="h-3 bg-subtle rounded animate-pulse w-2/3" />
										</div>
									</div>
								))}
							</div>
						</section>
					)}

					{!upcomingLoading && upcomingEvents.length > 0 && (
						<section>
							<h2 className="text-lg font-semibold text-content mb-4 pb-2 border-b border-danger-edge flex items-center gap-2">
								<Clock size={16} className="text-danger" />
								Upcoming
								<span className="bg-danger-soft text-danger-fg text-xs px-2 py-0.5 rounded-full font-bold">
									{upcomingEvents.length}
								</span>
							</h2>
							<div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-edge hover:scrollbar-thumb-muted">
								{upcomingEvents.map((event) => (
									<a
										key={event.id}
										href={event.link || "#"}
										className="block p-3 rounded-lg border border-edge bg-panel hover:bg-subtle transition-colors"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex-1 min-w-0">
												<h3 className="font-semibold text-content text-sm truncate">
													{event.title}
												</h3>
												<p className="text-xs text-content-secondary mt-1">
													{event.courseName}
												</p>
												<div className="flex items-center gap-1 mt-2 text-xs text-danger">
													<Clock size={12} />
													<span>
														{event.dueDate}
														{event.dueTime &&
															`, ${event.dueTime}`}
													</span>
												</div>
											</div>
										</div>
									</a>
								))}
							</div>
						</section>
					)}

					{upcomingError && (
						<div className="p-4 rounded-lg border border-warn-edge bg-warn-soft flex items-start gap-3">
							<AlertCircle
								size={20}
								className="text-warn flex-shrink-0 mt-0.5"
							/>
							<div>
								<h3 className="font-semibold text-warn-fg text-sm">
									Could not load upcoming events
								</h3>
								<p className="text-xs text-warn-secondary mt-1">
									{upcomingError}
								</p>
							</div>
						</div>
					)}

					{!upcomingLoading && upcomingEvents.length === 0 && (
						<div className="p-4 rounded-lg border border-edge bg-panel text-center">
							<p className="text-sm text-content-secondary">
								No upcoming assignments
							</p>
						</div>
					)}
				</div>

				{/* Pinned courses section */}
				<div>
					{pinnedCourses.length > 0 && (
						<section>
							<h2 className="text-lg font-semibold text-content mb-4 pb-2 border-b border-warn-edge flex items-center gap-2">
								<Pin size={16} className="text-warn" />
								Pinned
								<span className="bg-warn-soft text-warn-fg text-xs px-2 py-0.5 rounded-full font-bold">
									{pinnedCourses.length}
								</span>
							</h2>
							<div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-edge hover:scrollbar-thumb-muted">
								{pinnedCourses.map((course) => (
									<CourseCard
										key={course.id}
										course={course}
									/>
								))}
							</div>
						</section>
					)}

					{pinnedCourses.length === 0 && (
						<div className="p-4 rounded-lg border border-edge bg-panel text-center">
							<p className="text-sm text-content-secondary">
								No pinned courses
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Course list by term */}
			<div className="space-y-10">
				{Object.keys(grouped).length === 0 ? (
					<div className="text-center py-12 border-2 border-dashed border-edge rounded-xl bg-page">
						<p className="text-content-secondary font-medium">
							Tidak ada mata kuliah yang ditemukan.
						</p>
					</div>
				) : (
					Object.entries(grouped).map(([term, termCourses]) => (
						<TermSection
							key={term}
							term={term}
							courses={termCourses}
						/>
					))
				)}
			</div>
		</div>
	);
}
