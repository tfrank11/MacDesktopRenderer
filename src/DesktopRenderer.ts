import {
  deleteFolder,
  getScreenDimensions,
  makeNumberedFoldersAtPos,
  moveFoldersBulk,
} from "./scriptUtils.js";
import {
  Cell,
  CellOperation,
  CellOperationType,
  Display,
  DisplayMoveOperation,
} from "./types.js";
import { cloneDeep } from "lodash-es";
import readline from "readline";

interface Props {
  deletedPos?: { x: number; y: number };
  monitorIndex?: number;
}

export class DesktopRenderer {
  private height: number;
  private width: number;
  private rows: number;
  private cols: number;
  private deletedPos: { x: number; y: number };
  private monitorIndex: number;

  private display: Display = [];
  private deletedIds: string[] = [];

  /**
   *
   * @param props
   * @param props.deledPos Screen coordinates to store unused folders (generally want this to be a corner)
   * @param props.monitorIndex If you have multiple displays, you may need to play with this to find your primary monitor
   */
  constructor({ deletedPos = { x: 0, y: 0 }, monitorIndex = 0 }: Props) {
    this.monitorIndex = monitorIndex;
    this.deletedPos = deletedPos;
    this.initKeyboardHandler();
  }

  private initKeyboardHandler() {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.on("keypress", async (chunk, key) => {
      if (key.name === "c") {
        this.cleanup();
      }
      if (key.name === "q") {
        process.exit();
      }
    });
  }

  private async init(rows: number, cols: number) {
    const resolutions = await getScreenDimensions();
    if (this.monitorIndex > resolutions.length - 1) {
      throw new Error("invalid monitor index");
    }
    this.height = resolutions[this.monitorIndex].height;
    this.width = resolutions[this.monitorIndex].width;

    if (this.rows) {
      throw new Error("rows should be undefined");
    }
    if (this.cols) {
      throw new Error("cols should be undefined");
    }
    this.rows = rows;
    this.cols = cols;
    if (this.display.length) {
      throw new Error("init called after display exists");
    }
    const display = Array.from({ length: rows }).map(() =>
      Array.from({ length: cols }).fill(null)
    ) as Display;
    let i = 0;
    for (let r = 0; r < display.length; r++) {
      for (let c = 0; c < display[r].length; c++) {
        const id = i.toString();
        i++;
        this.deletedIds.push(id);
        display[r][c] = null;
      }
    }
    this.display = display;
    return makeNumberedFoldersAtPos(display.length * display[0].length, 0, 0);
  }

  /**
   * Renders a series of grids with (default) 500ms in between each render
   * @param grids A set of grids you want to render
   * @param interval how long between renders
   */
  public async renderGrids(grids: number[][][], interval: number = 500) {
    for (const grid of grids) {
      await this.render(grid);
      await new Promise((res) => setTimeout(res, interval));
    }
  }

  /**
   * Renders an individual grid
   * @param grid u can figure it out
   */
  async render(grid: number[][]) {
    if (!this.display.length) {
      await this.init(grid.length, grid[0].length);
    }
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
    if (this.display.length !== this.rows) {
      throw new Error(
        `number of rows in display (${this.display.length}) does not match renderer (${this.rows})`
      );
    }
    if (this.display[0].length !== this.cols) {
      throw new Error(
        `number of cols in display (${this.display[0].length}) does not match renderer (${this.cols})`
      );
    }
    const ops = this.diff(this.display, grid);
    this.display = this.getDisplayFromOps(ops, this.display);
    await this.renderOps(ops);
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

  private renderOps(ops: CellOperation[]) {
    const displayOps = [];
    for (const op of ops) {
      if (op.type === CellOperationType.MOVE) {
        displayOps.push(this.getRenderMove(op.id, op.r, op.c));
      } else if (op.type === CellOperationType.ADD) {
        displayOps.push(this.getRenderMove(op.id, op.r, op.c));
      } else if (op.type === CellOperationType.DELETE) {
        displayOps.push(this.getRenderDelete(op.id));
      }
    }
    return moveFoldersBulk(displayOps);
  }

  private getRenderMove(
    id: string,
    r: number,
    c: number
  ): DisplayMoveOperation {
    const { x, y } = this.getPos(r, c);
    return {
      id,
      x,
      y,
    };
  }

  private getRenderDelete(id: string): DisplayMoveOperation {
    this.deletedIds.unshift(id);
    return {
      id,
      x: this.deletedPos.x,
      y: this.deletedPos.y,
    };
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
      const id = this.deletedIds.pop();
      if (!id) {
        throw new Error("no more cells in deleted stack");
      }
      operations.push({
        id,
        type: CellOperationType.ADD,
        r,
        c,
      });
    }

    return operations;
  }

  async cleanup() {
    for (const row of this.display) {
      for (const cell of row) {
        if (!cell) {
          return;
        }
        deleteFolder(cell.id);
      }
    }
    for (const id of this.deletedIds) {
      deleteFolder(id);
    }
  }
}
