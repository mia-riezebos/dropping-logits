// @vitest-environment happy-dom
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

const setEnabled = (enabled: boolean) => {
	for (const listener of listeners)
		listener({ enabled: { newValue: enabled } });
};
const settle = () => new Promise((resolve) => setTimeout(resolve));

it("rewrites page text, new text, and the title, but not code, and toggles back", async () => {
	document.title = "Launching models";
	document.body.innerHTML =
		"<p>Our most powerful model yet</p><code>model.launch()</code>";

	await import("./content");
	await settle();
	const late = document.createElement("p");
	late.textContent = "Fewer hallucinations";
	document.body.append(late);
	await settle();

	expect(document.title).toBe("Dropping logs");
	expect(document.body.innerHTML).toBe(
		"<p>Our most pungent log yet</p><code>model.launch()</code><p>Fewer sharts</p>",
	);

	setEnabled(false);
	await settle();
	expect(document.title).toBe("Launching models");
	expect(document.body.innerHTML).toBe(
		"<p>Our most powerful model yet</p><code>model.launch()</code><p>Fewer hallucinations</p>",
	);

	setEnabled(true);
	await settle();
	expect(document.body.innerHTML).toBe(
		"<p>Our most pungent log yet</p><code>model.launch()</code><p>Fewer sharts</p>",
	);
});

it("keeps Title Case across inline markup inside a heading", async () => {
	document.body.innerHTML = "<h1>Join the <strong>Waitlist</strong></h1>";
	await settle();

	expect(document.body.innerHTML).toBe(
		"<h1>Join the <strong>Toilet Queue</strong></h1>",
	);
});
