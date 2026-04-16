export default function resizeGrid(sizeEnum, grid) {
  let rows = 5;
  let cols = 5;

  switch (sizeEnum) {
    case 0: {
      rows = 5;
      cols = 5;
      break;
    }
    case 1: {
      rows = 10;
      cols = 10;
      break;
    }
    case 2: {
      rows = 15;
      cols = 15;
      break;
    }
  }

  if (grid[0].length < cols) {
    for (const y in grid) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] == undefined) grid[y][x] = 0;
      }
    }
  } else if (grid[0].length > cols) {
    for (const y in grid) {
      grid[y] = grid[y].slice(0, cols);
    }
  }

  if (grid.length < rows) {
    for (let y = grid.length; y < rows; y++) {
      grid[y] = grid[0].map(() => 0);
    }
  } else if (grid.length > rows) {
    while (grid.length > rows) {
      grid.pop();
    }
  }
}
