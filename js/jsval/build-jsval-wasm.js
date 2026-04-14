import {runCommand, dirnameFromImportMeta} from "../utils/node-util.js";
import path from "path";

let __dirname=dirnameFromImportMeta(import.meta);

export async function buildJsvalWasm({output, sources}) {
	await runCommand("emcc",[
		"-o",output,
		"-I",path.join(__dirname,"../../include"),
		"-sSTANDALONE_WASM=1",
		"-sEXPORTED_FUNCTIONS=_init,_jsvalCallNative,_jsvalNotifyFinalize",
		"--no-entry",
		path.join(__dirname,"../../src/jsval-wasm.cpp"),
		...sources
	]);
    //"build": "emcc -olab/mymod.wasm -Isrc -sSTANDALONE_WASM=1 -sEXPORTED_FUNCTIONS=_init,_jsvalCallNative --no-entry lab/mymod.cpp src/jsval-wasm.cpp"
}