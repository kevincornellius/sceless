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
