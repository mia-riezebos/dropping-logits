/**
 * Renders the Chrome Web Store screenshots and promo tiles into store/out/.
 *
 *   pnpm build && node store/render.mjs
 *
 * Every "after" is the real extension rewriting the page, and every "before"
 * is the same page after the extension's own toggle switches it off.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { launch } from "./cdp.mjs";
import { screenshot, swaps, tile } from "./frame.mjs";

const STORE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(STORE, "..");
const OUT = join(STORE, "out");
const PORT = 8771;
const ORIGIN = `http://127.0.0.1:${PORT}`;
/** Pages render at 111% so their text fills the 560×520 pane; images are 2× for sharpness. */
const PANE = { width: 504, height: 468, scale: 20 / 9 };

mkdirSync(OUT, { recursive: true });

/** The extension's real dictionary and replaceText, bundled for Node, for the swaps grid. */
async function loadExtension() {
	const outfile = join(OUT, ".extension.mjs");
	buildSync({
		stdin: {
			contents:
				'export { dictionary } from "./src/dictionary"; export { replaceText } from "./src/replace";',
			resolveDir: ROOT,
			loader: "ts",
		},
		bundle: true,
		format: "esm",
		outfile,
		logLevel: "error",
	});
	return import(`${outfile}?${Date.now()}`);
}

const TYPES = { ".html": "text/html", ".png": "image/png" };
const server = createServer((request, response) => {
	const path = new URL(request.url, ORIGIN).pathname;
	const file =
		path === "/icon.png"
			? join(ROOT, "dist/icons/icon-128.png")
			: join(STORE, path);
	let body;
	try {
		body = readFileSync(file);
	} catch {
		response.writeHead(404).end();
		return;
	}
	response.writeHead(200, {
		"content-type": TYPES[extname(file)] ?? "application/octet-stream",
	});
	response.end(body);
}).listen(PORT);

const browser = await launch(join(ROOT, "dist"));

/** Captures `scene` with the extension on, then off; returns both image paths. */
async function capturePair(scene) {
	await browser.setEnabled(true);
	await browser.open(`${ORIGIN}/scenes/${scene}.html`, PANE);
	await browser.capture(join(OUT, `${scene}-after.png`));
	await browser.setEnabled(false);
	await browser.capture(join(OUT, `${scene}-before.png`));
	return {
		before: `/out/${scene}-before.png`,
		after: `/out/${scene}-after.png`,
	};
}

/** Writes `html` next to the captures and screenshots it at its exact size. */
async function renderFrame(name, html, size) {
	writeFileSync(join(OUT, `_${name}.html`), html);
	await browser.open(`${ORIGIN}/out/_${name}.html`, size);
	await browser.capture(join(OUT, `${name}.png`));
	console.log(`out/${name}.png`);
}

const demo = await capturePair("demo");
const guarded = await capturePair("protected");

// Frames render with the extension off, or it would rewrite the captions.
await browser.setEnabled(false);
const SCREEN = { width: 1280, height: 800 };

await renderFrame(
	"s3-casing",
	screenshot({
		headline: "Even the shouting carries over",
		subline: "Title Case stays Title Case. ALL CAPS stays ALL CAPS.",
		panes: [
			{
				image: demo.before,
				url: "wobbleplop.ai",
				tag: "before",
				label: "Before",
			},
			{ image: demo.after, url: "wobbleplop.ai", tag: "after", label: "After" },
		],
	}),
	SCREEN,
);

const { dictionary, replaceText } = await loadExtension();
const SWAPS = [
	"hallucinations",
	"benchmark",
	"transformer",
	"AGI",
	"paradigm shift",
	"latency",
	"data center",
	"open source",
	"mixture of experts",
	"LLM",
	"large language model",
	"insights",
];
await renderFrame(
	"s4-swaps",
	swaps({
		headline: `A dictionary of toilet humour`,
		subline: `Twelve of the ${Object.keys(dictionary).length} terms.`,
		pairs: SWAPS.map((term) => [term, replaceText(term)]),
	}),
	SCREEN,
);

await renderFrame(
	"s5-untouched",
	screenshot({
		headline: "Code and typing stay untouched",
		subline: "No data collected. Only the storage permission.",
		panes: [
			{
				image: guarded.before,
				url: "docs.wobbleplop.ai",
				tag: "before",
				label: "Before",
			},
			{
				image: guarded.after,
				url: "docs.wobbleplop.ai",
				tag: "after",
				label: "After",
			},
		],
	}),
	SCREEN,
);

await renderFrame(
	"tile-small",
	tile({
		width: 440,
		height: 280,
		headline: "AI marketing.<br>Toilet humour.",
		headlineSize: 30,
		iconSize: 104,
	}),
	{ width: 440, height: 280 },
);
await renderFrame(
	"tile-marquee",
	tile({
		width: 1400,
		height: 560,
		headline: "AI marketing goes<br>down the toilet",
		headlineSize: 64,
		subline: "“Launching models” becomes “dropping logs”.",
		iconSize: 256,
	}),
	{ width: 1400, height: 560 },
);

browser.close();
server.close();
