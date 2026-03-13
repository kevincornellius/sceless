import { storage } from "#imports";
import { signal } from "@preact/signals";
import { clearSiteInfoCache } from "./indexeddb/siteinfo";

export const wsToken = signal<string | null>(null);

export const tokenStorage = storage.defineItem<string | null>("local:wstoken", {
    defaultValue: null,
});

export const initAuthStore = async () => {
    const savedToken = await tokenStorage.getValue();
    wsToken.value = savedToken;
};

export const saveToken = async (newToken: string) => {
    wsToken.value = newToken; 
    await tokenStorage.setValue(newToken); 
};

export const logout = async () => {
    await tokenStorage.setValue(null);  
    wsToken.value = null;
    await clearSiteInfoCache();
};