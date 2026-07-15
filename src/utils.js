import os from "os";

export function getPlatformKey() {
	switch (os.platform()) {
		case "win32":
			return "windows";
		case "darwin":
			return "macos";
		default:
			return "linux";
	}
}
