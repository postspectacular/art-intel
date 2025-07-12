import type { Note } from "@layerinc/core";
import { BlockFS } from "@thi.ng/block-fs/fs";
import { MemoryBlockStorage } from "@thi.ng/block-fs/storage/memory";
import { canvas2d } from "@thi.ng/canvas";
import { FMT_yyyyMMdd_HHmmss } from "@thi.ng/date";
import { downloadCanvas } from "@thi.ng/dl-asset";
import { fitIntoBounds2, Points, points, rect } from "@thi.ng/geom";
import { draw } from "@thi.ng/hiccup-canvas";
import { imageFromURL } from "@thi.ng/pixel";
import { XsAdd } from "@thi.ng/random";
import { U32, Z4 } from "@thi.ng/strings";
import { TSNE } from "@thi.ng/tsne";
import { sum } from "@thi.ng/vectors";
import DB_URL from "./_db-layer.json?url";
import THUMBNAILS from "./thumbnails-512.dat?url";

interface TSNEItem extends Note {
	img8x8: number[];
}

const RECORD = false;
// const RECORD = true;
const W = 1920;
const H = 1080;
const W2 = W >> 1;
const H2 = H >> 1;
const SESSION_ID = FMT_yyyyMMdd_HHmmss();
const S = 32;
const S2 = S >> 1;
const BOUNDS = 1580;
// const BOUNDS = 1580 * 2;
// const B2 = BOUNDS >> 1;
// const ROT_SPEEDX = 0;
// const ROT_SPEEDY = 0.0033;

// const SEED = SYSTEM.int();

// const SEED = 0x428c80dc;
// const SEED = 0x90ce48e2;
// const SEED = 0x50678598;
// const SEED = 0x5727cfb2;
// const SEED = 0x7fa0df28;
// const SEED = 0xdb7837bd;

// const SEED = 0x5c26ca7a;

const SEED = 0xab245570;

console.log(U32(SEED));

// deterministic PRNG instance
const RND = new XsAdd(SEED);

const response = await fetch(THUMBNAILS);
const buffer = await response.arrayBuffer();

const BS = 512;
const FS = new BlockFS(
	new MemoryBlockStorage({
		buffer,
		blockSize: BS,
		numBlocks: buffer.byteLength / BS,
	})
);
await FS.init();

const $DB = <TSNEItem[]>await (await fetch(DB_URL)).json();
const DB = $DB.filter((x) => sum(x.img8x8) > 0);
const NUM = DB.length;
console.log($DB.length, "raw");
console.log(NUM, "items");

const assetPathForHash = (hash: string) =>
	`${hash.substring(0, 2)}/${hash.substring(2, 4)}`;

const images = await Promise.all(
	DB.map(async (x) =>
		imageFromURL(
			await FS.readAsObjectURL(
				`${assetPathForHash(x._hash)}/${x._id}-poster.avif`
			)
		)
	)
);

const tsne = new TSNE(
	DB.map((x) => x.img8x8),
	{
		rnd: RND,
		perplexity: 20,
		rate: 100,
		searchIter: 200,
		maxIter: 2400,
		gradientScale: {
			start: 1,
			end: 1,
			iter: 100,
		},
	}
);

const canvas = canvas2d(W, H, document.body);
let frame = 0;

const update = () => {
	// console.log(performance.now());
	if (!(frame % 100)) console.log(frame);
	tsne.update();
	const pts = <Points>(
		fitIntoBounds2(
			points(tsne.points.map((p) => [p[0], p[1]])),
			rect([-W2 + S, -H2 + S], [W - 2 * S, H - 2 * S])
		)!
	);
	// const pts = <Points3>fitIntoBounds3(
	// 	// create point cloud of extracted 2D coords
	// 	points3(tsne.points.map((p) => [p[0], p[1], p[2]])),
	// 	// points3(tsne.points.map((p) => [p[0], p[1] * scale, p[2] * scale])),
	// 	// points3(tsne.points.map((p) => [p[0], 0, 0])),
	// 	// target bounding rect (i.e. canvas size minus padding)
	// 	aabb(
	// 		// [-B2 + S, -H2 + S, -B2 + S],
	// 		[-B2 + S, -B2 + S, -B2 + S],
	// 		// [BOUNDS - 2 * S, H - 2 * S, BOUNDS - 2 * S]
	// 		[BOUNDS - 2 * S, BOUNDS - 2 * S, BOUNDS - 2 * S]
	// 	)
	// );
	// pts.points.forEach((p, i) => {
	// 	// rotateX(p, p, Math.sin(frame * ROT_SPEEDX + HALF_PI) * THIRD_PI);
	// 	// rotateX(p, p, frame * ROT_SPEEDX);
	// 	rotateY(p, p, frame * ROT_SPEEDY);
	// 	p[3] = i;
	// });
	// pts.points.sort(comparator3(2, 1, 0));
	// pts.points.sort(comparator3(0, 1, 2));
	// pts.points.sort(compareByKey(0));
	const scene = [
		"g",
		{
			__background: "#000",
			translate: [W2, H2],
		},
		...pts.points.map((p, i) => [
			"img",
			{ width: S, height: S },
			images[i],
			// images[p[3]],
			[p[0] - S2, p[1] - S2],
		]),
	];
	draw(canvas.ctx, scene);
	if (RECORD)
		downloadCanvas(
			canvas.canvas,
			`${SESSION_ID}-${U32(SEED)}-${Z4(frame)}`
		);
	frame++;
};

setInterval(update, RECORD ? 500 : 16);
