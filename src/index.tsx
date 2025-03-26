import { render } from 'preact';
import { TargetedEvent } from 'preact/compat';
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
#######~###########~##*##~#
#~~~~~#~#~~~~~~~~~#~#~~~~~#
#~#####~###########~#######
#~##*########~########*#...
#~##********#~#********#...
#~###########~##########...
#~#####~#...#~#####~#......
#~~~~~~~#...#~~~~~~~#......
#########...#########......
`.trim().split(/\r?\n/);

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

function hilbertPolyLine(depth: number) {
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
		ctx.scale(scale, scale)

		// Draw (2**depth)**2 "endless knots"
		for (let r = 0; r < n; r++) {
			for (let c = 0; c < n; c++) {
				const knot = (r+c) % 2 === 0 ? baseKnot : baseKnot2;
				for (let i = 0; i < 27; i++) {
					for (let j = 0; j < 27; j++) {
						ctx.fillStyle = colors[knot[i][j]];
						ctx.fillRect(
							c * 27 + i,
							r * 27 + j,
							scale,
							scale,
						);
					}
				}
			}
		}
		// Up to here the endless knots are disconnected.  Now we tweak the
		// lines to connect the knots in a way similar to a "Hilbert polyline"
		// (that is, one of the polylines used to approximate a Hilbert curve):
		hilbertPolyLine(depth).map(([x, y], i, points) => {
			if (i === 0) return;
			const [xOld, yOld] = points[i-1];
			// ctx.fillStyle = "#8f8";
			// ctx.fillRect(
			// 	Math.min(xOld, x) * 27 + 13.1,
			// 	Math.min(yOld, y) * 27 + 13.1,
			// 	Math.abs(x - xOld) * 27 + .8,
			// 	Math.abs(y - yOld) * 27 + .8,
			// );
			const parity = Boolean((Math.min(xOld, x) + Math.min(yOld, y)) % 2);
			const vertical = x === xOld;
			if (vertical === (y === yOld)) {
				throw "internal: connections should be either horizontal or vertical";
			}
			if (vertical) {
				ctx.fillStyle = colors["~"];
				ctx.fillRect(
					(xOld + x) / 2 * 27 + (parity ? 7 : 13),
					(yOld + y) / 2 * 27 + 11.5,
					7,
					4,
				);

				ctx.fillStyle = colors["#"];
				ctx.fillRect(
					(xOld + x) / 2 * 27 + (parity ? 8 : 14),
					(yOld + y) / 2 * 27 + 11.5,
					5,
					4,
				);

				ctx.fillStyle = colors["."];
				ctx.fillRect(
					(xOld + x) / 2 * 27 + (parity ? 9 : 15),
					(yOld + y) / 2 * 27 + 10.5,
					3,
					6,
				);
			} else {
				ctx.fillStyle = colors["~"];
				ctx.fillRect(
					(xOld + x) / 2 * 27 + 11.5,
					(yOld + y) / 2 * 27 + (parity ? 7 : 13),
					4,
					7,
				);

				ctx.fillStyle = colors["#"];
				ctx.fillRect(
					(xOld + x) / 2 * 27 + 11.5,
					(yOld + y) / 2 * 27 + (parity ? 8 : 14),
					4,
					5,
				);

				ctx.fillStyle = colors["."];
				ctx.fillRect(
					(xOld + x) / 2 * 27 + 10.5,
					(yOld + y) / 2 * 27 + (parity ? 9 : 15),
					6,
					3,
				);
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
