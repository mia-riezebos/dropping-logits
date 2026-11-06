/**
 * Just enough Chrome DevTools Protocol to drive headless Chromium with the
 * built extension loaded: open a page, flip the extension's real toggle, and
 * capture screenshots.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Branded Chrome ignores --load-extension, so this needs Chromium; set CHROMIUM to its path off macOS. */
const CHROMIUM =
	process.env.CHROMIUM ?? "/Applications/Chromium.app/Contents/MacOS/Chromium";
const PORT = 9883;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Connects to one CDP target and returns a `send(method, params)` function. */
async function connect(url) {
	const socket = new WebSocket(url);
	const pending = new Map();
	let id = 0;
	socket.onmessage = ({ data }) => {
		const message = JSON.parse(data);
		const settle = pending.get(message.id);
		if (!settle) return;
		pending.delete(message.id);
		message.error
			? settle.reject(new Error(message.error.message))
			: settle.resolve(message.result);
	};
	await new Promise((resolve, reject) => {
		socket.onopen = resolve;
		socket.onerror = reject;
	});
	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			pending.set(++id, { resolve, reject });
			socket.send(JSON.stringify({ id, method, params }));
		});
	return { send, close: () => socket.close() };
}

async function targets() {
	return (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
}

/** Launches Chromium with the extension at `extensionDir` and returns a page driver. */
export async function launch(extensionDir) {
	const profile = mkdtempSync(join(tmpdir(), "dl-store-"));
	const browser = spawn(
		CHROMIUM,
		[
			"--headless=new",
			`--user-data-dir=${profile}`,
			`--remote-debugging-port=${PORT}`,
			`--load-extension=${extensionDir}`,
			"--no-first-run",
			"--hide-scrollbars",
			"--force-color-profile=srgb",
			"about:blank",
		],
		{ stdio: "ignore" },
	);
	// A crash mid-render must not leave Chromium holding the debugging port.
	process.once("exit", () => browser.kill());
	let pageTarget;
	let workerTarget;
	for (
		let attempt = 0;
		attempt < 50 && !(pageTarget && workerTarget);
		attempt++
	) {
		await sleep(200);
		const list = await targets().catch(() => []);
		pageTarget = list.find((t) => t.type === "page");
		workerTarget = list.find((t) => t.type === "service_worker");
	}
	if (!pageTarget || !workerTarget)
		throw new Error(
			"Chromium started without the page or the extension worker",
		);

	const page = await connect(pageTarget.webSocketDebuggerUrl);
	const worker = await connect(workerTarget.webSocketDebuggerUrl);
	await page.send("Page.enable");
	await page.send("Runtime.enable");

	const evaluate = async (session, expression) =>
		(
			await session.send("Runtime.evaluate", {
				expression,
				awaitPromise: true,
				returnByValue: true,
			})
		).result.value;

	return {
		/** Opens `url` in a `width`×`height` viewport and waits for fonts and late script. */
		async open(url, { width, height, scale = 1 }) {
			await page.send("Emulation.setDeviceMetricsOverride", {
				width,
				height,
				deviceScaleFactor: scale,
				mobile: false,
			});
			await page.send("Page.navigate", { url });
			await sleep(300);
			await evaluate(page, "document.fonts.ready.then(() => true)");
			await sleep(400);
		},
		/** Flips the extension the same way its toolbar icon does: through the stored setting. */
		async setEnabled(enabled) {
			await evaluate(
				worker,
				`chrome.storage.local.set({ enabled: ${enabled} })`,
			);
			await sleep(250);
		},
		async capture(path) {
			const { data } = await page.send("Page.captureScreenshot", {
				format: "png",
				captureBeyondViewport: false,
			});
			const { writeFileSync } = await import("node:fs");
			writeFileSync(path, Buffer.from(data, "base64"));
		},
		evaluate: (expression) => evaluate(page, expression),
		close() {
			page.close();
			worker.close();
			browser.kill();
		},
	};
}
