import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as io from "@actions/io";
import * as exec from "@actions/exec";
import os from "os";
import path from "path";
import fs from "fs";
import process from "process";
async function run() {
	try {
		const version = core.getInput("version");
		const latest = core.getInput("latest") === "true";
		const dev = core.getInput("dev") === "true";
		const addToPath = core.getInput("add-to-path") === "true";
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
	} catch (err) {
		core.setFailed(err.message);
	}
}
run();