import drawOutputGrid from "./draw-output-grid.js";
import generateClues from "./generate-clues.js";

export default function exportGrid(grid, type) {
  const a = document.createElement("a");

  if (type == "png") {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = grid[0].length;
    canvas.height = grid.length;

    for (let y = 0; y < canvas.height; ++y) {
      for (let x = 0; x < canvas.width; ++x) {
        let color = "rgba(0,0,0,0)";
        if (grid[y][x] === 1) {
          color = "rgb(255,0,255)";
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    canvas.toBlob((blob) => {
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    }, "image/png");

    // const img = canvas.toDataURL("image/png");

    // a.setAttribute("href", "data:image/png" + img);
    // a.setAttribute("download", "nonogram.png");
  } else if (type == "json") {
    const gridString =
      "[\n   " + grid.map((row) => JSON.stringify(row)).join(",\n   ") + "\n]";

    a.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(gridString)
    );
    a.setAttribute("download", "nonogram.json");
  }

  a.style.display = "none";
  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);
}
