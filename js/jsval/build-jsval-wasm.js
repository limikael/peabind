import {runCommand, dirnameFromImportMeta} from "../utils/node-util.js";
import path from "path";
import fs, {promises as fsp} from "fs";
import {autoIndent, stripImportsAndExports} from "../utils/lang-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

export async function buildJsvalWasm({output, sources, exportedFunctions, initFunction, hoistedSymbols}) {
	if (!initFunction)
		initFunction="init";

	if (!exportedFunctions)
		exportedFunctions=[];

	if (!hoistedSymbols)
		hoistedSymbols=[];

	let wasmOutput="";

	if (output.endsWith(".wasm"))
		wasmOutput=output;

	else if (output.endsWith(".js"))
		wasmOutput=output.slice(0,output.lastIndexOf("."))+".wasm";

	else
		throw new Error("Expected .js or .wasm output");

	exportedFunctions.push(...[
		"_jsvalCallNative",
		"_jsvalNotifyFinalize"
	]);

	if (!exportedFunctions.includes(`_${initFunction}`))
		exportedFunctions.push(`_${initFunction}`)

	await runCommand("emcc",[
		"-o",wasmOutput,
		"-I",path.join(__dirname,"../../include"),
		"-sSTANDALONE_WASM=1",
		`-sEXPORTED_FUNCTIONS=${exportedFunctions.join(",")}`,
		"--no-entry",
		path.join(__dirname,"../../src/jsval-wasm.cpp"),
		...sources
	]);

	if (output.endsWith(".js")) {
		let depFiles=[
			path.join(__dirname,"../utils/wasm-util.js"),
			path.join(__dirname,"jsval-wasm.js"),
		];

		let depContent=depFiles.map(f=>fs.readFileSync(f,"utf8")).join("\n");
		depContent=stripImportsAndExports(depContent);

		let modSource=autoIndent(`
			${depContent}

	        let mod=await loadJsvalWasm({
	            url: new URL('./${path.basename(wasmOutput)}', import.meta.url),
				initFunction: "${initFunction}"
	        });

			export default mod;

			${hoistedSymbols.map(sym=>`
				export const ${sym}=mod.${sym};
			`).join("\n")}
		`);

		await fsp.writeFile(output,modSource);
	}
}