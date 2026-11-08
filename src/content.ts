import { ENABLED, isEnabled } from "./enabled";
import { createReplacer } from "./replace";
import { dictionaryFor, type Site, sites } from "./sites";

/** Text inside these stays untouched: code samples and anything the reader is typing. */
const UNTOUCHED = "script, style, noscript, textarea, code, pre, kbd, samp";

/**
 * Short, often Title Case elements whose full text tells a split-up piece how to
 * case its replacement: "<h1>Join the <strong>Waitlist</strong></h1>". A heading
 * wins over a link or button inside it. Paragraphs stay out, so long text is never
 * re-read for every inline node in it.
 */
const HEADINGS = "h1, h2, h3, h4, h5, h6, th, dt, legend, summary";
const LABELS = "a, button, label";

/**
 * Attributes people read: an input's hint and an element's tooltip. Rich-text
 * editors' `data-placeholder` stays out: ChatGPT's editor rebuilds the node on
 * any change to it, so rewriting it would loop.
 */
const ATTRIBUTES = ["placeholder", "title"];
const WITH_ATTRIBUTES = ATTRIBUTES.map((name) => `[${name}]`).join(", ");

const replaceText = createReplacer(dictionaryFor(location.hostname));
const wholeText = sites[location.hostname]?.rewrite;

/** What each rewritten text or attribute said before, so turning off can put it back. */
type Saved = { original: string; replaced: string };
const originals = new WeakMap<Text, Saved>();
const attributeOriginals = new WeakMap<Element, Map<string, Saved>>();

function forEachText(root: Node, visit: (node: Text) => void) {
	if (root instanceof Text) return visit(root);
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode())
		visit(node as Text);
}

function forEachWithAttributes(root: Node, visit: (element: Element) => void) {
	if (!(root instanceof Element)) return;
	if (root.matches(WITH_ATTRIBUTES)) visit(root);
	for (const element of root.querySelectorAll(WITH_ATTRIBUTES)) visit(element);
}

/** The text of `element` as the page wrote it, before any rewrite. */
function originalText(element: Element): string {
	let text = "";
	forEachText(element, (piece) => {
		const entry = originals.get(piece);
		text +=
			entry && piece.data === entry.replaced ? entry.original : piece.data;
	});
	return text;
}

/** The text of the heading or label around `node` as the page wrote it, before any rewrite. */
function originalLine(parent: Element, node: Text): string {
	const line = parent.closest(HEADINGS) ?? parent.closest(LABELS);
	return line ? originalText(line) : node.data;
}

/** Shows `replaced` in `node`, remembering what the page wrote there. */
function swap(node: Text, replaced: string) {
	if (replaced === node.data) return;
	const entry = originals.get(node);
	const original =
		entry && node.data === entry.replaced ? entry.original : node.data;
	originals.set(node, { original, replaced });
	node.data = replaced;
}

/**
 * Replaces an element its site rewrites whole, from all its pieces at once: the
 * first text node gets the new text and the rest are emptied, so a greeting split
 * over several nodes shows once and follows a change to any of them.
 */
function rewriteWhole(element: Element, rule: NonNullable<Site["rewrite"]>) {
	const text = rule.text(originalText(element), new Date());
	let first = true;
	forEachText(element, (piece) => {
		swap(piece, first ? text : "");
		first = false;
	});
}

function rewrite(node: Text) {
	const parent = node.parentElement;
	if (!parent || parent.isContentEditable || parent.closest(UNTOUCHED)) return;
	const whole = wholeText ? parent.closest(wholeText.selector) : null;
	if (wholeText && whole) return rewriteWhole(whole, wholeText);
	swap(node, replaceText(node.data, originalLine(parent, node)));
}

function rewriteAttributes(element: Element) {
	for (const name of ATTRIBUTES) {
		const value = element.getAttribute(name);
		if (!value) continue;
		const replaced = replaceText(value);
		if (replaced === value) continue;
		const saved = attributeOriginals.get(element) ?? new Map<string, Saved>();
		saved.set(name, { original: value, replaced });
		attributeOriginals.set(element, saved);
		element.setAttribute(name, replaced);
	}
}

/** Puts back original text, unless the page has changed the node since. */
function restore(node: Text) {
	const entry = originals.get(node);
	if (entry && node.data === entry.replaced) node.data = entry.original;
	originals.delete(node);
}

function restoreAttributes(element: Element) {
	for (const [name, entry] of attributeOriginals.get(element) ?? [])
		if (element.getAttribute(name) === entry.replaced)
			element.setAttribute(name, entry.original);
	attributeOriginals.delete(element);
}

function rewriteAll(root: Node) {
	forEachText(root, rewrite);
	forEachWithAttributes(root, rewriteAttributes);
}

// Our own edits re-trigger the observer, which is harmless because
// replaceText is idempotent.
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		if (mutation.type === "characterData")
			forEachText(mutation.target, rewrite);
		else if (mutation.type === "attributes")
			rewriteAttributes(mutation.target as Element);
		else for (const node of mutation.addedNodes) rewriteAll(node);
	}
});

/** The root covers <title> too. */
function apply(enabled: boolean) {
	const root = document.documentElement;
	if (!enabled) {
		observer.disconnect();
		forEachText(root, restore);
		return forEachWithAttributes(root, restoreAttributes);
	}
	rewriteAll(root);
	observer.observe(root, {
		childList: true,
		characterData: true,
		subtree: true,
		attributes: true,
		attributeFilter: ATTRIBUTES,
	});
}

isEnabled().then(apply);
chrome.storage.local.onChanged.addListener((changes) => {
	if (ENABLED in changes) apply(changes[ENABLED].newValue !== false);
});
