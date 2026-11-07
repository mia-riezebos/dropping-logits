import { describe, expect, it } from "vitest";
import { dictionary } from "./dictionary";
import { replaceText } from "./replace";

describe("replaceText", () => {
	it.each([
		[
			"the founding joke",
			"We are launching models today",
			"We are dropping logs today",
		],
		["Title Case carries over", "Launching Models", "Dropping Logs"],
		[
			"Title Case keeps its small words lowercase",
			"The Future of Machine Learning",
			"The Bowels of Machine Leaking",
		],
		[
			"one word in a Title Case line gets a Title Case replacement",
			"Join the Waitlist",
			"Join the Toilet Queue",
		],
		[
			"one word in a sentence keeps sentence case",
			"Insights are great",
			"Stool samples are great",
		],
		["ALL CAPS carries over", "LAUNCHING MODELS", "DROPPING LOGS"],
		["a hyphen matches a spaced key", "cutting-edge AI", "cheese-cutting IBS"],
		[
			"longest phrase wins",
			"large language models",
			"large lavatory movements",
		],
		["acronyms ignore lowercase words", "andiamo ai monti", "andiamo ai monti"],
		["a cased phrase falls back to its parts", "AI Agent", "IBS Agent"],
		[
			"only whole words match",
			"remodel the prelaunch",
			"remodel the prelaunch",
		],
		[
			"punctuation is a boundary",
			"State-of-the-art models.",
			"State-of-the-fart logs.",
		],
	])("%s", (_, input, expected) => {
		expect(replaceText(input)).toBe(expected);
	});

	it("leaves its own output alone", () => {
		for (const key of Object.keys(dictionary)) {
			const once = replaceText(key);
			expect(replaceText(once), key).toBe(once);
		}
	});

	it("can reach every key", () => {
		const canonical = Object.keys(dictionary).map((key) =>
			key.toLowerCase().replace(/-/g, " "),
		);
		expect(new Set(canonical).size).toBe(canonical.length);
	});
});
