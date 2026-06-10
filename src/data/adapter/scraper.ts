import type {
	Activity,
	ActivityDates,
	ActivityType,
	Topic,
	UpcomingEvent,
} from "../../types/scele";

export const scrapeSceleData = () => {
	const logInButton = document.querySelector(".usermenu .login a");
	const isLoggedIn = !logInButton;

	const username = isLoggedIn
		? (document
				.querySelector(".userbutton .usertext")
				?.textContent?.trim() ?? null)
		: null;

	const logoutElement = document.querySelector(
		'a[href*="logout.php"]',
	) as HTMLAnchorElement;

	const logoutUrl = logoutElement
		? logoutElement.href
		: "https://scele.cs.ui.ac.id/login/logout.php";

	return { isLoggedIn, username, logoutUrl };
};

export const fetchCoursesFromMy = async () => {
	try {

		const response = await fetch("https://scele.cs.ui.ac.id/my/");
		if (!response.ok) throw new Error("Failed to fetch /my");

		const htmlText = await response.text();

		const parser = new DOMParser();
		const virtualDoc = parser.parseFromString(htmlText, "text/html");

		const courseElements = virtualDoc.querySelectorAll(
			".type_system li.type_course a",
		);

		const courses = Array.from(courseElements).map((el) => {
			const anchor = el as HTMLAnchorElement;

			const parentUl = anchor.closest("ul");
			const semesterElement = parentUl?.previousElementSibling;
			const term = semesterElement?.textContent?.trim() || "Unknown Term";

			const rawName =
				anchor.getAttribute("title")?.trim() ||
				anchor.textContent?.trim() ||
				"Unknown Course";
			const cleanName = rawName.replace(/^\[.*?\]\s*/, "");

			return {
				id: anchor.href.split("id=")[1] || Math.random().toString(),
				name: cleanName,
				url: anchor.href,
				isArchived: anchor.classList.contains("dimmed_text"),
				term: term,
			};
		});

		return courses;
	} catch (error) {
		console.error("[sceless] Courses fetch error:", error);
		return [];
	}
};

export const fetchCourseContent = async (
	courseUrl: string,
): Promise<{ title: string; topics: Topic[] }> => {
	try {

		const response = await fetch(courseUrl);
		if (!response.ok) throw new Error(`Failed to fetch ${courseUrl}`);

		const htmlText = await response.text();
		const parser = new DOMParser();
		const virtualDoc = parser.parseFromString(htmlText, "text/html");

		// Extract course title from page header
		const titleElement = virtualDoc.querySelector(
			".page-context-header .page-header-headings h1",
		);
		const title = titleElement
			? (titleElement.textContent?.trim() ?? "Course")
			: "Course";

		const courseContent = virtualDoc.querySelector(".course-content");

		if (!courseContent) {
			return { title, topics: [] };
		}

		const topicElements = Array.from(
			courseContent.querySelectorAll("ul.topics > li.section"),
		);

		const topics: Topic[] = topicElements.map((topicEl) => {
			const titleElement = topicEl.querySelector("h3.sectionname span");
			const title = titleElement
				? (titleElement.textContent?.trim() ?? "Unknown Topic")
				: "Unknown Topic";

			const activityElements = Array.from(
				topicEl.querySelectorAll("ul.section li.activity"),
			);

			const activities: Activity[] = activityElements.map(
				(activityEl) => {
					const classList = activityEl.className;
					let type: ActivityType = "unknown";

					if (classList.includes("modtype_forum")) type = "forum";
					else if (classList.includes("modtype_url")) type = "url";
					else if (classList.includes("modtype_label"))
						type = "label";
					else if (classList.includes("modtype_assign"))
						type = "assignment";
					else if (classList.includes("modtype_quiz")) type = "quiz";
					else if (classList.includes("modtype_resource"))
						type = "resource";
					else if (classList.includes("modtype_choice"))
						type = "choice";

					const instanceNameElement =
						activityEl.querySelector(".instancename");
					let activityTitle = "";

					if (instanceNameElement) {
						const accessHide =
							instanceNameElement.querySelector(".accesshide");
						if (accessHide) {
							const clone = instanceNameElement.cloneNode(
								true,
							) as HTMLElement;
							const hiddenChild =
								clone.querySelector(".accesshide");
							if (hiddenChild) clone.removeChild(hiddenChild);
							activityTitle = clone.textContent?.trim() ?? "";
						} else {
							activityTitle =
								instanceNameElement.textContent?.trim() ?? "";
						}
					} else {
						const noOverflow =
							activityEl.querySelector(".no-overflow");
						activityTitle = noOverflow
							? (noOverflow.textContent
									?.replace(/\s+/g, " ")
									.trim() ?? "Label Text")
							: "Label Text";
					}

					const linkElement = activityEl.querySelector(
						"a.aalink",
					) as HTMLAnchorElement | null;
					const link = linkElement ? linkElement.href : null;

					const datesElement = activityEl.querySelector(
						'[data-region="activity-dates"]',
					);
					let dates: ActivityDates | undefined;
					if (datesElement) {
						const d: ActivityDates = {};
						const dateDivs =
							datesElement.querySelectorAll("div > div");
						dateDivs.forEach((div) => {
							const text = div.textContent?.trim() ?? "";
							if (text.includes("Opened:"))
								d.opened = text.replace("Opened:", "").trim();
							if (text.includes("Opens:"))
								d.opened = text.replace("Opens:", "").trim();
							if (text.includes("Due:"))
								d.due = text.replace("Due:", "").trim();
							if (text.includes("Closed:"))
								d.closed = text.replace("Closed:", "").trim();
							if (text.includes("Closes:"))
								d.closed = text.replace("Closes:", "").trim();
						});
						if (Object.keys(d).length > 0) dates = d;
					}

					return { type, title: activityTitle, link, dates };
				},
			);

			return { title, activities };
		});

		return { title, topics };
	} catch (error) {
		console.error("[sceless] Course content fetch error:", error);
		return { title: "Course", topics: [] };
	}
};

export const fetchUpcomingEvents = async (): Promise<UpcomingEvent[]> => {
	try {

		const response = await fetch(
			"https://scele.cs.ui.ac.id/calendar/view.php?view=upcoming",
		);
		if (!response.ok) throw new Error("Failed to fetch calendar");

		const htmlText = await response.text();
		const parser = new DOMParser();
		const virtualDoc = parser.parseFromString(htmlText, "text/html");

		const eventElements = Array.from(
			virtualDoc.querySelectorAll(".eventlist .event"),
		);

		const events: UpcomingEvent[] = eventElements.map((eventEl) => {
			const id = eventEl.getAttribute("data-event-id") ?? "";
			const component =
				eventEl.getAttribute("data-event-component") ?? "";
			const eventType =
				eventEl.getAttribute("data-event-eventtype") ?? "";

			const titleEl = eventEl.querySelector("h3.name");
			const title = titleEl?.textContent?.trim() ?? "Unknown Event";

			// Extract due date and time
			let dueDate = "";
			let dueTime = "";
			const dateLink = eventEl.querySelector(
				".description .row:first-child a",
			) as HTMLAnchorElement | null;
			if (dateLink && dateLink.textContent) {
				const dateText = dateLink.textContent.trim();
				const timeText =
					dateLink.nextSibling?.textContent?.trim() ?? "";
				dueDate = dateText;
				dueTime = timeText.replace(",", "").trim();
			}

			// Extract description
			const descEl = eventEl.querySelector(".description-content");
			const description = descEl?.textContent?.trim() ?? "";

			// Extract course name and URL
			let courseName = "";
			let courseUrl = "";
			const courseLink = eventEl.querySelector(
				".description a[href*='course/view']",
			) as HTMLAnchorElement | null;
			if (courseLink) {
				courseName = courseLink.textContent?.trim() ?? "";
				courseUrl = courseLink.href ?? "";
			}

			// Extract activity link
			let link = "";
			const activityLink = eventEl.querySelector(
				".card-footer a.card-link",
			) as HTMLAnchorElement | null;
			if (activityLink) {
				link = activityLink.href ?? "";
			}

			return {
				id,
				title,
				courseName,
				courseUrl,
				dueDate,
				dueTime,
				component,
				eventType,
				description,
				link,
			};
		});

		return events;
	} catch (error) {
		console.error("[sceless] Upcoming events fetch error:", error);
		return [];
	}
};
