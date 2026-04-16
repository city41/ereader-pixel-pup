const solidColors = [
  [149, 105, 200], // purple
  [29, 105, 43], // green
  [49, 54, 105], // blue
  [252, 33, 18], // red
  [0, 0, 0], // black
];

function isSolidColor(data) {
  return solidColors.some((sc) => {
    return (
      sc[0] === data[0] &&
      sc[1] === data[1] &&
      sc[2] === data[2] &&
      data[3] === 255
    );
  });
}

export default function generateGridFromImage(src) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const img = document.createElement("img");

    img.src = src;

    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0, img.width, img.height);

      const grid = [];
      for (let y = 0; y < img.height; y++) {
        if (!grid[y]) grid[y] = [];
        for (let x = 0; x < img.width; x++) {
          const data = canvas.getContext("2d").getImageData(x, y, 1, 1).data;

          if (isSolidColor(data)) {
            grid[y][x] = 1;
          } else {
            grid[y][x] = 0;
          }
        }
      }

      resolve(grid);
    };
  });
}
