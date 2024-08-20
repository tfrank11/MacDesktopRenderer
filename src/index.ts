import { DesktopRenderer } from "./DesktopRenderer.js";
import { countdown } from "./examples.js";

const renderer = new DesktopRenderer({
  monitorIndex: 1,
});

renderer.renderGrids(countdown, 750);
