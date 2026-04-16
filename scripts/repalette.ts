import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { createCanvas, Canvas, Image } from "canvas";

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

async function getPaletteArray(
  palettePath: string
): Promise<Array<[number, number, number, number]>> {
  const paletteCanvas = await createCanvasFromPath(palettePath);

  const array: Array<[number, number, number, number]> = [];
  const data = paletteCanvas
    .getContext("2d")
    .getImageData(0, 0, paletteCanvas.width, paletteCanvas.height).data;

  for (let p = 0; p < data.length; p += 4) {
    array.push(
      Array.from(data.slice(p, p + 4)) as [number, number, number, number]
    );
  }

  return array;
}

const MAGENTA = "255-0-255-255";

async function main(
  oldPalettePath: string,
  newPalettePath: string,
  imgDir: string
) {
  const oldPalette = await getPaletteArray(oldPalettePath);
  const newPalette = await getPaletteArray(newPalettePath);

  const files = (await fsp.readdir(imgDir)).filter((f) => f.endsWith(".png"));

  for (const imageFile of files) {
    console.log("processing", imageFile);

    const imagePath = path.resolve(imgDir, imageFile);
    const image = await createCanvasFromPath(imagePath);
    const imageContext = image.getContext("2d");
    const imageData = imageContext.getImageData(
      0,
      0,
      image.width,
      image.height
    );

    let skipImage = false;

    for (let p = 0; p < imageData.data.length; p += 4) {
      const color = Array.from(imageData.data.slice(p, p + 4));
      if (color[3] !== 255) {
        continue;
      }

      const colors = color.join("-");

      if (colors === MAGENTA) {
        continue;
      }

      if (newPalette.some((c) => c.join("-") === colors)) {
        continue;
      }

      const oldIndex = oldPalette.findIndex((c) => colors === c.join("-"));
      if (oldIndex < 0) {
        console.warn(`--------------Did not find a color for: ${imageFile}`);
        skipImage = true;
        break;
      }

      const newColor = newPalette[oldIndex];
      imageData.data[p] = newColor[0];
      imageData.data[p + 1] = newColor[1];
      imageData.data[p + 2] = newColor[2];
    }

    if (skipImage) {
      continue;
    }

    imageContext.putImageData(imageData, 0, 0);

    const buffer = image.toBuffer();
    await fsp.writeFile(imagePath, buffer);
    console.log("wrote", imagePath);
  }
}

if (require.main === module) {
  const [_tsNode, _repalette, oldPalettePath, newPalettePath, imgDir] =
    process.argv;

  if (!oldPalettePath || !newPalettePath || !imgDir) {
    console.error(
      "usage: ts-node repalette.ts <old-palette-path> <new-palette-path> <img-dir>"
    );
    process.exit(1);
  }

  main(
    path.resolve(oldPalettePath),
    path.resolve(newPalettePath),
    path.resolve(imgDir)
  )
    .then(() => console.log("done"))
    .catch((e) => console.error(e));
}
