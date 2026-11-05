import { ENABLED, isEnabled } from "./enabled";
import { replaceText } from "./replace";

/** Text inside these stays untouched: code samples and anything the reader is typing. */
const UNTOUCHED = "script, style, noscript, textarea, code, pre, kbd, samp";

/** What each rewritten node said before, so turning off can put it back. */
const originals = new WeakMap<Text, { original: string; replaced: string }>();

function forEachText(root: Node, visit: (node: Text) => void) {
	if (root instanceof Text) return visit(root);
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode())
		visit(node as Text);
}

function rewrite(node: Text) {
	const parent = node.parentElement;
	if (!parent || parent.isContentEditable || parent.closest(UNTOUCHED)) return;
	const replaced = replaceText(node.data);
	if (replaced === node.data) return;
	originals.set(node, { original: node.data, replaced });
	node.data = replaced;
}

/** Puts back original text, unless the page has changed the node since. */
function restore(node: Text) {
	const entry = originals.get(node);
	if (entry && node.data === entry.replaced) node.data = entry.original;
	originals.delete(node);
}

// Our own edits re-trigger the observer, which is harmless because
// replaceText is idempotent.
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		if (mutation.type === "characterData")
			forEachText(mutation.target, rewrite);
		else for (const node of mutation.addedNodes) forEachText(node, rewrite);
	}
});

/** The root covers <title> too. */
function apply(enabled: boolean) {
	const root = document.documentElement;
	if (!enabled) {
		observer.disconnect();
		return forEachText(root, restore);
	}
	forEachText(root, rewrite);
	observer.observe(root, {
		childList: true,
		characterData: true,
		subtree: true,
	});
}

isEnabled().then(apply);
chrome.storage.local.onChanged.addListener((changes) => {
	if (ENABLED in changes) apply(changes[ENABLED].newValue !== false);
});
