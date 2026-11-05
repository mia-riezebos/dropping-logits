import { ENABLED, isEnabled } from "./enabled";

const showState = (enabled: boolean) =>
	chrome.action.setBadgeText({ text: enabled ? "" : "off" });

chrome.action.onClicked.addListener(async () => {
	await chrome.storage.local.set({ [ENABLED]: !(await isEnabled()) });
});

chrome.storage.local.onChanged.addListener((changes) => {
	if (ENABLED in changes) showState(changes[ENABLED].newValue !== false);
});

// The badge resets when the browser restarts.
chrome.runtime.onStartup.addListener(async () => showState(await isEnabled()));
