/**
 * Talks to the Chrome Web Store API (v2) as the service account in
 * CHROME_SERVICE_ACCOUNT_KEY, for the item CHROME_ITEM_ID of publisher
 * CHROME_PUBLISHER_ID.
 *
 *   node scripts/chrome-web-store.ts status
 *   node scripts/chrome-web-store.ts submit artifacts/dropping-logits-1.2.3.zip
 *
 * `submit` uploads the zip, waits for the store to process it, then submits
 * it for review; it goes live once approved.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const API = "https://chromewebstore.googleapis.com";
const SCOPE = "https://www.googleapis.com/auth/chromewebstore";
const UPLOAD_POLL_MS = 5000;
const UPLOAD_POLL_LIMIT = 36;

interface ServiceAccountKey {
	client_email: string;
	private_key: string;
	token_uri: string;
}

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

const key: ServiceAccountKey = JSON.parse(
	required("CHROME_SERVICE_ACCOUNT_KEY"),
);
const item = `publishers/${required("CHROME_PUBLISHER_ID")}/items/${required("CHROME_ITEM_ID")}`;

const base64url = (text: string) => Buffer.from(text).toString("base64url");

/** Trades a self-signed JWT for an access token (Google's service-account flow, no SDK). */
async function accessToken(): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const claims = {
		iss: key.client_email,
		scope: SCOPE,
		aud: key.token_uri,
		iat: now,
		exp: now + 3600,
	};
	const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
	const signature = createSign("RSA-SHA256")
		.update(unsigned)
		.sign(key.private_key, "base64url");
	const { access_token } = await request<{ access_token: string }>(
		key.token_uri,
		{
			method: "POST",
			body: new URLSearchParams({
				grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
				assertion: `${unsigned}.${signature}`,
			}),
		},
	);
	return access_token;
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
	const response = await fetch(url, init);
	const text = await response.text();
	if (!response.ok)
		throw new Error(
			`${init.method} ${url} failed with ${response.status}: ${text}`,
		);
	return JSON.parse(text) as T;
}

interface Status {
	lastAsyncUploadState?: string;
	submittedItemRevisionStatus?: { state: string };
	publishedItemRevisionStatus?: {
		state: string;
		distributionChannels?: { crxVersion: string }[];
	};
}

const token = await accessToken();
const authorized = (init: RequestInit = {}): RequestInit => ({
	...init,
	headers: { authorization: `Bearer ${token}`, ...init.headers },
});
const fetchStatus = () =>
	request<Status>(
		`${API}/v2/${item}:fetchStatus`,
		authorized({ method: "GET" }),
	);

// The reference names the in-progress state both ways, so accept either.
const isUploading = (state: string | undefined) =>
	state === "IN_PROGRESS" || state === "UPLOAD_IN_PROGRESS";

async function submit(zip: string) {
	const upload = await request<{ uploadState: string; crxVersion?: string }>(
		`${API}/upload/v2/${item}:upload`,
		authorized({
			method: "POST",
			headers: { "content-type": "application/zip" },
			body: readFileSync(zip),
		}),
	);
	let state = upload.uploadState;
	for (let poll = 0; isUploading(state) && poll < UPLOAD_POLL_LIMIT; poll++) {
		await new Promise((resolve) => setTimeout(resolve, UPLOAD_POLL_MS));
		state = (await fetchStatus()).lastAsyncUploadState ?? state;
	}
	if (state !== "SUCCEEDED")
		throw new Error(`Upload of ${zip} ended in state ${state}`);
	console.log(
		`Uploaded ${zip}${upload.crxVersion ? ` (version ${upload.crxVersion})` : ""}`,
	);

	const published = await request<{
		state: string;
		warningInfo?: { warnings: { description: string }[] };
	}>(
		`${API}/v2/${item}:publish`,
		authorized({
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
		}),
	);
	console.log(`Submitted for review: ${published.state}`);
	for (const warning of published.warningInfo?.warnings ?? [])
		console.log(`::warning::${warning.description}`);
}

const [command, zip] = process.argv.slice(2);
if (command === "status")
	console.log(JSON.stringify(await fetchStatus(), null, 2));
else if (command === "submit" && zip) await submit(zip);
else throw new Error("Usage: chrome-web-store.ts status | submit <zip>");
