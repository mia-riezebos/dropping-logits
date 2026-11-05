/** Whether replacement is on, in every tab. The toolbar icon flips it; it starts on. */
export const ENABLED = "enabled";

export const isEnabled = async () =>
	(await chrome.storage.local.get(ENABLED))[ENABLED] !== false;
