import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as io from "@actions/io";
import * as exec from "@actions/exec";
import os from "os";
import path from "path";
import fs from "fs";
import process from "process";

const toolMap = {
	nvgtpm: {
		windows: {
			url: "https://github.com/harrymkt/nvgtpm/releases/latest/download/nvgtpm.exe",
			file: "nvgtpm.exe",
		},
		linux: {
			url: "https://github.com/harrymkt/nvgtpm/releases/latest/download/nvgtpm-linux",
			file: "nvgtpm",
		},
		macos: {
			url: "https://github.com/harrymkt/nvgtpm/releases/latest/download/nvgtpm-macos",
			file: "nvgtpm",
		},
	}
};
function getPlatformKey() {
	switch (os.platform()) {
		case "win32":
			return "windows";
		case "darwin":
			return "macos";
		default:
			return "linux";
	}
}
async function downloadTool(url, destination) {
	const tempFile = await tc.downloadTool(url);
	await io.mkdirP(path.dirname(destination));
	// Overwrite existing file
	await exec.exec("cp", ["-R", tempFile, destination]);
	return destination;
}
async function installTool(tool, installDir) {
	const platform = getPlatformKey();
	const definition = toolMap[tool];
	if (!definition) {
		throw new Error(`Unknown NVGT tool: ${tool}`);
	}
	const platformInfo = definition[platform];
	if (!platformInfo) {
		throw new Error(`Tool "${tool}" is not supported on ${platform}`);
	}
	const destination = path.join(installDir, platformInfo.file);
	core.info(`Installing ${tool}`);
	await downloadTool(platformInfo.url, destination);
	// Linux/macOS binaries need execute permission
	if (platform !== "windows") {
		await exec.exec("chmod", ["755", destination]);
	}
	core.info(`${tool} installed at ${destination}`);
	return destination;
}

async function run() {
	try {
		const version = core.getInput("version");
		const latest = core.getInput("latest") === "true";
		const dev = core.getInput("dev") === "true";
		const addToPath = core.getInput("add-to-path") === "true";
		const tools = core
			.getMultilineInput("tools")
			.map(tool => tool.trim())
			.filter(Boolean);
		const platform = os.platform();
		let PLATFORM, EXT;
		if (platform === "win32") {
			PLATFORM = "windows";
			EXT = "exe";
		} else if (platform === "darwin") {
			PLATFORM = "mac";
			EXT = "dmg";
		} else {
			PLATFORM = "linux";
			EXT = "tar.gz";
		}
		let url;
		if (dev) {
			url = `https://nvgt.zip/dev/${PLATFORM}`;
		} else if (latest) {
			url = `https://nvgt.zip/${PLATFORM}`;
		} else {
			url = `https://nvgt.dev/downloads/nvgt_${version}.${EXT}`;
		}
		core.info(`Downloading: ${url}`);
		const downloadPath = await tc.downloadTool(url, path.join(process.env["RUNNER_TEMP"], `nvgtfile.${EXT}`));
		let installPath;
		// ------------------------
		// WINDOWS
		// ------------------------
		if (platform === "win32") {
			const dest = "C:\\nvgt";
			await io.mkdirP(dest);
			core.info("Installing on Windows...");
			await exec.exec(downloadPath, [
				"/VERYSILENT",
				"/SUPPRESSMSGBOXES",
				"/NORESTART",
				`/DIR=${dest}`,
			]);
			installPath = dest;
		}
		// ------------------------
		// LINUX
		// ------------------------
		else if (platform === "linux") {
			const dest = "/opt/nvgt";
			await io.mkdirP(dest);
			core.info("Extracting on Linux (overwrite mode)...");
			await tc.extractTar(downloadPath, dest);
			installPath = dest;
		}
		// ------------------------
		// MACOS
		// ------------------------
		else if (platform === "darwin") {
			const mount = path.join(os.tmpdir(), "nvgt_mount");
			const appDir = path.join(process.env.HOME, "Applications");
			const targetApp = path.join(appDir, "NVGT.app");
			await io.mkdirP(mount);
			await io.mkdirP(appDir);
			core.info("Mounting DMG...");
			try {
				await exec.exec("hdiutil", [
					"attach",
					downloadPath,
					"-mountpoint",
					mount,
					"-nobrowse",
					"-quiet",
				]);
				core.info("Installing (overwrite app bundle)...");
				// remove only the app bundle (safe overwrite)
				if (fs.existsSync(targetApp)) {
					await io.rmRF(targetApp);
				}
				await exec.exec("cp", ["-R", `${mount}/NVGT.app`, appDir]);
			} finally {
				core.info("Unmounting DMG...");
				await exec.exec("hdiutil", ["detach", mount, "-quiet"]);
			}
			installPath = `${targetApp}/Contents/MacOS`;
		}
		// ------------------------
		// OUTPUT
		// ------------------------
		core.setOutput("path", installPath);
		if (addToPath) {
			core.addPath(installPath);
			core.info("Added to PATH");
		}
		core.info(`Installed at: ${installPath}`);
		if (tools) {
			core.info("Installing tools");
			for (const t of tools) {
				await installTool(t, installPath);
			}
		}
	} catch (err) {
		core.setFailed(err.message);
	}
}
run();
