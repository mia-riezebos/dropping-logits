// @vitest-environment happy-dom
import { expect, it } from "vitest";

it("rewrites page text, new text, and the title, but not code", async () => {
	document.title = "Launching models";
	document.body.innerHTML =
		"<p>Our most powerful model yet</p><code>model.launch()</code>";

	await import("./content");

	const late = document.createElement("p");
	late.textContent = "Fewer hallucinations";
	document.body.append(late);
	await new Promise((resolve) => setTimeout(resolve));

	expect(document.title).toBe("Dropping logs");
	expect(document.body.innerHTML).toBe(
		"<p>Our most pungent log yet</p><code>model.launch()</code><p>Fewer sharts</p>",
	);
});
