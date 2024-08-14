import readline from "readline";

export function initKeyboardHandler(cleanup: () => Promise<void>) {
  readline.emitKeypressEvents(process.stdin);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.on("keypress", async (chunk, key) => {
    if (key.name === "c") {
      await cleanup();
    }
    if (key.name === "q") {
      process.exit();
    }
  });
}
