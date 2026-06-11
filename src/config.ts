// Controls Sceless Wrapped feature visibility and stat behaviour:
//   "false"   — hidden from navbar, wrapped tab blocked entirely
//   "testing" — shown in navbar, always uses live stats (no snapshot)
//   "true"    — shown in navbar, freezes stats into a snapshot on first open
export const WRAPPED_ENABLED: "false" | "testing" | "true" = "false";

/** Sites the content script runs on */

export const SCELE_URL = "https://scele.cs.ui.ac.id";
export var SCELE_MATCHES = ["*://scele.cs.ui.ac.id/*"];
export var SCELE_EXCLUDES = [
	"*://scele.cs.ui.ac.id/login*",
	"*://scele.cs.ui.ac.id/*pluginfile.php*",
	"*://scele.cs.ui.ac.id/*mod*",
	"*://scele.cs.ui.ac.id/course/index.php?*",
	"*://scele.cs.ui.ac.id/enrol/**",
	"*://scele.cs.ui.ac.id/grade/**",
	// Show these user pages natively (styled via scele-mod)
	"*://scele.cs.ui.ac.id/user/profile.php*",
	"*://scele.cs.ui.ac.id/user/edit.php*",
];
