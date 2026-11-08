import { expect, it } from "vitest";
import { toiletGreeting } from "./sites";

const at = (hour: number) => new Date(2026, 10, 8, hour);

it("swaps Claude's greeting for a toilet one, keeping the name when there is one", () => {
	const evening = toiletGreeting("Good evening, Mia", at(19));
	expect(evening).not.toBe("Good evening, Mia");
	expect(evening).toMatch(/, Mia$/);

	const night = toiletGreeting("Moonlit chat?", at(23));
	expect(night).not.toBe("Moonlit chat?");
	expect(night).not.toContain(",");
});

it("keeps one greeting per part of the day, and leaves its own greeting alone", () => {
	const greeting = toiletGreeting("Afternoon, Mia", at(14));
	expect(toiletGreeting("Back at it, Mia", at(15))).toBe(greeting);
	expect(toiletGreeting(greeting, at(16))).toBe(greeting);
});
