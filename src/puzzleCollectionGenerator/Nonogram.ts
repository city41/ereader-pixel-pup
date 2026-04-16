// Nonogram solver by fedimser
// Date: 29.05.2017

export function zero1D(size: number): number[] {
  const arr: number[] = [];
  while (size--) arr.push(0);
  return arr;
}

function zero2D(rows: number, cols: number): number[][] {
  const array = [];
  const row = [];
  while (cols--) row.push(0);
  while (rows--) array.push([...row]);
  return array;
}

class Line {
  length = 0;
  cells: number[] = [];
  sure: number[] = [];
  cur: number[] = [];
  ansLine: number[] = [];
  restLength: number[] = [];
  realFound = 0;

  gn = 0;
  groups: number[] = [];

  constructor(groups: number[]) {
    this.groups = groups;
    this.gn = groups.length;

    if (this.gn > 0) {
      this.restLength = zero1D(this.gn);
      this.restLength[this.gn - 1] = groups[this.gn - 1];
      for (var i = this.gn - 2; i >= 0; i--) {
        this.restLength[i] = groups[i] + 1 + this.restLength[i + 1];
      }
    }
  }

  setCells(cells: number[]) {
    this.length = cells.length;
    this.cells = cells;

    this.sure = zero1D(this.length);
    for (let i = 0; i < this.length; i++) {
      if (this.cells[i] !== 0) {
        this.sure[i] = 1;
      }
    }

    this.cur = zero1D(this.length);
    this.ansLine = zero1D(this.length);
  }

  checkFinal(pos: number) {
    for (let i = pos; i < this.length; i++) if (this.cells[i] == 1) return;
    for (var i = 0; i < this.length; i++) {
      if (this.ansLine[i] == 0) this.ansLine[i] = this.cur[i];
      else if (this.ansLine[i] != this.cur[i]) {
        this.ansLine[i] = 2;
        this.cells[i] = 0;
        this.sure[i] = 1;
      }
    }
    this.realFound++;
  }

  rec(g: number, pos: number) {
    if (this.realFound > 0) return;
    if (pos + this.restLength[g] > this.length) return;

    var ok = true;
    for (var i = pos; i < pos + this.groups[g]; i++) {
      if (this.cells[i] == -1) {
        ok = false;
        break;
      }
      this.cur[i] = 1;
    }

    if (
      pos + this.groups[g] < this.length &&
      this.cells[pos + this.groups[g]] == 1
    ) {
      ok = false;
    }

    if (ok) {
      if (g == this.gn - 1) this.checkFinal(pos + this.groups[g]);
      else {
        for (var i = pos + this.groups[g] + 1; i < this.length; ++i) {
          this.rec(g + 1, i);
          if (this.cells[i] == 1) break;
        }
      }
    }

    for (var i = pos; i < pos + this.groups[g]; i++) {
      this.cur[i] = 0;
    }
  }

  isFeasible() {
    if (this.gn == 0) {
      for (var i = 0; i < this.length; ++i)
        if (this.cells[i] == 1) return false;
      return true;
    }

    this.realFound = 0;
    for (var i = 0; i < this.length; ++i) {
      this.rec(0, i);
      if (this.cells[i] == 1) break;
    }
    return this.realFound != 0;
  }

  isModificationFeasible(pos: number, val: number) {
    if (this.ansLine[pos] === 2 || this.ansLine[pos] === val) {
      return true;
    }

    const tmp = this.cells[pos];
    this.cells[pos] = val;
    const ans = this.isFeasible();
    this.cells[pos] = tmp;

    return ans;
  }

  solve() {
    if (!this.isFeasible()) {
      return false;
    }

    for (let i = 0; i < this.length; ++i) {
      if (this.sure[i] === 1) {
        continue;
      }

      if (!this.isModificationFeasible(i, 1)) {
        this.cells[i] = -1;
      } else if (!this.isModificationFeasible(i, -1)) {
        this.cells[i] = 1;
      } else {
        this.cells[i] = 0;
      }

      this.sure[i] = 1;
    }

    return true;
  }
}

export class Nonogram {
  width: number;
  height: number;
  matrix: number[][];
  rows: Line[];
  columns: Line[];
  changed = false;

  constructor(groupsHor: number[][], groupsVert: number[][]) {
    this.width = groupsVert.length;
    this.height = groupsHor.length;
    this.matrix = zero2D(this.height, this.width);
    this.rows = [];
    this.columns = [];

    for (var i = 0; i < this.height; i++)
      this.rows.push(new Line(groupsHor[i]));
    for (var i = 0; i < this.width; i++)
      this.columns.push(new Line(groupsVert[i]));
  }

  getColumn(j: number) {
    var ans = [];
    for (var i = 0; i < this.height; i++) {
      ans.push(this.matrix[i][j]);
    }
    return ans;
  }

  updateMatrix(x: number, y: number, value: number) {
    if (this.matrix[x][y] == 0 && value != 0) {
      this.matrix[x][y] = value;
      this.changed = true;
    }
  }

  isComplete() {
    for (var i = 0; i < this.height; i++) {
      for (var j = 0; j < this.width; j++) {
        if (this.matrix[i][j] == 0) {
          return false;
        }
      }
    }

    return true;
  }

  solve() {
    do {
      this.changed = false;
      for (var i = 0; i < this.height; i++) {
        this.rows[i].setCells(this.matrix[i]);

        if (!this.rows[i].solve()) {
          return false;
        }

        for (var j = 0; j < this.width; j++) {
          this.updateMatrix(i, j, this.rows[i].cells[j]);
        }
      }

      for (var i = 0; i < this.width; i++) {
        this.columns[i].setCells(this.getColumn(i));

        if (!this.columns[i].solve()) {
          return false;
        }

        for (var j = 0; j < this.height; j++) {
          this.updateMatrix(j, i, this.columns[i].cells[j]);
        }
      }
    } while (this.changed);
    return true;
  }

  solveAndCheck() {
    if (!this.solve()) {
      return "Impossible.";
    }

    if (!this.isComplete()) {
      return "Multiple solutions.";
    } else {
      return "Solved";
    }
  }
}
