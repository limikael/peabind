#!/usr/bin/env node

import {dirnameFromImportMeta, runCommand} from "../utils/node-util.js";
import path from "path";
import fs, {promises as fsp} from "fs";

let __dirname=dirnameFromImportMeta(import.meta);

let ext=path.join(__dirname,"../../ext");
fs.mkdirSync(ext,{recursive: true});
fs.mkdirSync(path.join(__dirname,"../../bin"),{recursive: true});

let downloadFile=path.join(ext,"quickjs-2025-09-13-2.tar.xz");
if (!fs.existsSync(downloadFile)) {
	await runCommand("curl",[
		"https://bellard.org/quickjs/quickjs-2025-09-13-2.tar.xz",
		"-o",downloadFile
	]);
}

if (!fs.existsSync(path.join(ext,"quickjs-2025-09-13"))) {
	await runCommand("tar",[
		"-xf",downloadFile,
		"-C",ext
	]);
}

await runCommand("make",[],{cwd: path.join(ext,"quickjs-2025-09-13")});
