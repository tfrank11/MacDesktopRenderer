import { runAppleScript } from "run-applescript";
import {
  Cell,
  CellOperation,
  CellOperationType,
  Display,
  DisplayMoveOperation,
  IRenderGridsProps,
  ScreenResolution,
} from "./types.js";
import { cloneDeep } from "lodash-es";
import readline from "readline";
import { exec } from "child_process";

interface Props {
  deletedPos?: { x: number; y: number };
  monitorIndex?: number;
  screenDimensions?: {
    width: number;
    height: number;
  };
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
   * @param [props.monitorIndex] If you have multiple displays, you may need to play with this to find your primary monitor
   * @param [props.screenDimensions] you can specify the dimensions of your screen for better results
   */
  constructor({
    deletedPos = { x: 0, y: 0 },
    monitorIndex = 0,
    screenDimensions,
  }: Props) {
    this.monitorIndex = monitorIndex;
    this.deletedPos = deletedPos;
    this.initKeyboardHandler();
    if (screenDimensions) {
      this.width = screenDimensions.width;
      this.height = screenDimensions.height;
    }
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
    if (!this.height || !this.width) {
      const resolutions = await this.getScreenDimensions();
      if (this.monitorIndex > resolutions.length - 1) {
        throw new Error("invalid monitor index");
      }
      this.height = resolutions[this.monitorIndex].height;
      this.width = resolutions[this.monitorIndex].width;
    }

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
    return this.makeNumberedFoldersAtPos(
      display.length * display[0].length,
      0,
      0
    );
  }

  /**
   * Renders a series of grids with configurable intervals and options
   * @param {number[][]} props.grids - Set of grids to render
   * @param {number} [props.interval=500] - Ms between renders
   * @param {Object} [props.options] - Formattign options
   * @param {number} [props.options.scale] - Grid size scaling factor
   * @param {number} [props.options.padding.x] - Horizontal padding (cells)
   * @param {number} [props.options.padding.y] - Vertical padding (cells)
   * @param {boolean} [props.logging] - Enable performance logging
   */
  public async renderGrids({
    grids,
    interval = 500,
    formatting,
    logging,
  }: IRenderGridsProps) {
    let gridsToUse = grids;
    if (formatting?.scale) {
      gridsToUse = this.scaleGrids(gridsToUse, formatting.scale);
    }
    if (formatting?.padding?.x) {
      gridsToUse = this.addPadding(gridsToUse, formatting.padding.x, "x");
    }
    if (formatting?.padding?.y) {
      gridsToUse = this.addPadding(gridsToUse, formatting.padding.y, "y");
    }

    await this.init(gridsToUse[0].length, gridsToUse[0][0].length);

    const renderMs: number[] = [];

    for (const grid of gridsToUse) {
      const start = Date.now();
      await this.render(grid);
      if (logging) {
        const ms = Date.now() - start;
        renderMs.push(ms);
        console.log("Frame render ms:", ms);
        renderMs.push(ms);
      }

      await new Promise((res) => setTimeout(res, interval));
    }
    if (logging) {
      console.log(
        "Average ms:",
        renderMs.reduce((p, c) => p + c, 0) / renderMs.length
      );
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

  private async renderOps(ops: CellOperation[]) {
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
    await this.renderMulti(displayOps, 3);
  }

  private async renderMulti(displayOps: DisplayMoveOperation[], num: number) {
    const chunkSize = Math.ceil(displayOps.length / num);
    const chunks = Array.from({ length: num }, (_, i) =>
      displayOps.slice(i * chunkSize, (i + 1) * chunkSize)
    );

    return Promise.all(chunks.map((chunk) => this.bulkMoveFolders(chunk)));
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

  private addPadding(
    grids: number[][][],
    padding: number,
    type: "x" | "y"
  ): number[][][] {
    return grids.map((grid) => {
      const cols = grid[0].length;

      if (type === "y") {
        const paddingRow = new Array(cols).fill(0);
        return [
          ...Array(padding).fill(paddingRow),
          ...grid,
          ...Array(padding).fill(paddingRow),
        ];
      } else {
        return grid.map((row) => [
          ...Array(padding).fill(0),
          ...row,
          ...Array(padding).fill(0),
        ]);
      }
    });
  }

  private scaleGrids(grids: number[][][], scale: number): number[][][] {
    const result: number[][][] = [];
    if (scale <= 0) {
      throw new Error("invalid scale factor");
    }
    for (const grid of grids) {
      const scaledGrid: number[][] = [];

      for (let y = 0; y < grid.length; y++) {
        for (let scaleY = 0; scaleY < scale; scaleY++) {
          const scaledRow: number[] = [];
          for (let x = 0; x < grid[y].length; x++) {
            for (let scaleX = 0; scaleX < scale; scaleX++) {
              scaledRow.push(grid[y][x]);
            }
          }
          scaledGrid.push(scaledRow);
        }
      }
      result.push(scaledGrid);
    }
    return result;
  }

  async cleanup() {
    for (const row of this.display) {
      for (const cell of row) {
        if (!cell) {
          return;
        }
        this.deleteFolder(cell.id);
      }
    }
    for (const id of this.deletedIds) {
      this.deleteFolder(id);
    }
  }

  private makeNumberedFoldersAtPos(num: number, x: number, y: number) {
    let script = `
    tell application "Finder"
  `;

    for (let i = 0; i < num; i++) {
      const folderName = i.toString();
      script += `
      set folderPath to (path to desktop folder as text) & "${folderName}"
      if not (exists folder folderPath) then
        make new folder at (path to desktop folder) with properties {name:"${folderName}"}
      end if
      set desktop position of folder folderPath to {${x}, ${y}}
    `;
    }

    script += `
    end tell
  `;

    return runAppleScript(script);
  }

  private bulkMoveFolders(ops: DisplayMoveOperation[]) {
    let script = `
    tell application "Finder"
    `;

    for (const { id, x, y } of ops) {
      script += `
        set folderPath to (path to desktop folder as text) & "${id}"
        set desktop position of folder folderPath to {${x}, ${y}}`;
    }

    script += `
    end tell
    return
    `;

    return runAppleScript(script);
  }

  private deleteFolder(name: string) {
    const script = `
      set folderName to "${name}"
      set desktopPath to (path to desktop folder) as text
      set targetFolder to desktopPath & folderName
  
      tell application "Finder"
        if exists folder targetFolder then
          delete folder targetFolder
        end if
      end tell
      return
  `;
    return runAppleScript(script);
  }

  private async getScreenDimensions(): Promise<ScreenResolution[]> {
    return new Promise((resolve, reject) => {
      exec(
        "system_profiler SPDisplaysDataType | grep Resolution",
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          }
          if (stderr) {
            reject(stderr);
          }
          const resolutionPattern = /Resolution:\s*(\d+)\s*x\s*(\d+)/g;
          let match;
          const resolutions: ScreenResolution[] = [];

          while ((match = resolutionPattern.exec(stdout)) !== null) {
            const width = parseInt(match[1], 10);
            const height = parseInt(match[2], 10);
            resolutions.push({ width, height });
          }
          resolve(resolutions);
        }
      );
    });
  }
}
