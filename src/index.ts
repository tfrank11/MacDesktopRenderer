import { DesktopRenderer } from "./DesktopRenderer.js";
import { countdown } from "./examples.js";

const renderer = new DesktopRenderer({
  deletedPos: {
    x: 0,
    y: 0,
  },
  monitorIndex: 1,
});

renderer.renderGrids(countdown, 750);
