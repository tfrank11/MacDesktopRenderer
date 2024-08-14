import {
  deleteFolder,
  makeFolder,
  makeFolderAtPos,
  moveFolder,
} from "./scriptUtils.js";
import {
  Cell,
  CellOperation,
  CellOperationType,
  Display,
  MoveCellOperation,
} from "./types.js";
import { v4 as uuid } from "uuid";
import { flatten, cloneDeep } from "lodash-es";

interface Props {
  height: number;
  width: number;
  rows: number;
  cols: number;
}

export class DesktopRenderer {
  private height: number;
  private width: number;
  private rows: number;
  private cols: number;

  private display: Display = [];

  constructor({ height, width, rows, cols }: Props) {
    this.height = height;
    this.width = width;
    this.rows = rows;
    this.cols = cols;
  }

  async render(grid: number[][]) {
    if (grid.length !== this.rows) {
      throw new Error(
        `number of rows in grid (${grid.length}) does not match renderer (${this.rows})`
      );
    }
    if (grid[0].length !== this.cols) {
      throw new Error(
        `number of cols in grid (${grid[0].length}) does not match renderer (${this.cols})`
      );
    }
    if (!this.display.length) {
      // initial render`
      this.display = this.getDisplay(grid);
      await this.renderDisplay(this.display);
    } else {
      // re-renders
      const ops = this.diff(this.display, grid);
      this.display = this.getDisplayFromOps(ops, this.display);
      await this.applyOpsToDesktop(ops);
    }
  }

  private getDisplayFromOps(ops: CellOperation[], display: Display): Display {
    const result = cloneDeep(display);
    for (const op of ops) {
      if (op.type === CellOperationType.MOVE) {
        result[op.oldR][op.oldC] = null;
        result[op.r][op.c] = {
          id: op.id,
          r: op.r,
          c: op.c,
        };
      } else if (op.type === CellOperationType.ADD) {
        result[op.r][op.c] = {
          id: op.id,
          r: op.r,
          c: op.c,
        };
      } else if (op.type === CellOperationType.DELETE) {
        result[op.r][op.c] = null;
      }
    }
    return result;
  }

  private applyOpsToDesktop(ops: CellOperation[]) {
    const promises = [];
    for (const op of ops) {
      if (op.type === CellOperationType.MOVE) {
        const { x, y } = this.getPos(op.r, op.c);
        promises.push(moveFolder(op.id, x, y));
      } else if (op.type === CellOperationType.ADD) {
        const { x, y } = this.getPos(op.r, op.c);
        promises.push(makeFolderAtPos(op.id, x, y));
      } else if (op.type === CellOperationType.DELETE) {
        promises.push(deleteFolder(op.id));
      }
    }
    return Promise.allSettled(promises);
  }

  private getDisplay(grid: number[][]): Display {
    const display: Display = [];
    for (let r = 0; r < grid.length; r++) {
      const row: (Cell | null)[] = [];
      for (let c = 0; c < grid[r].length; c++) {
        const val = grid[r][c];
        if (![1, 0].includes(val)) {
          throw new Error("unsupported grid value");
        }
        if (val === 0) {
          row.push(null);
        } else {
          const cell: Cell = {
            id: uuid(),
            r,
            c,
          };
          row.push(cell);
        }
      }
      display.push(row);
    }
    return display;
  }

  private renderDisplay(display: Display) {
    const promises = [];
    for (let r = 0; r < display.length; r++) {
      for (let c = 0; c < display[0].length; c++) {
        const cell = display[r][c];
        if (cell !== null) {
          promises.push(this.renderCell(cell));
        }
      }
    }
    return Promise.allSettled(promises);
  }

  private async renderCell(cell: Cell) {
    const { x, y } = this.getPos(cell.r, cell.c);
    await makeFolder(cell.id);
    moveFolder(cell.id, x, y);
  }

  private deleteCell(cell: Cell) {
    return deleteFolder(cell.id);
  }

  async cleanup() {
    const promises = flatten(
      this.display.map((row) =>
        row.map((cell) => {
          if (!cell) {
            return;
          }
          return this.deleteCell(cell);
        })
      )
    );
    await Promise.allSettled(promises);
  }

  private getPos(r: number, c: number): { x: number; y: number } {
    const x = (c / this.cols) * this.width;
    const y = (r / this.rows) * this.height;
    return { x, y };
  }

  private diff(display: Display, grid: number[][]): CellOperation[] {
    const rows = display.length;
    const cols = display[0].length;
    const operations: CellOperation[] = [];

    // To keep track of unmatched cells in both display and grid
    const unmatchedInDisplay: { cell: Cell; r: number; c: number }[] = [];
    const unmatchedInGrid: { r: number; c: number }[] = [];

    // Step 1: Identify moves and unmatched cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = display[r][c];
        const gridValue = grid[r][c];

        if (cell !== null && gridValue === 1) {
          // Both display and grid have 1 in the same position, no operation needed
          continue;
        } else if (cell !== null && gridValue === 0) {
          // Display has a cell but grid has 0 -> potential delete
          unmatchedInDisplay.push({ cell, r, c });
        } else if (cell === null && gridValue === 1) {
          // Display has null but grid has 1 -> potential add
          unmatchedInGrid.push({ r, c });
        }
      }
    }

    // Step 2: Match unmatched cells from display to grid (MOVE operation)
    while (unmatchedInDisplay.length && unmatchedInGrid.length) {
      const { cell } = unmatchedInDisplay.pop()!;
      const to = unmatchedInGrid.pop()!;
      operations.push({
        id: cell.id,
        type: CellOperationType.MOVE,
        r: to.r,
        c: to.c,
        oldR: cell.r,
        oldC: cell.c,
      });
    }

    // Step 3: Handle remaining unmatched cells
    // Remaining unmatchedInDisplay will be DELETE operations
    while (unmatchedInDisplay.length) {
      const { cell } = unmatchedInDisplay.pop()!;
      operations.push({
        id: cell.id,
        type: CellOperationType.DELETE,
        r: cell.r,
        c: cell.c,
      });
    }

    // Remaining unmatchedInGrid will be ADD operations
    while (unmatchedInGrid.length) {
      const { r, c } = unmatchedInGrid.pop()!;
      operations.push({
        id: uuid(),
        type: CellOperationType.ADD,
        r,
        c,
      });
    }

    return operations;
  }
}
