export interface ModuleTypeColors {
	assign:        string;
	quiz:          string;
	forum:         string;
	resource:      string;
	folder:        string;
	page:          string;
	url:           string;
	lesson:        string;
	choice:        string;
	book:          string;
	media:         string;
	questionnaire: string;
	unknown:       string;
}

export interface ThemeConfig {
	name: string;
	primary: string;
	primaryDark: string;
	onPrimary: string;
	bg: string;
	bgSecondary: string;
	border: string;
	text: string;
	textMuted: string;
	highlight: string;
	success: string;
	danger: string;
	moduleColors: ModuleTypeColors;
}

const colorful: ModuleTypeColors = {
	assign:        "#F97316",
	quiz:          "#8B5CF6",
	forum:         "#3B82F6",
	resource:      "#64748B",
	folder:        "#F59E0B",
	page:          "#0EA5E9",
	url:           "#14B8A6",
	lesson:        "#22C55E",
	choice:        "#EC4899",
	book:          "#6366F1",
	media:         "#EF4444",
	questionnaire: "#8B5CF6",
	unknown:       "#94A3B8",
};

const monochromeDark: ModuleTypeColors = {
	assign:        "#8E8E8E",
	quiz:          "#8E8E8E",
	forum:         "#8E8E8E",
	resource:      "#8E8E8E",
	folder:        "#8E8E8E",
	page:          "#8E8E8E",
	url:           "#8E8E8E",
	lesson:        "#8E8E8E",
	choice:        "#8E8E8E",
	book:          "#8E8E8E",
	media:         "#8E8E8E",
	questionnaire: "#8E8E8E",
	unknown:       "#8E8E8E",
};

const monochromeLight: ModuleTypeColors = {
	assign:        "#666666",
	quiz:          "#666666",
	forum:         "#666666",
	resource:      "#666666",
	folder:        "#666666",
	page:          "#666666",
	url:           "#666666",
	lesson:        "#666666",
	choice:        "#666666",
	book:          "#666666",
	media:         "#666666",
	questionnaire: "#666666",
	unknown:       "#666666",
};

export const defaultThemes: ThemeConfig[] = [
	{
		name: "Sceless",
		primary: "#58CC02",
		primaryDark: "#46A302",
		onPrimary: "#FFFFFF",
		bg: "#FFFFFF",
		bgSecondary: "#F7F7F7",
		border: "#E5E5E5",
		text: "#3C3C3C",
		textMuted: "#AFAFAF",
		highlight: "#FFC800",
		success: "#58CC02",
		danger: "#FF4B4B",
		moduleColors: colorful,
	},
	{
		name: "Rose",
		primary: "#DC8A78",
		primaryDark: "#E64553",
		onPrimary: "#EFF1F5",
		bg: "#EFF1F5",
		bgSecondary: "#E6E9EF",
		border: "#CCD0DA",
		text: "#4C4F69",
		textMuted: "#7C7F93",
		highlight: "#DF8E1D",
		success: "#40A02B",
		danger: "#D20F39",
		moduleColors: colorful,
	},
	{
		name: "SCELE",
		primary: "#0056B3",
		primaryDark: "#004494",
		onPrimary: "#FFFFFF",
		bg: "#FFFFFF",
		bgSecondary: "#F8F9FA",
		border: "#E9ECEF",
		text: "#212529",
		textMuted: "#6C757D",
		highlight: "#D4AC0D",
		success: "#198754",
		danger: "#DC3545",
		moduleColors: colorful,
	},
	{
		name: "GitHub",
		primary: "#0969DA",
		primaryDark: "#0550AE",
		onPrimary: "#FFFFFF",
		bg: "#FFFFFF",
		bgSecondary: "#F6F8FA",
		border: "#D0D7DE",
		text: "#24292F",
		textMuted: "#57606A",
		highlight: "#9A6700",
		success: "#2EA043",
		danger: "#D73A49",
		moduleColors: colorful,
	},
	{
		name: "Tokyo",
		primary: "#7AA2F7",
		primaryDark: "#4D7BE8",
		onPrimary: "#1A1B26",
		bg: "#1A1B26",
		bgSecondary: "#24283B",
		border: "#414868",
		text: "#C0CAF5",
		textMuted: "#565F89",
		highlight: "#E0AF68",
		success: "#9ECE6A",
		danger: "#F7768E",
		moduleColors: {
			assign:        "#FF9E64",
			quiz:          "#BB9AF7",
			forum:         "#7AA2F7",
			resource:      "#9AA5CE",
			folder:        "#E0AF68",
			page:          "#7DCFFF",
			url:           "#73DACA",
			lesson:        "#9ECE6A",
			choice:        "#F7768E",
			book:          "#7AA2F7",
			media:         "#F7768E",
			questionnaire: "#BB9AF7",
			unknown:       "#565F89",
		},
	},
	{
		name: "Noir",
		primary: "#FFFFFF",
		primaryDark: "#E5E5E5",
		onPrimary: "#000000",
		bg: "#000000",
		bgSecondary: "#121212",
		border: "#262626",
		text: "#FFFFFF",
		textMuted: "#8E8E8E",
		highlight: "#FFFFFF",
		success: "#FFFFFF",
		danger: "#8E8E8E",
		moduleColors: monochromeDark,
	},
	{
		name: "Paper",
		primary: "#000000",
		primaryDark: "#1A1A1A",
		onPrimary: "#FFFFFF",
		bg: "#FFFFFF",
		bgSecondary: "#F5F5F5",
		border: "#D4D4D4",
		text: "#000000",
		textMuted: "#666666",
		highlight: "#000000",
		success: "#000000",
		danger: "#666666",
		moduleColors: monochromeLight,
	},
	{
		name: "Notion",
		primary: "#EFEFEF",
		primaryDark: "#D4D4D4",
		onPrimary: "#191919",
		bg: "#191919",
		bgSecondary: "#202020",
		border: "#2E2E2E",
		text: "#D4D4D4",
		textMuted: "#9B9B9B",
		highlight: "#E5A443",
		success: "#529E72",
		danger: "#D95252",
		moduleColors: {
			assign:        "#D4A373",
			quiz:          "#A8DADC",
			forum:         "#7FB3D3",
			resource:      "#9B9B9B",
			folder:        "#E5A443",
			page:          "#84C1D9",
			url:           "#76C8B0",
			lesson:        "#529E72",
			choice:        "#C88B9A",
			book:          "#8B9DC3",
			media:         "#D95252",
			questionnaire: "#A8DADC",
			unknown:       "#6B6B6B",
		},
	},
];
