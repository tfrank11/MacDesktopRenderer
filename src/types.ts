export enum CellOperationType {
  ADD,
  DELETE,
  MOVE,
}

export type CellOperation =
  | AddCellOperation
  | DeleteCellOperation
  | MoveCellOperation;

export type AddCellOperation = {
  id: string;
  type: CellOperationType.ADD;
  r: number;
  c: number;
};

export type DeleteCellOperation = {
  id: string;
  type: CellOperationType.DELETE;
  r: number;
  c: number;
};

export type MoveCellOperation = {
  id: string;
  type: CellOperationType.MOVE;
  r: number;
  c: number;
  oldR: number;
  oldC: number;
};

export type Cell = {
  id: string;
  r: number;
  c: number;
};

export type Display = (Cell | null)[][];

export type ScreenResolution = {
  width: number;
  height: number;
};

export type DisplayMoveOperation = {
  id: string;
  x: number;
  y: number;
};

export type IFormatOptions = {
  scale: number;
  padding?: IPaddingOptions;
};

type IPaddingOptions =
  | {
      x: number;
      y?: number;
    }
  | {
      x?: number;
      y: number;
    };

export type IRenderGridsProps = {
  grids: number[][][];
  interval: number;
  formatting?: IFormatOptions;
  logging?: boolean;
};

export type IDesktopRendererProps = {
  deletedPos?: { x: number; y: number };
  monitorIndex?: number;
  screenDimensions?: {
    width: number;
    height: number;
  };
  multiScriptNum?: number;
};
