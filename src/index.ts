import { DesktopRenderer } from "./DesktopRenderer.js";
import { countdown } from "./examples.js";

const renderer = new DesktopRenderer({
  monitorIndex: 1,
  screenDimensions: {
    width: 1536,
    height: 960,
  },
});

renderer.renderGrids(countdown, 1000, {
  scale: 2,
  padding: {
    y: 2,
    x: 2,
  },
});
