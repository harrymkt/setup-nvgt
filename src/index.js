import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as io from "@actions/io";
import * as exec from "@actions/exec";
import * as tool from "./tool.js";
import os from "os";
import path from "path";
import fs from "fs";
import process from "process";

async function run() {
	try {
		const version = core.getInput("version");
		const latest = core.getInput("latest") === "true";
		const dev = core.getInput("dev") === "true";
		const addToPath = core.getInput("add_to_path") === "true";
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
		core.info(`Downloading NVGT: ${url}`);
		const downloadPath = await tc.downloadTool(url, path.join(process.env["RUNNER_TEMP"], `nvgtfile.${EXT}`));
		let installPath;
		if (platform === "win32") {
			const dest = "C:\\nvgt";
			await io.mkdirP(dest);
			core.info("Installing NVGT on Windows...");
			await exec.exec(downloadPath, [
				"/VERYSILENT",
				"/SUPPRESSMSGBOXES",
				"/NORESTART",
				`/DIR=${dest}`,
			]);
			installPath = dest;
		} else if (platform === "linux") {
			const dest = "/opt/nvgt";
			await io.mkdirP(dest);
			core.info("Extracting NVGT on Linux...");
			await tc.extractTar(downloadPath, dest);
			installPath = dest;
		} else if (platform === "darwin") {
			const mount = path.join(os.tmpdir(), "nvgt_mount");
			const appDir = path.join(process.env.HOME, "Applications");
			const targetApp = path.join(appDir, "NVGT.app");
			await io.mkdirP(mount);
			await io.mkdirP(appDir);
			core.info("Mounting NVGT DMG...");
			try {
				await exec.exec("hdiutil", [
					"attach",
					downloadPath,
					"-mountpoint",
					mount,
					"-nobrowse",
					"-quiet",
				]);
				core.info("Installing NVGT...");
				// Remove only the app bundle (safe overwrite)
				if (fs.existsSync(targetApp)) {
					await io.rmRF(targetApp);
				}
				await io.cp(`${mount}/NVGT.app`, appDir, {recursive: true});
			} finally {
				core.info("Unmounting NVGT DMG...");
				await exec.exec("hdiutil", ["detach", mount, "-quiet"]);
			}
			installPath = `${targetApp}/Contents/MacOS`;
		}
		core.setOutput("path", installPath);
		if (addToPath) {
			core.addPath(installPath);
			core.info("Added NVGT to PATH");
		}
		core.info(`NVGT has been installed at: ${installPath}`);
		if (tools.length > 0) {
			core.info("Installing tools...");
			for (const t of tools) {
				await tool.install(t, installPath);
			}
		}
	} catch (err) {
		core.setFailed(err.message);
	}
}
run();
