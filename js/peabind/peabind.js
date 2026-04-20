import {peabindWasm} from "./peabind-wasm.js";
import {peabindQuickjs} from "./peabind-quickjs.js";
import {peabindNormalize} from "./peabind-idl.js";
import {arrayify} from "../utils/js-util.js";
import JSON5 from "json5";
import path from "path";
import fs from "fs";
export {peabindMerge} from "./peabind-idl.js";
import {dirnameFromImportMeta} from "../utils/node-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

export async function peabind(options) {
	options.sources=arrayify(options.sources);
	options.includePath=arrayify(options.includePath);

	if (typeof options.idl=="string") {
		options.includePath.push(path.dirname(options.idl));
		options.idl=JSON5.parse(fs.readFileSync(options.idl));
	}

	options.idl=peabindNormalize(options.idl);

	switch (options.target) {
		case "wasm":
			return await peabindWasm(options);
			break;

		case "quickjs":
			return await peabindQuickjs(options);
			break;

		default:
			throw new Error("Unknown target: "+options.target);
			break;
	}
}

export function peabindGetLibConf(key, opts={}) {
	let {target}=opts;

	let targetDefines={
		"quickjs": "JSVAL_TARGET_QUICKJS",
		"wasm": "JSVAL_TARGET_WASM",
	};

	switch (key) {
		case "includeDir":
			return path.join(__dirname,"../../include");
			break;

		case "sources":
			switch (target) {
				case "quickjs":
					return ([
						path.join(__dirname,"../../src/jsval-quickjs.cpp"),
						path.join(__dirname,"../../src/jsval-util.cpp")
					]);
					break;

				case "wasm":
					return [];

				default:
					throw new Error("sources conf needs target");
			}
			break;

		case "cargs":
			if (!target)
				throw new Error("cargs needs target");

			return ([
				"-I"+peabindGetLibConf("includeDir",opts),
				...peabindGetLibConf("sources",opts),
				"-D"+targetDefines[opts.target]
			]);
			break;

		case "cflags-only-I":
			return "-I"+path.join(__dirname,"../../include");
			break;

		default:
			throw new Error("Unknown conf key: "+key);
	}
}