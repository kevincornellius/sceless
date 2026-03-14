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
}

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
	},
	{
		name: 'Tokyo',
		primary: '#7AA2F7',
		primaryDark: '#4D7BE8',
		onPrimary: '#1A1B26',
		bg: '#1A1B26',
		bgSecondary: '#24283B',
		border: '#414868',
		text: '#C0CAF5',
		textMuted: '#565F89',
		highlight: '#E0AF68',
		success: '#9ECE6A',
		danger: '#F7768E',
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
},
];
