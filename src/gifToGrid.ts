import { gifToGrid, writeFramesToTSFile } from "./gridUtils.js";

(async () => {
  const [, , gifPath, width, height, threshold] = process.argv;

  if (!gifPath || !width || !height || !threshold) {
    console.error(
      "Usage: gif-to-arrays <gifPath> <width> <height> <threshold>"
    );
    process.exit(1);
  }

  try {
    const frames = await gifToGrid({
      gifPath,
      width: parseInt(width),
      height: parseInt(height),
      threshold: parseInt(threshold),
    });

    await writeFramesToTSFile(frames, "output.ts");
    console.log("Conversion completed successfully");
  } catch (error) {
    console.error("Error during conversion:", error);
    process.exit(1);
  }
})();
