import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

// This could be created programmatically, but it was easier to draw manually:
const baseKnot = `
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
#~~#*#~~~~~~#~#~~~~~~#*#~~#
####*########~########*##~#
...#*##~##*#####*##~##*##~#
...#*##~##*******##~##*##~#
...#*##~###########~##*##~#
#######~###########~#####~#
#~~~~~#~#~~~~~~~~~#~#~~~~~#
#~#####~###########~#######
#~##*########~########*#...
#~##********#~#********#...
#~###########~##########...
#~#####~#...#~#####~#......
#~~~~~~~#...#~~~~~~~#......
#########...#########......
`.trim().split(/\r?\n/);

/* `baseKnot` rotated by 90° */
const baseKnot2 = baseKnot.map((_, i) =>
	baseKnot[i].split("").map((_, j) =>
		baseKnot[j][26-i]
	).join("")
);

const colors = {
	".": "#cdf", // light blue
	"#": "#000", // black
	"~": "#fc0", // orange
	"*": "#f00", // red
};

function hilbertPolyline(depth: number): [number, number][] {
	let pos_x = 0, pos_y = 0, dir_x = 1, dir_y = 0;
	const result: Array<[number, number]> = [[pos_x, pos_y]];

	// Turtle operations using
	// https://en.wikipedia.org/wiki/Hilbert_curve#Representation_as_Lindenmayer_system
	function forward () { result.push([pos_x += dir_x, pos_y += dir_y]); }
	function rotPlus () { [dir_x, dir_y] = [-dir_y, dir_x]; }
	function rotMinus() { [dir_x, dir_y] = [dir_y, -dir_x]; }

	function A(depth: number) {
		if (depth-- === 0) return;
		rotPlus();
		B(depth)
		forward();
		rotMinus();
		A(depth);
		forward();
		A(depth);
		rotMinus();
		forward();
		B(depth);
		rotPlus();
	}
	function B(depth: number) {
		if (depth-- === 0) return;
		rotMinus();
		A(depth);
		forward();
		rotPlus()
		B(depth);
		forward();
		B(depth);
		rotPlus();
		forward();
		A(depth);
		rotMinus();
	}

	A(depth);
	return result;
}

export function App() {
	const [depth, setDepth] = useState(2);
	const [scale, setScale] = useState(3);
	const n = 1 << depth;
	const totalSize = (1 << depth) * 27 * scale;
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

		// Draw (2**depth)**2 "endless knots"
		for (let r = 0; r < n; r++) {
			const r27 = r * 27;
			for (let c = 0; c < n; c++) {
				const c27 = c * 27;
				const knot = (r+c) % 2 === 0 ? baseKnot : baseKnot2;
				for (let i = 0; i < 27; i++) {
					const knot_i = knot[i];
					for (let j = 0; j < 27; j++) {
						box(knot_i[j], c27 + i, r27 + j, 1, 1);
					}
				}
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
				<output>{1 << depth} × {1 << depth}</output>

				<label htmlFor="">scale</label>
				<input type="range" min="1" max="5" step=".1" value={scale}
					onChange={e => setScale(+e.currentTarget.value)}
				/>
				<output>{scale}</output>
			</div>
      <canvas ref={canvasRef} width={totalSize} height={totalSize}></canvas>
		</div>
	);
}

render(<App />, document.getElementById('app'));
