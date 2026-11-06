/**
 * Captures X profiles before and after Dropping Logits, for the store
 * screenshots. X refuses headless browsers, so this drives a Chromium that is
 * already running with the extension loaded and an X account signed in:
 *
 *   node store/x.mjs <debugging port> <handle>...
 *   node store/x.mjs 9262 OpenAI AnthropicAI
 *
 * Writes store/out/x-<handle>-before.png and -after.png at pane size, with the
 * signed-in account's follow state, mutual followers and X's nav hidden.
 */
import { createHash } from "node:crypto";
import { realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STORE = dirname(fileURLToPath(import.meta.url));
const OUT = join(STORE, "out");
/** The build the browser must have loaded with --load-extension. */
const DIST = join(STORE, "..", "dist");
const PANE = {
	width: 504,
	height: 468,
	deviceScaleFactor: 20 / 9,
	mobile: false,
};
const SETTLE_MS = 6000;

/** What belongs to the signed-in account, plus X's nav so the profile gets the full width. */
const HIDE = [
	'header[role="banner"]',
	'[data-testid$="-unfollow"]',
	'[data-testid$="-follow"]',
	'a[href$="/followers_you_follow"]',
	'[data-testid="DMDrawer"]',
	'[data-testid="sendDMFromProfile"]',
	'[data-testid="userActions"]',
	'[aria-label="Get notified"]',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect(url) {
	const socket = new WebSocket(url);
	const pending = new Map();
	let id = 0;
	socket.onmessage = ({ data }) => {
		const message = JSON.parse(data);
		pending.get(message.id)?.(message);
	};
	await new Promise((resolve) => {
		socket.onopen = resolve;
	});
	return (method, params = {}) =>
		new Promise((resolve, reject) => {
			pending.set(++id, (message) =>
				message.error
					? reject(new Error(message.error.message))
					: resolve(message.result),
			);
			socket.send(JSON.stringify({ id, method, params }));
		});
}

const [port, ...handles] = process.argv.slice(2);
if (!port || handles.length === 0)
	throw new Error("Usage: node store/x.mjs <debugging port> <handle>...");
const base = `http://127.0.0.1:${port}`;
const targets = async () => (await fetch(`${base}/json/list`)).json();

const evaluate = async (send, expression) =>
	(
		await send("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
		})
	).result.value;

const browser = await connect(
	(await (await fetch(`${base}/json/version`)).json()).webSocketDebuggerUrl,
);
const background = async (url) => {
	const { targetId } = await browser("Target.createTarget", {
		url,
		background: true,
	});
	await sleep(800);
	return (await targets()).find((target) => target.id === targetId);
};

/** Chromium's ID for an unpacked extension: the folder path's SHA-256, first 32 hex digits mapped onto a–p. */
const unpackedId = (path) =>
	[
		...createHash("sha256")
			.update(realpathSync(path))
			.digest("hex")
			.slice(0, 32),
	]
		.map((digit) => String.fromCharCode(97 + Number.parseInt(digit, 16)))
		.join("");

// The worker sleeps when idle, but any page on the extension's origin can reach its storage.
const storage = await connect(
	(await background(`chrome-extension://${unpackedId(DIST)}/manifest.json`))
		.webSocketDebuggerUrl,
);
if ((await evaluate(storage, "typeof chrome.storage")) !== "object") {
	throw new Error(`The build in ${DIST} is not loaded in that browser`);
}
const page = await connect(
	(await background("about:blank")).webSocketDebuggerUrl,
);

const setEnabled = async (enabled) => {
	await evaluate(storage, `chrome.storage.local.set({ enabled: ${enabled} })`);
	await sleep(500);
};
const capture = async (path) => {
	const { data } = await page("Page.captureScreenshot", { format: "png" });
	writeFileSync(path, Buffer.from(data, "base64"));
};

await page("Emulation.setFocusEmulationEnabled", { enabled: true });
await page("Emulation.setDeviceMetricsOverride", PANE);
for (const handle of handles) {
	await setEnabled(true);
	await page("Page.navigate", { url: `https://x.com/${handle}` });
	await sleep(SETTLE_MS);
	await evaluate(
		page,
		`document.head.append(Object.assign(document.createElement("style"), { textContent: ${JSON.stringify(`${HIDE.join(", ")} { display: none !important; } [data-testid="primaryColumn"] { max-width: none !important; border: 0 !important; }`)} }))`,
	);
	await sleep(800);
	await capture(join(OUT, `x-${handle}-after.png`));
	await setEnabled(false);
	await capture(join(OUT, `x-${handle}-before.png`));
	console.log(`out/x-${handle}-before.png, out/x-${handle}-after.png`);
}
await setEnabled(true);
process.exit(0);
