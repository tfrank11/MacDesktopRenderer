import { exec } from "child_process";
import { runAppleScript } from "run-applescript";
import { DisplayMoveOperation, ScreenResolution } from "./types";

export function makeFolder(name: string) {
  const script = `
	  tell application "Finder"
		  set folderPath to (path to desktop folder as text) & "${name}"
		  if not (exists folder folderPath) then
			  make new folder at (path to desktop folder) with properties {name: "${name}"}
		  end if
	  end tell
    return
    `;
  return runAppleScript(script);
}

export function makeNumberedFoldersAtPos(num: number, x: number, y: number) {
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

export function moveFoldersBulk(ops: DisplayMoveOperation[]) {
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

export function deleteFolder(name: string) {
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

export async function getScreenDimensions(): Promise<ScreenResolution[]> {
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
