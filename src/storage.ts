import { storage } from "#imports";

export const enabledStorage = storage.defineItem<boolean>("local:enabled", {
	defaultValue: true,
});

export const quizReviewHijackStorage = storage.defineItem<boolean>(
	"local:quizReviewHijackEnabled",
	{
		defaultValue: true,
	},
);
