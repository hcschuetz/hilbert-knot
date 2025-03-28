import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

// This could be given as vector graphics, but a grid was easier:
const halfBaseKnot = `
......#########...#########
......#~~~~~~~#...#~~~~~~~#
......#~#####~#...#~#####~#
...##########~###########~#
...#********#~#********##~#
...#*########~########*##~#
#######~###########~#####~#
#~~~~~#~#~~~~~~~~~#~#~~~~~#
#~#####~###########~#######
#~##*##~###########~##*#...
#~##*##~##*******##~##*#...
#~##*##~##*#####*##~##*#...
#~##*########~########*####
#~~#*#~~~~~~#
`.trim();

// Make use of the knot symmetry:
const baseKnot =
	(halfBaseKnot + "~" + [...halfBaseKnot].reverse().join(""))
	.split(/\r?\n/);

const colors = {
	".": "#cdf", // light blue
	"#": "#000", // black
	"~": "#fc0", // orange
	"*": "#f00", // red
};

function hilbertPolyline(depth: number): [number, number][] {
	let [pos_x, pos_y] = [0, 0], [dir_x, dir_y] = [1, 0];
	const result: Array<[number, number]> = [[pos_x, pos_y]];

	// Turtle operations based on
	// https://en.wikipedia.org/wiki/Hilbert_curve#Representation_as_Lindenmayer_system
	function forward() { result.push([pos_x += dir_x, pos_y += dir_y]); }
	function rotate(rot: number) { [dir_x, dir_y] = [-dir_y*rot, dir_x*rot]; }
	function descend(depth: number, rot: number) {
		if (depth-- === 0) return;
		rotate(rot);
		descend(depth, -rot)
		forward();
		rotate(-rot);
		descend(depth, rot);
		forward();
		descend(depth, rot);
		rotate(-rot);
		forward();
		descend(depth, -rot);
		rotate(rot);
	}

	descend(depth, 1);
	return result;
}

export function App() {
	const [depth, setDepth] = useState(2);
	const [scale, setScale] = useState(3);
	const n = 1 << depth;
	const totalSize = n * 27 * scale;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		ctx.scale(scale, scale);

		function box(symbol: string, x: number, y: number, w: number, h: number) {
			ctx.fillStyle = colors[symbol];
			ctx.fillRect(x, y, w, h);
		}

		// Draw the first two "endless knots":
		for (let i = 0; i < 27; i++) {
			for (let j = 0; j < 27; j++) {
				box(baseKnot[i][j]   , i   , j, 1, 1);
				box(baseKnot[j][26-i], i+27, j, 1, 1); // offset and rotated by 90°
			}
		}
		// Copy these knots all over the canvas via image data:
		// (This is much faster than drawing each knot individually.
		// We could optimize this even more by copying recursively and by also
		// copying the connections below via image data.  But we are already fast
		// enough.)
		const nodeSize = 27 * scale;
		const images = [0, nodeSize].map(offset =>
			ctx.getImageData(offset, 0, nodeSize, nodeSize)
		);
		for (let r = 0; r < n; r++) {
			for (let c = 0; c < n; c++) {
				ctx.putImageData(images[(r+c) % 2], c*nodeSize, r*nodeSize);
			}
		}

		// At this point the endless knots are still disconnected.  Now we tweak
		// the lines to connect the knots in a way similar to a "Hilbert polyline":
		hilbertPolyline(depth).map(([xNew, yNew], i, points) => {
			if (i === 0) return;
			const [xOld, yOld] = points[i-1];
			const [x, y] = [(xOld + xNew) / 2 * 27, (yOld + yNew) / 2 * 27];
			const offset = (Math.min(xOld, xNew) + Math.min(yOld, yNew)) % 2 ? -3 : 3;
			const [vertical, horizontal] = [xNew === xOld, yNew === yOld];
			if (vertical === horizontal) {
				throw "internal: connections should be either horizontal or vertical";
			}
			if (vertical) {
				box("~", x + offset + 10, y + 11.5, 7, 4);
				box("#", x + offset + 11, y + 11.5, 5, 4);
				box(".", x + offset + 12, y + 10.5, 3, 6);
			} else {
				box("~", x + 11.5, y + offset + 10, 4, 7);
				box("#", x + 11.5, y + offset + 11, 4, 5);
				box(".", x + 10.5, y + offset + 12, 6, 3);
			}
		});
	}, [depth, scale]);
	return (
		<div>
			<div class="controls">
				<label htmlFor="">degree</label>
				<input type="range" min="0" max="4" value={depth}
					onChange={e => setDepth(+e.currentTarget.value)}
				/>
				<output>{n} × {n}</output>

				<label htmlFor="">scale</label>
				<input type="range" min="1" max="5" value={scale}
					onChange={e => setScale(+e.currentTarget.value)}
				/>
				<output>{scale}</output>
			</div>
			<canvas ref={canvasRef} width={totalSize} height={totalSize}></canvas>
		</div>
	);
}

render(<App />, document.getElementById('app'));
