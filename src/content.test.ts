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

it("rewrites page text, new text, the title and input hints, but not code, and toggles back", async () => {
	document.title = "Launching models";
	document.body.innerHTML =
		"<p>Our most powerful model yet</p><code>model.launch()</code>";

	await import("./content");
	await settle();
	const late = document.createElement("p");
	late.textContent = "Fewer hallucinations";
	const input = document.createElement("textarea");
	input.placeholder = "Ask ChatGPT";
	document.body.append(late, input);
	await settle();

	const rewritten =
		'<p>Our most pungent log yet</p><code>model.launch()</code><p>Fewer sharts</p><textarea placeholder="Ask FartGPoo"></textarea>';
	expect(document.title).toBe("Dropping logs");
	expect(document.body.innerHTML).toBe(rewritten);

	setEnabled(false);
	await settle();
	expect(document.title).toBe("Launching models");
	expect(document.body.innerHTML).toBe(
		'<p>Our most powerful model yet</p><code>model.launch()</code><p>Fewer hallucinations</p><textarea placeholder="Ask ChatGPT"></textarea>',
	);

	setEnabled(true);
	await settle();
	expect(document.body.innerHTML).toBe(rewritten);
});

it.each([
	[
		"<h1>Join the <strong>Waitlist</strong></h1>",
		"<h1>Join the <strong>Toilet Queue</strong></h1>",
	],
	// A link inside the heading must not hide the rest of it.
	[
		"<h1>Join the <a>Waitlist</a></h1>",
		"<h1>Join the <a>Toilet Queue</a></h1>",
	],
	// "GPU" is rewritten first; the heading still counts as Title Case.
	[
		"<h1>GPU <strong>Waitlist</strong></h1>",
		"<h1>porta-potty <strong>Toilet Queue</strong></h1>",
	],
])("keeps Title Case across inline markup: %s", async (html, expected) => {
	document.body.innerHTML = html;
	await settle();

	expect(document.body.innerHTML).toBe(expected);
});
