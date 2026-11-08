// @vitest-environment happy-dom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
import { expect, it, vi } from "vitest";
import { sites } from "./sites";

type Listener = (changes: Record<string, chrome.storage.StorageChange>) => void;
const listeners: Listener[] = [];
vi.stubGlobal("chrome", {
	storage: {
		local: {
			get: async () => ({}),
			onChanged: {
				addListener: (listener: Listener) => listeners.push(listener),
			},
		},
	},
});
const settle = () => new Promise((resolve) => setTimeout(resolve));

it("replaces a greeting split over several text nodes once, and puts every piece back", async () => {
	const headline = document.createElement("span");
	headline.dataset.headline = "workOn";
	for (const piece of ["What should ", "we work ", "on?"])
		headline.append(document.createTextNode(piece));
	document.body.append(headline);

	await import("./content");
	await settle();
	expect(headline.textContent).toBe(
		sites["chatgpt.com"].rewrite?.text("", new Date()),
	);

	for (const listener of listeners) listener({ enabled: { newValue: false } });
	await settle();
	expect(headline.textContent).toBe("What should we work on?");
});
