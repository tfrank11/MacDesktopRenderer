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
