import { describe, expect, it } from "vitest";
import { dictionary } from "./dictionary";
import { createReplacer, replaceText } from "./replace";
import { dictionaryFor, sites } from "./sites";

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

	it("leaves its own output alone, on every site", () => {
		for (const site of [undefined, ...Object.keys(sites)]) {
			const words = dictionaryFor(site);
			const replace = createReplacer(words);
			for (const key of Object.keys(words)) {
				const once = replace(key);
				expect(replace(once), `${site}: ${key}`).toBe(once);
			}
		}
	});

	it("swaps a bare model name only on its chatbot's own site", () => {
		const line = "Claude Opus is Anthropic's magnum Opus, GPT-6.1 Sol too";
		expect(replaceText(line)).toBe(
			"Commode Magnum is Anthropoopic's magnum Opus, GPoo-6.1 Sol too",
		);
		expect(createReplacer(dictionaryFor("claude.ai"))("Opus 5.5")).toBe(
			"Magnum 5.5",
		);
		expect(createReplacer(dictionaryFor("chatgpt.com"))("GPT-6.1 Sol")).toBe(
			"GPoo-6.1 Soil",
		);
	});

	it("can reach every key", () => {
		const canonical = Object.keys(dictionary).map((key) =>
			key.toLowerCase().replace(/-/g, " "),
		);
		expect(new Set(canonical).size).toBe(canonical.length);
	});
});
