import { useEffect } from "preact/hooks";
import { useComputed } from "@preact/signals";
import { activeTab } from "../routing/router";
import { getCourseCache, loadCourseContent } from "../stores/courseContent";
import type { Activity, Topic } from "../types/scele";
import {
	BookOpen,
	Calendar,
	ClipboardList,
	ExternalLink,
	FileText,
	Link2,
	MessageSquare,
	Vote,
} from "lucide-preact";
import { courses } from "../stores/courses";

const activityIcon = (type: Activity["type"]) => {
	switch (type) {
		case "forum":
			return <MessageSquare size={16} />;
		case "assignment":
			return <ClipboardList size={16} />;
		case "quiz":
			return <FileText size={16} />;
		case "resource":
			return <BookOpen size={16} />;
		case "url":
			return <Link2 size={16} />;
		case "choice":
			return <Vote size={16} />;
		default:
			return <FileText size={16} />;
	}
};

const ActivityItem = ({ activity }: { activity: Activity }) => {
	if (activity.type === "label") {
		return (
			<div className="px-4 py-2 text-sm text-content-secondary italic">
				{activity.title}
			</div>
		);
	}

	const inner = (
		<div className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-subtle transition-colors group">
			<span className="shrink-0 mt-0.5 text-accent">
				{activityIcon(activity.type)}
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium text-content group-hover:text-accent transition-colors truncate">
					{activity.title}
				</p>
				{activity.dates && (
					<div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
						{activity.dates.opened && (
							<span className="flex items-center gap-1 text-xs text-content-dim">
								<Calendar size={12} />
								Opens: {activity.dates.opened}
							</span>
						)}
						{activity.dates.due && (
							<span className="flex items-center gap-1 text-xs text-warn-fg font-medium">
								<Calendar size={12} />
								Due: {activity.dates.due}
							</span>
						)}
						{activity.dates.closed && (
							<span className="flex items-center gap-1 text-xs text-danger">
								<Calendar size={12} />
								Closed: {activity.dates.closed}
							</span>
						)}
					</div>
				)}
			</div>
			{activity.link && (
				<ExternalLink
					size={14}
					className="shrink-0 mt-1 text-content-dim opacity-0 group-hover:opacity-100 transition-opacity"
				/>
			)}
		</div>
	);

	if (activity.link) {
		return (
			<a
				href={activity.link}
				target="_blank"
				rel="noopener noreferrer"
				className="block"
			>
				{inner}
			</a>
		);
	}

	return inner;
};

const TopicSection = ({ topic }: { topic: Topic }) => (
	<section className="mb-6">
		<h3 className="text-sm font-semibold text-content-secondary uppercase tracking-wider px-4 py-2 bg-subtle rounded-lg mb-1">
			{topic.title}
		</h3>
		<div className="divide-y divide-edge">
			{topic.activities.map((activity, i) => (
				<ActivityItem key={i} activity={activity} />
			))}
		</div>
	</section>
);

const CourseDetailPage = ({ url }: { url: string }) => {
	useEffect(() => {
		loadCourseContent(url);
	}, [url]);

	const tab = useComputed(() => activeTab.value);
	const cached = getCourseCache(url);

	if (!cached || cached.loading) {
		return (
			<div className="max-w-4xl mx-auto p-6 space-y-4">
				<div className="h-8 w-2/3 bg-muted rounded-lg animate-pulse" />
				{[1, 2, 3].map((i) => (
					<div key={i} className="space-y-2">
						<div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
						<div className="h-12 w-full bg-subtle rounded-lg animate-pulse" />
						<div className="h-12 w-full bg-subtle rounded-lg animate-pulse" />
					</div>
				))}
			</div>
		);
	}

	if (cached.error) {
		return (
			<div className="max-w-4xl mx-auto p-6">
				<div className="p-4 rounded-lg bg-danger-soft text-danger border border-danger/20">
					Failed to load course: {cached.error}
				</div>
			</div>
		);
	}

	if (cached.topics.length === 0) {
		return (
			<div className="max-w-4xl mx-auto p-6">
				<p className="text-content-secondary">
					No content found for this course.
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-content mb-1">
					{cached.title
						? cached.title
						: courses.value.find((c) => c.url === url)?.name ||
							"Course Detail"}
				</h1>
				<p className="text-sm text-content-secondary">{url}</p>
			</div>

			{cached.topics.map((topic, i) => (
				<TopicSection key={i} topic={topic} />
			))}
		</div>
	);
};

export default CourseDetailPage;
