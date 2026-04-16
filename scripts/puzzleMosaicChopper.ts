import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { Canvas, createCanvas, Image } from "canvas";

async function createCanvasFromPath(pngPath: string): Promise<Canvas> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = createCanvas(img.width, img.height);
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.src = pngPath;
  });
}

function getSubCanvas(
  canvas: Canvas,
  x: number,
  y: number,
  size: number
): Canvas {
  const subCanvas = createCanvas(size, size);
  const subContext = subCanvas.getContext("2d");
  subContext.drawImage(canvas, x, y, size, size, 0, 0, size, size);

  return subCanvas;
}

async function main(imagePath: string, outputDir: string, tileSize: number) {
  const canvas = await createCanvasFromPath(imagePath);

  for (let y = 0; y < canvas.height; y += tileSize) {
    for (let x = 0; x < canvas.width; x += tileSize) {
      const subcanvas = await getSubCanvas(canvas, x, y, tileSize);
      const data = subcanvas.toBuffer();

      const writePath = path.resolve(
        outputDir,
        `tile-x${x / tileSize}-y${y / tileSize}.png`
      );
      await fsp.writeFile(writePath, data);
      console.log("wrote", writePath);
    }
  }
}

if (require.main === module) {
  const [_tsNode, _puzzleMosaicChopper, imagePath, outputDir, tileSize] =
    process.argv;

  if (!imagePath || !outputDir || isNaN(parseInt(tileSize))) {
    console.error(
      "usage: ts-node puzzleMosaicChopper.ts <image-file> <output-dir> <tile-size>"
    );
    process.exit(1);
  }

  main(path.resolve(imagePath), path.resolve(outputDir), parseInt(tileSize))
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
