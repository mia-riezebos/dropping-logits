/**
 * Writes the non-code parts of dist/: manifest.json, stamped with the
 * package.json version so Changesets bumps both, and the toolbar icon as
 * icons/icon-<size>.png. The icon art is 16×16, one character per pixel,
 * scaled by whole pixels so it stays crisp.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";

const ART = [
	"................",
	"....P.....V.....",
	".....P...V......",
	"....P.....V.....",
	".....P...V......",
	"................",
	"...KKKKKKKKKK...",
	"..KHHHHKHHHHHK..",
	".KHBBBBKBBBBBBK.",
	"KHBKWBBBBBKWBBSK",
	"KBBKKBBBBBKKBBSK",
	"KBBBBBKBBKBBBBSK",
	"KSBBBBBKKBBBBSSK",
	".KSSSSSSSSSSSSK.",
	"..KKKKKKKKKKKK..",
	"................",
];

/** RGBA per pixel character. */
const PALETTE: Record<string, number> = {
	".": 0x00000000,
	K: 0x17131aff, // outline
	S: 0x5c3a21ff, // shadow
	B: 0x8a5a33ff, // body
	H: 0xb9824fff, // highlight
	W: 0xffffffff, // eye shine
	P: 0xff55ffff, // stink, pink
	V: 0x9b6bffff, // stink, violet
};

const SIZES = [16, 32, 48, 128];
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const RGBA_8BIT = [8, 6, 0, 0, 0]; // bit depth, colour type, compression, filter, interlace

function chunk(type: string, data: Buffer) {
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const framed = Buffer.alloc(body.length + 8);
	framed.writeUInt32BE(data.length);
	body.copy(framed, 4);
	framed.writeUInt32BE(crc32(body), body.length + 4);
	return framed;
}

function png(size: number) {
	const scale = size / ART.length;
	const stride = 1 + size * 4; // each row starts with filter type 0
	const pixels = Buffer.alloc(size * stride);
	for (let y = 0; y < size; y++) {
		const row = ART[Math.floor(y / scale)];
		for (let x = 0; x < size; x++) {
			pixels.writeUInt32BE(
				PALETTE[row[Math.floor(x / scale)]],
				y * stride + 1 + x * 4,
			);
		}
	}
	const header = Buffer.alloc(13);
	header.writeUInt32BE(size, 0);
	header.writeUInt32BE(size, 4);
	header.set(RGBA_8BIT, 8);
	return Buffer.concat([
		SIGNATURE,
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(pixels)),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const { version } = readJson("package.json");

mkdirSync("dist/icons", { recursive: true });
writeFileSync(
	"dist/manifest.json",
	`${JSON.stringify({ ...readJson("manifest.json"), version }, null, "\t")}\n`,
);
for (const size of SIZES)
	writeFileSync(`dist/icons/icon-${size}.png`, png(size));
