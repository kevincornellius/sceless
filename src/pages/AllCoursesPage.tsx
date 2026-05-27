import { useEffect, useState } from "preact/hooks";
import { SCELE_URL } from "../config";
import { Tab } from "../types/state";
import { fetchMoodle } from "../data/adapter/moodlews/fetch";
import { decodeEntities } from "../utils/html";
import { navigateTab } from "../routing/router";
import { CourseDetailTab } from "./CourseDetailPage";
import { getUserId } from "../stores/indexeddb/siteinfo";
import { wsToken } from "../stores/auth";
import { pinnedCourses, togglePin } from "../stores/pinned";
import { FolderOpen, BookOpen, ExternalLink, Pin } from "lucide-preact";

export const AllCoursesTab: Tab = {
	type: "all-courses",
	id: "page",
	title: "All Courses",
	url: `${SCELE_URL}/course/index.php`,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseEntry {
	id: number;
	title: string;
	code: string;
	url: string;
	image?: string;
	progress?: number;
	isPast: boolean;
}

interface MoodleEnrolledCourse {
	id: number;
	fullname: string;
	shortname: string;
	viewurl?: string;
	enddate: number;
	progress?: number;
	overviewfiles?: Array<{ fileurl: string; mimetype: string }>;
}

interface Category {
	id: number;
	name: string;
	coursecount: number;
	parent: number;
	visible: number;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

function courseImageUrl(files?: MoodleEnrolledCourse["overviewfiles"]): string | undefined {
	const file = files?.find((f) => f.mimetype?.startsWith("image/"));
	if (!file) return undefined;
	const token = wsToken.value;
	return token ? `${file.fileurl}?token=${token}` : undefined;
}

async function fetchEnrolledCourses(): Promise<CourseEntry[]> {
	const userid = await getUserId();
	if (!userid) return [];
	const data = await fetchMoodle<MoodleEnrolledCourse[]>("core_enrol_get_users_courses", { userid });
	if (!data) return [];
	const now = Date.now();
	return data.map((c) => ({
		id: c.id,
		title: decodeEntities(c.fullname.replace(/^\[.*?\]\s*/, "")),
		code: decodeEntities(c.shortname),
		url: c.viewurl ?? `${SCELE_URL}/course/view.php?id=${c.id}`,
		image: courseImageUrl(c.overviewfiles),
		progress: c.progress,
		isPast: !!(c.enddate && c.enddate * 1000 < now),
	}));
}

async function fetchCategories(): Promise<Category[]> {
	const data = await fetchMoodle<Category[]>("core_course_get_categories");
	if (!data) return [];
	return data.filter((c) => c.visible !== 0);
}

// ── Components ────────────────────────────────────────────────────────────────

function EnrolledCourseCard({ course }: { course: CourseEntry }) {
	const pinned = pinnedCourses.value.some((c) => c.id === course.id);

	const handlePin = (e: MouseEvent) => {
		e.stopPropagation();
		togglePin({
			id: course.id,
			title: course.title,
			code: course.code,
			url: course.url,
			progress: course.progress ?? 0,
			isPinned: pinned,
			image: course.image,
		});
	};

	return (
		<div
			class="group/card relative flex flex-col bg-page border-2 border-edge border-b-primary rounded-xl overflow-hidden hover:border-primary transition-colors duration-150 cursor-pointer"
			onClick={() => navigateTab(CourseDetailTab(String(course.id), course.code || course.title))}
		>
			<button
				class={`absolute top-2.5 right-2.5 p-1 rounded-md transition-all duration-150 z-10 ${
					pinned
						? "text-primary opacity-100"
						: "text-content-muted opacity-0 group-hover/card:opacity-100 hover:text-primary"
				}`}
				onClick={handlePin}
				title={pinned ? "Unpin" : "Pin"}
			>
				<Pin class="w-3.5 h-3.5" fill={pinned ? "currentColor" : "none"} />
			</button>

			<div class="flex flex-col flex-1 p-4 pr-8 gap-1.5">
				{course.isPast && (
					<span class="self-start text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-edge text-content-muted mb-0.5">
						Past
					</span>
				)}
				<h3 class="text-xs font-semibold text-content leading-snug line-clamp-2 group-hover/card:text-primary transition-colors">
					{course.title}
				</h3>
				{course.code && <p class="text-[10px] text-content-muted">{course.code}</p>}
				{!course.isPast && course.progress !== undefined && (
					<div class="mt-auto pt-2">
						<div class="flex justify-between text-[10px] text-content-muted mb-1">
							<span>Progress</span>
							<span>{Math.round(course.progress)}%</span>
						</div>
						<div class="h-1 bg-edge rounded-full overflow-hidden">
							<div class="h-full bg-primary rounded-full" style={{ width: `${course.progress}%` }} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function CategoryCard({ cat }: { cat: Category }) {
	return (
		<div
			class="group flex items-center gap-3 px-3 py-2.5 bg-page border-l-2 border-primary rounded-r-lg hover:bg-page-secondary transition-all duration-150 cursor-pointer"
			onClick={() => window.open(`${SCELE_URL}/course/index.php?categoryid=${cat.id}`, "_blank")}
		>
			<div class="flex-1 min-w-0">
				<p class="text-xs font-semibold text-content group-hover:text-primary transition-colors truncate">
					{decodeEntities(cat.name)}
				</p>
				{cat.coursecount > 0 && (
					<p class="text-[10px] text-content-muted">{cat.coursecount} courses</p>
				)}
			</div>
			<ExternalLink class="w-3 h-3 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
		</div>
	);
}

// ── Page ──────────────────────────────────────────────────────────────────────

const AllCoursesPage = () => {
	const [loadingCourses, setLoadingCourses] = useState(true);
	const [loadingCats, setLoadingCats] = useState(true);
	const [courses, setCourses] = useState<CourseEntry[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);

	useEffect(() => {
		fetchEnrolledCourses()
			.then(setCourses)
			.finally(() => setLoadingCourses(false));
		fetchCategories()
			.then(setCategories)
			.finally(() => setLoadingCats(false));
	}, []);

	const activeCourses = courses.filter((c) => !c.isPast);
	const pastCourses = courses.filter((c) => c.isPast);
	const topLevel = categories.filter((c) => c.parent === 0);
	const subCats = categories.filter((c) => c.parent !== 0);

	return (
		<div class="p-5 h-full overflow-y-auto scrollbar-thin space-y-7">

			{/* Enrolled courses */}
			<section>
				<div class="flex items-center gap-2 mb-3">
					<BookOpen class="w-4 h-4 text-primary" />
					<h2 class="text-sm font-bold text-content">My Enrolled Courses</h2>
					{!loadingCourses && (
						<span class="text-xs px-2 py-0.5 rounded-lg font-semibold bg-edge text-content-muted">
							{courses.length}
						</span>
					)}
				</div>

				{loadingCourses ? (
					<p class="text-xs text-content-muted">Loading…</p>
				) : courses.length === 0 ? (
					<p class="text-xs text-content-muted">No enrolled courses found.</p>
				) : (
					<div class="space-y-4">
						{activeCourses.length > 0 && (
							<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
								{activeCourses.map((c) => <EnrolledCourseCard key={c.id} course={c} />)}
							</div>
						)}
						{pastCourses.length > 0 && (
							<details class="group/det">
								<summary class="text-xs text-content-muted cursor-pointer select-none hover:text-content transition-colors list-none flex items-center gap-1.5">
									<span class="group-open/det:hidden">▶</span>
									<span class="hidden group-open/det:inline">▼</span>
									Past courses ({pastCourses.length})
								</summary>
								<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-3">
									{pastCourses.map((c) => <EnrolledCourseCard key={c.id} course={c} />)}
								</div>
							</details>
						)}
					</div>
				)}
			</section>

			{/* Categories */}
			<section>
				<div class="flex items-center gap-2 mb-3">
					<FolderOpen class="w-4 h-4 text-primary" />
					<h2 class="text-sm font-bold text-content">Browse by Category</h2>
				</div>

				{loadingCats ? (
					<p class="text-xs text-content-muted">Loading…</p>
				) : categories.length === 0 ? (
					<p class="text-xs text-content-muted">No categories found.</p>
				) : (
					<div class="space-y-4">
						{topLevel.length > 0 && (
							<div class="flex flex-col gap-1">
								{topLevel.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
							</div>
						)}
						{subCats.length > 0 && (
							<details class="group/det">
								<summary class="text-xs text-content-muted cursor-pointer select-none hover:text-content transition-colors list-none flex items-center gap-1.5">
									<span class="group-open/det:hidden">▶</span>
									<span class="hidden group-open/det:inline">▼</span>
									Subcategories ({subCats.length})
								</summary>
								<div class="flex flex-col gap-1 mt-2">
									{subCats.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
								</div>
							</details>
						)}
					</div>
				)}
			</section>

		</div>
	);
};

export default AllCoursesPage;
