import { dictionary } from "./dictionary";

/** The chatbot interface itself: on these sites "chat" and "thinking" are the product. */
const chatbot = {
	chat: "dump",
	chats: "dumps",
	thinking: "straining",
	"thought for": "strained for",
	"thought process": "straining process",
	research: "wiping",
	search: "sniff",
	project: "movement",
	projects: "movements",
	artifact: "deposit",
	artifacts: "deposits",
	plugin: "plunger",
	plugins: "plungers",
	image: "smear",
	images: "smears",
	pinned: "clogged",
	scheduled: "regular",
	recents: "fresh drops",
	upgrade: "unclog",
	"make mistakes": "make a mess",
};

/** Toilet greetings by part of the day, like the ones Claude writes itself. */
const GREETINGS = {
	morning: [
		"Morning movement",
		"Rise and squat",
		"First flush of the day",
		"Coffee's kicking in",
	],
	afternoon: [
		"Afternoon plop",
		"Post-lunch dump",
		"Squat break",
		"Midday movement",
	],
	evening: [
		"Evening squat",
		"Dinner's on its way out",
		"Evening log drop",
		"Golden hour, brown hour",
	],
	night: ["Midnight dump", "Moonlit dump", "Late-night flush", "Night bowl"],
};
const ALL_GREETINGS = Object.values(GREETINGS).flat();

const partOfDay = (hour: number): keyof typeof GREETINGS =>
	hour < 5
		? "night"
		: hour < 12
			? "morning"
			: hour < 17
				? "afternoon"
				: hour < 22
					? "evening"
					: "night";

/**
 * Claude writes a new greeting every time ("Good evening, Mia", "Moonlit chat?"),
 * so word swaps can't keep up: this replaces the whole line with a toilet greeting
 * for the part of the day, keeping the name. It stays the same for that part of
 * the day, and leaves its own greetings alone.
 */
export function toiletGreeting(original: string, now: Date): string {
	if (ALL_GREETINGS.some((line) => original.startsWith(line))) return original;
	const lines = GREETINGS[partOfDay(now.getHours())];
	const day = Math.floor(
		new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() /
			86_400_000,
	);
	const name = original.match(/,\s*([^,]+?)[?!.]?$/)?.[1];
	const line = lines[day % lines.length];
	return name ? `${line}, ${name}` : line;
}

/**
 * ChatGPT picks a greeting per page load ("What should we work on?", "Where should
 * we begin?"), so this picks a toilet one per load too.
 */
const CHATGPT_GREETINGS = [
	"What should we push out?",
	"Where should we drop it?",
	"Seated when you are.",
	"What’s in your bowels today?",
	"What’s coming out today?",
];
const chatGptGreeting =
	CHATGPT_GREETINGS[Math.floor(Math.random() * CHATGPT_GREETINGS.length)];

export type Site = {
	/** Swaps on top of the dictionary, with the same rules. */
	words: Record<string, string>;
	/** Text inside `selector` is replaced whole by `text` in stead of word by word. */
	rewrite?: { selector: string; text: (original: string, now: Date) => string };
};

/**
 * Extra swaps on a chatbot's own site, by hostname. There a bare "Opus" or "Sol"
 * is always the model, so it can go; on the rest of the web only "Claude Opus" does.
 */
export const sites: Record<string, Site> = {
	"claude.ai": {
		words: {
			...chatbot,
			Haiku: "Dookie",
			Sonnet: "Plop",
			Opus: "Magnum",
			Fable: "Floater",
			Mythos: "Skidmark",
			Cowork: "Copoop",
			"How can I help you today?": "What are we dropping today?",
		},
		rewrite: {
			selector: "[data-new-page-greeting-text]",
			text: toiletGreeting,
		},
	},
	"chatgpt.com": {
		words: {
			...chatbot,
			Astra: "Asstra",
			Sol: "Soil",
			Terra: "Turdra",
			Luna: "Loona",
		},
		// The greeting and its hidden copy that sizes the heading.
		rewrite: { selector: "[data-headline]", text: () => chatGptGreeting },
	},
};

/** The dictionary plus the extra swaps for `hostname`, if that site has any. */
export const dictionaryFor = (hostname?: string): Record<string, string> => ({
	...dictionary,
	...(hostname ? sites[hostname]?.words : undefined),
});
