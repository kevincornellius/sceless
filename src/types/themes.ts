export interface ThemeConfig {
	name: string;
	primary: string;
	primaryDark: string;
	bg: string;
	bgSecondary: string;
	border: string;
	text: string;
	textMuted: string;
	highlight: string;
	success: string;
	danger: string;
}

export const defaultThemes: ThemeConfig[] = [
	{
		name: "Duolingo",
		primary: "#58CC02",
		primaryDark: "#46A302",
		bg: "#FFFFFF",
		bgSecondary: "#F7F7F7",
		border: "#E5E5E5",
		text: "#3C3C3C",
		textMuted: "#AFAFAF",
		highlight: "#FFC800",
		success: "#58CC02",
		danger: "#FF4B4B",
	},
	{
		name: "SCELE",
		primary: "#0056B3",
		primaryDark: "#004494",
		bg: "#FFFFFF",
		bgSecondary: "#F8F9FA",
		border: "#E9ECEF",
		text: "#212529",
		textMuted: "#6C757D",
		highlight: "#D4AC0D",
		success: "#198754",
		danger: "#DC3545",
	},
	{
		name: "GitHub",
		primary: "#0969DA",
		primaryDark: "#0550AE",
		bg: "#FFFFFF",
		bgSecondary: "#F6F8FA",
		border: "#D0D7DE",
		text: "#24292F",
		textMuted: "#57606A",
		highlight: "#9A6700",
		success: "#2EA043",
		danger: "#D73A49",
	},
];
