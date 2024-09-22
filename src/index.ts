import { DesktopRenderer } from "./DesktopRenderer.js";
import { countdown } from "./examples.js";

const renderer = new DesktopRenderer({
  monitorIndex: 1,
  screenDimensions: {
    width: 1536,
    height: 960,
  },
  multiScriptNum: 5,
});

renderer.renderGrids({
  grids: countdown,
  interval: 1000,
  formatting: {
    scale: 2,
    padding: {
      x: 2,
      y: 2,
    },
  },
  logging: true,
});
