import { runAppleScript } from "run-applescript";

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

export function moveFolder(name: string, x: number, y: number) {
  const script = `
    tell application "Finder"
        set folderPath to (path to desktop folder as text) & "${name}"
        set desktop position of folder folderPath to {${x}, ${y}}
    end tell
    return
    `;
  return runAppleScript(script);
}

export function makeFolderAtPos(name: string, x: number, y: number) {
  const script = `
    tell application "Finder"
	    set folderPath to (path to desktop folder as text) & "${name}"
	    if not (exists folder folderPath) then
	  	  make new folder at (path to desktop folder) with properties {name:"${name}"}
	      end if
	    set desktop position of folder folderPath to {${x}, ${y}}
    end tell
    return
    `;
  return runAppleScript(script);
}

export function deleteFolder(name: string) {
  console.log("delete", name);
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
