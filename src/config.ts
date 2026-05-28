/** Sites the content script runs on */

export const SCELE_URL = "https://scele.cs.ui.ac.id";
export var SCELE_MATCHES = ["*://scele.cs.ui.ac.id/*"];
export var SCELE_EXCLUDES = [
	"*://scele.cs.ui.ac.id/login*",
	"*://scele.cs.ui.ac.id/*pluginfile.php*",
	"*://scele.cs.ui.ac.id/*mod*",
	"*://scele.cs.ui.ac.id/course/index.php?*",
	"*://scele.cs.ui.ac.id/enrol/**",
	// Show these user pages natively (styled via scele-mod)
	"*://scele.cs.ui.ac.id/user/profile.php*",
	"*://scele.cs.ui.ac.id/user/edit.php*",
];
