import { dictionary } from "./dictionary";

/** Whitespace (incl. non-breaking) or a hyphen between words. */
const SEPARATOR = /[\s -]+/g;
const KEY_SEPARATOR = /[ -]/g;
const canonical = (phrase: string) => phrase.replace(SEPARATOR, " ");

const isExact = (key: string) => key !== key.toLowerCase();

const escapeRegExp = (literal: string) =>
	literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Exact keys match case-sensitively; the rest sit in a case-insensitive `(?i:…)` group. */
const toPattern = (key: string) => {
	const source = escapeRegExp(key).replace(KEY_SEPARATOR, "[\\s\\u00a0-]+");
	return isExact(key) ? source : `(?i:${source})`;
};

const startsUpper = (word: string) => /^\p{Lu}/u.test(word);

/** Words Title Case leaves lowercase unless they come first: "The Future of AI". */
const SMALL_WORDS = new Set([
	"a",
	"an",
	"and",
	"at",
	"by",
	"for",
	"in",
	"of",
	"on",
	"or",
	"the",
	"to",
	"with",
]);

const isTitleCase = (words: string[]) =>
	words.length > 1 &&
	words.every(
		(word, i) => startsUpper(word) || (i > 0 && SMALL_WORDS.has(word)),
	);

/**
 * Copies the casing of `source` (ALL CAPS, Title Case, Capitalised) onto `target`.
 * In a Title Case line, a capitalised `source` gets a Title Case `target` even when
 * it is one word: "Join the Waitlist" becomes "Join the Toilet Queue".
 */
function matchCase(
	source: string,
	target: string,
	inTitleCaseLine: boolean,
): string {
	if (source === source.toUpperCase()) return target.toUpperCase();
	if (
		isTitleCase(source.split(SEPARATOR)) ||
		(inTitleCaseLine && startsUpper(source))
	) {
		return target.replace(
			/(^|[\s-])(\p{Ll}\p{L}*)/gu,
			(match, sep: string, word: string, offset: number) =>
				offset > 0 && SMALL_WORDS.has(word)
					? match
					: sep + word.charAt(0).toUpperCase() + word.slice(1),
		);
	}
	if (startsUpper(source))
		return target.charAt(0).toUpperCase() + target.slice(1);
	return target;
}

/** Reuses the separators of `source` when `target` has as many words: "state-of-the-art" keeps its hyphens. */
function matchSeparators(source: string, target: string): string {
	const separators = source.match(SEPARATOR) ?? [];
	const words = target.split(KEY_SEPARATOR);
	if (words.length !== separators.length + 1) return target;
	return words.map((word, i) => word + (separators[i] ?? "")).join("");
}

/**
 * Compiles `words` (see the rules in dictionary.ts) once, into a function that
 * replaces every term in a text. Running it on its own output changes nothing.
 * `line` is the whole heading or label the text sits in, when markup splits it
 * into pieces; its casing decides whether replacements get Title Case.
 */
export function createReplacer(
	words: Record<string, string>,
): (text: string, line?: string) => string {
	const entries = new Map(
		Object.entries(words).map(([key, replacement]) => [
			canonical(key).toLowerCase(),
			{ replacement, exact: isExact(key) },
		]),
	);
	const pattern = new RegExp(
		`(?<![\\p{L}\\p{N}])(?:${Object.keys(words)
			.sort((a, b) => b.length - a.length)
			.map(toPattern)
			.join("|")})(?![\\p{L}\\p{N}])`,
		"gu",
	);
	return (text, line = text) => {
		const inTitleCaseLine = isTitleCase(line.trim().split(/\s+/));
		return text.replace(pattern, (match) => {
			const entry = entries.get(canonical(match).toLowerCase());
			if (!entry) return match;
			if (entry.exact) return entry.replacement;
			return matchCase(
				match,
				matchSeparators(match, entry.replacement),
				inTitleCaseLine,
			);
		});
	};
}

/** Replaces every term of the base dictionary in `text`. */
export const replaceText = createReplacer(dictionary);
