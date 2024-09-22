import fs from "fs/promises";
import Jimp from "jimp";
import { parseGIF, decompressFrames } from "gifuct-js";

type IGifToGridOptions = {
  gifPath: string;
  width: number;
  height: number;
  threshold: number;
};

/**
 * Converts a GIF file to an array of binary frames.
 *
 * @param {Object} options - The options for processing the GIF.
 * @param {string} options.gifPath - The file path of the GIF to process.
 * @param {number} options.width - The maximum width of the output frames.
 * @param {number} options.height - The maximum height of the output frames.
 * @param {number} options.threshold - The intensity threshold for converting pixels to 0/1
 * @returns {Promise<number[][][]>} A promise that resolves to a 3D array representing binary frames.
 *
 * @example
 * const frames = await gifToArrays({
 *   gifPath: './path/to/gif.gif',
 *   width: 100,
 *   height: 100,
 *   threshold: 128
 * });
 */
export async function gifToGrid({
  gifPath,
  width,
  height,
  threshold,
}: IGifToGridOptions): Promise<number[][][]> {
  const gifBuffer = await fs.readFile(gifPath);
  const gif = parseGIF(gifBuffer);
  const frames = decompressFrames(gif, true);

  const maxWidth = Math.min(
    Math.max(...frames.map((frame) => frame.dims.width)),
    width
  );
  const maxHeight = Math.min(
    Math.max(...frames.map((frame) => frame.dims.height)),
    height
  );

  const framesBinaryArray: number[][][] = [];

  for (const frame of frames) {
    const jimpImage = new Jimp({
      data: Buffer.from(frame.patch),
      width: frame.dims.width,
      height: frame.dims.height,
    });

    if (jimpImage.bitmap.width > width || jimpImage.bitmap.height > height) {
      jimpImage.resize(width, Jimp.AUTO);
      if (jimpImage.bitmap.height > height) {
        jimpImage.resize(Jimp.AUTO, height);
      }
    }

    const paddedImage = new Jimp(maxWidth, maxHeight, 0x00000000);
    paddedImage.composite(
      jimpImage,
      (maxWidth - jimpImage.bitmap.width) / 2,
      (maxHeight - jimpImage.bitmap.height) / 2
    );

    const binaryArray: number[][] = [];

    for (let y = 0; y < paddedImage.bitmap.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < paddedImage.bitmap.width; x++) {
        const idx = paddedImage.getPixelIndex(x, y);
        const red = paddedImage.bitmap.data[idx];
        const green = paddedImage.bitmap.data[idx + 1];
        const blue = paddedImage.bitmap.data[idx + 2];
        const alpha = paddedImage.bitmap.data[idx + 3];

        const intensity =
          (0.2126 * red + 0.7152 * green + 0.0722 * blue) * (alpha / 255);

        row.push(intensity > threshold ? 1 : 0);
      }
      binaryArray.push(row);
    }

    framesBinaryArray.push(binaryArray);
  }

  return framesBinaryArray;
}

export async function writeFramesToTSFile(
  framesBinaryArray: number[][][],
  outputPath: string
) {
  let fileContent = `export const frames = [\n`;
  framesBinaryArray.forEach((frame) => {
    fileContent += `  [\n`;
    frame.forEach((row) => {
      fileContent += `    [${row.join(", ")}],\n`;
    });
    fileContent += `  ],\n`;
  });

  fileContent += `];\n`;
  await fs.writeFile(outputPath, fileContent, "utf8");
  console.log(`Binary frames written to ${outputPath}`);
}
