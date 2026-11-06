/**
 * HTML for the store frames. One look across every asset: the icon's ink,
 * pink and violet, the log's brown, and Bricolage Grotesque for all text.
 */

const FONT =
	"https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&display=swap";

const base = (width, height, body, extraCss = "") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONT}" rel="stylesheet">
<style>
	:root {
		--ink: #17131a;
		--panel: #221b26;
		--chrome: #2d2533;
		--text: #f6f0f8;
		--muted: #b9adc0;
		--pink: #ff55ff;
		--violet: #9b6bff;
		--brown: #b9824f;
	}
	* { box-sizing: border-box; margin: 0; }
	html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
	body {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		background: var(--ink);
		color: var(--text);
		-webkit-font-smoothing: antialiased;
	}
	.icon { image-rendering: pixelated; display: block; }
	.pink { color: var(--pink); }
	${extraCss}
</style></head><body>${body}</body></html>`;

const header = (headline, subline) => `
	<header>
		<img class="icon" src="/icon.png" width="64" height="64" alt="">
		<div>
			<h1>${headline}</h1>
			${subline ? `<p>${subline}</p>` : ""}
		</div>
	</header>`;

const SCREENSHOT_CSS = `
	header { position: absolute; left: 56px; top: 44px; right: 56px; display: flex; gap: 22px; align-items: center; }
	h1 { font-size: 50px; line-height: 1; font-weight: 800; letter-spacing: -0.025em; }
	header p { margin-top: 10px; font-size: 22px; font-weight: 500; color: var(--muted); }
	.panes { position: absolute; left: 56px; right: 56px; top: 196px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
	.pane { border-radius: 16px; overflow: hidden; background: var(--panel); box-shadow: 0 24px 60px rgb(0 0 0 / 0.45); }
	.chrome { height: 40px; display: flex; align-items: center; gap: 7px; padding: 0 14px; background: var(--chrome); }
	.dot { width: 11px; height: 11px; border-radius: 50%; background: #4a3f52; }
	.url { margin-left: 10px; font-size: 13px; color: var(--muted); }
	.tag { margin-left: auto; padding: 4px 11px; border-radius: 999px; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
	.tag.before { background: #4a3f52; color: var(--text); }
	.tag.after { background: var(--pink); color: var(--ink); }
	.toolbar { display: flex; align-items: center; gap: 6px; margin-left: 10px; position: relative; }
	.toolbar .badge { position: absolute; right: -10px; bottom: -6px; padding: 0 4px; border-radius: 4px; background: #5f6368; color: #fff; font: 700 10px/14px system-ui, sans-serif; }
	.shot { display: block; width: 560px; height: 520px; object-fit: cover; object-position: top left; }
`;

/**
 * A 1280×800 store screenshot: a header over two browser panes.
 * Each pane is `{ image, url, tag: "before" | "after", label, icon?: "on" | "off" }`.
 */
export function screenshot({ headline, subline, panes }) {
	const pane = ({ image, url, tag, label, icon }) => `
		<div class="pane">
			<div class="chrome">
				<span class="dot"></span><span class="dot"></span><span class="dot"></span>
				<span class="url">${url}</span>
				<span class="tag ${tag}">${label}</span>
				${icon ? `<span class="toolbar"><img class="icon" src="/icon.png" width="22" height="22" alt="">${icon === "off" ? '<span class="badge">off</span>' : ""}</span>` : ""}
			</div>
			<img class="shot" src="${image}" alt="">
		</div>`;
	return base(
		1280,
		800,
		`${header(headline, subline)}<div class="panes">${panes.map(pane).join("")}</div>`,
		SCREENSHOT_CSS,
	);
}

/** A 1280×800 grid of real swaps, `pairs` as `[before, after]`. */
export function swaps({ headline, subline, pairs }) {
	const css = `${SCREENSHOT_CSS}
		.grid { position: absolute; left: 56px; right: 56px; top: 196px; bottom: 56px; display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 1fr; gap: 16px; }
		.pair { display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 0 24px; border-radius: 14px; background: var(--panel); }
		.from { font-size: 19px; font-weight: 500; color: var(--muted); text-decoration: line-through; text-decoration-color: rgb(185 173 192 / 0.5); }
		.to { font-size: 27px; font-weight: 800; letter-spacing: -0.015em; color: var(--pink); }`;
	const cells = pairs
		.map(
			([from, to]) =>
				`<div class="pair"><span class="from">${from}</span><span class="to">${to}</span></div>`,
		)
		.join("");
	return base(
		1280,
		800,
		`${header(headline, subline)}<div class="grid">${cells}</div>`,
		css,
	);
}

/** The small promo tile (440×280) or marquee (1400×560); `headline` lines break only at `<br>`. */
export function tile({
	width,
	height,
	headline,
	headlineSize,
	subline,
	iconSize,
}) {
	const css = `
		body { display: flex; align-items: center; gap: ${Math.round(iconSize * 0.4)}px; padding: 0 ${Math.round(height * 0.16)}px; }
		h1 { font-size: ${headlineSize}px; line-height: 1.02; font-weight: 800; letter-spacing: -0.03em; white-space: nowrap; }
		p { margin-top: ${Math.round(height * 0.04)}px; font-size: ${Math.round(height * 0.05)}px; font-weight: 500; color: var(--muted); }`;
	return base(
		width,
		height,
		`<img class="icon" src="/icon.png" width="${iconSize}" height="${iconSize}" alt=""><div><h1>${headline}</h1>${subline ? `<p>${subline}</p>` : ""}</div>`,
		css,
	);
}
