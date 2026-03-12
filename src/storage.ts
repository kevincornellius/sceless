import { storage } from "#imports";

export const enabledStorage = storage.defineItem<boolean>("local:enabled", {
	defaultValue: true,
});
