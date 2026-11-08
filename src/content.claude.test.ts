// @vitest-environment happy-dom
// @vitest-environment-options {"url":"https://claude.ai/new"}
import { expect, it, vi } from "vitest";

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

it("redoes the greeting when the page changes any piece of it", async () => {
	document.body.innerHTML =
		"<h1 data-new-page-greeting-text><span>Good evening, </span><span>Mia</span></h1>";
	const greeting = document.querySelector("h1") as HTMLElement;
	const name = greeting.lastElementChild?.firstChild as Text;

	await import("./content");
	await settle();
	expect(greeting.textContent).toMatch(/, Mia$/);

	name.data = "Ada";
	await settle();
	expect(greeting.textContent).toMatch(/, Ada$/);

	for (const listener of listeners) listener({ enabled: { newValue: false } });
	await settle();
	expect(greeting.textContent).toBe("Good evening, Ada");
});
