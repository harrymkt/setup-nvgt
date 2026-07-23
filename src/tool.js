import {getPlatformKey} from "./utils.js";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as io from "@actions/io";
import path from "path";
import fs from "fs";

export const tools = {
	nvgtpm: {
		windows: {
			file: "nvgtpm.exe",
			url: {
				latest: "https://github.com/harrymkt/nvgtpm/releases/latest/download/nvgtpm.exe",
				dev: "https://github.com/harrymkt/nvgtpm/releases/download/dev/nvgtpm.exe",
				ver: "https://github.com/harrymkt/nvgtpm/releases/download/%0/nvgtpm.exe"
			}
		},
		linux: {
			file: "nvgtpm",
			url: {
				latest: "https://github.com/harrymkt/nvgtpm/releases/latest/download/nvgtpm-linux",
				dev: "https://github.com/harrymkt/nvgtpm/releases/download/dev/nvgtpm-linux",
				ver: "https://github.com/harrymkt/nvgtpm/releases/download/%0/nvgtpm-linux"
			}
		},
		macos: {
			file: "nvgtpm",
			url: {
				latest: "https://github.com/harrymkt/nvgtpm/releases/latest/download/nvgtpm-macos",
				dev: "https://github.com/harrymkt/nvgtpm/releases/download/dev/nvgtpm-macos",
				ver: "https://github.com/harrymkt/nvgtpm/releases/download/%0/nvgtpm-macos"
			}
		},
	},
};

export function parse(input) {
	const parts = input.split("@");
	return {
		name: parts[0],
		tag: parts[1] || "latest",
	};
}
export function resolveUrl(url, tag) {
	if (typeof url === "string") {
		return url;
	}
	if (tag === "latest" && url.latest) {
		return url.latest;
	}
	if (tag === "dev" && url.dev) {
		return url.dev;
	}
	if (url.ver) {
		return url.ver.replace("%0", tag);
	}
	throw new Error(`No URL available for tag "${tag}"`);
}

export async function download(url, destination) {
	const tempFile = await tc.downloadTool(url);
	await io.mkdirP(path.dirname(destination));
	// Overwrite existing file
	await io.cp(tempFile, destination);
	return destination;
}
export async function install(toolInput, installDir) {
	const platform = getPlatformKey();
	const { name, tag } = parse(toolInput);
	const definition = tools[name];
	if (!definition) {
		throw new Error(`Unknown NVGT tool: ${name}`);
		return false;
	}
	const platformInfo = definition[platform];
	if (!platformInfo) {
		throw new Error(`Tool "${name}" is not supported on ${platform}`);
		return false;
	}
	const url = resolveUrl(platformInfo.url, tag);
	const destination = path.join(installDir, platformInfo.file);
	core.info(`Installing ${name}@${tag}`);
	await download(url, destination);
	if (platform !== "windows") {
		fs.chmodSync(destination, 0o755);
	}
	core.info(`${name}@${tag} installed at ${destination}`);
	return true;
}
