import { replaceText } from "./replace";

/** Text inside these stays untouched: code samples and anything the reader is typing. */
const UNTOUCHED = "script, style, noscript, textarea, code, pre, kbd, samp";

function rewrite(node: Text) {
	const parent = node.parentElement;
	if (!parent || parent.isContentEditable || parent.closest(UNTOUCHED)) return;
	const next = replaceText(node.data);
	if (next !== node.data) node.data = next;
}

function rewriteTree(root: Node) {
	if (root instanceof Text) return rewrite(root);
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode())
		rewrite(node as Text);
}

// The root covers <title> too. Our own edits re-trigger the observer, which is
// harmless because replaceText is idempotent.
rewriteTree(document.documentElement);
new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		if (mutation.type === "characterData") rewriteTree(mutation.target);
		else mutation.addedNodes.forEach(rewriteTree);
	}
}).observe(document.documentElement, {
	childList: true,
	characterData: true,
	subtree: true,
});
