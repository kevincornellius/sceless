export interface InitialData {
	isLoggedIn: boolean;
	username: string | null;
	logoutUrl: string;
}

export interface Course {
	id: string;
	name: string;
	url: string;
	isArchived: boolean;
	term: string;
}

// ── Course content (scraped from course page) ──

export type ActivityType =
	| "forum"
	| "url"
	| "label"
	| "assignment"
	| "quiz"
	| "resource"
	| "choice"
	| "unknown";

export interface ActivityDates {
	opened?: string;
	due?: string;
	closed?: string;
}

export interface Activity {
	type: ActivityType;
	title: string;
	link: string | null;
	dates?: ActivityDates;
}

export interface Topic {
	title: string;
	activities: Activity[];
}

// ── Upcoming events (from calendar) ──

export interface UpcomingEvent {
	id: string;
	title: string;
	courseName: string;
	courseUrl: string;
	dueDate: string;
	dueTime: string;
	component: string;
	eventType: string;
	description: string;
	link: string;
}
