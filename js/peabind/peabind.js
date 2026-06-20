import {peabindWasm} from "./peabind-wasm.js";
import {peabindQuickjs} from "./peabind-quickjs.js";
import {peabindMqjs} from "./peabind-mqjs.js";
import {peabindNormalize, peabindMerge} from "../idl/peabind-idl.js";
import {arrayify} from "../utils/js-util.js";
import JSON5 from "json5";
import path from "path";
import fs from "fs";
export {peabindMerge} from "../idl/peabind-idl.js";
import {dirnameFromImportMeta} from "../utils/node-util.js";
import {peabindStreamBackend} from "../stream/peabind-stream-backend.js";
import {peabindStreamFrontend} from "../stream/peabind-stream-frontend.js";

let __dirname=dirnameFromImportMeta(import.meta);

export async function peabind(options) {
	options.sources=arrayify(options.sources);
	options.includePath=arrayify(options.includePath);

	options.idl=arrayify(options.idl).map(idl=>{
		if (typeof idl=="string") {
			options.includePath.push(path.dirname(idl));
			idl=JSON5.parse(fs.readFileSync(idl));
		}

		return idl;
	});

	options.idl=peabindMerge(options.idl);

	switch (options.target) {
		case "wasm":
			return await peabindWasm(options);
			break;

		case "quickjs":
			return await peabindQuickjs(options);
			break;

		case "mqjs":
			return await peabindMqjs(options);

		case "stream-backend":
			return await peabindStreamBackend(options);

		case "stream-frontend":
			return await peabindStreamFrontend(options);

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
		"mqjs": "JSVAL_TARGET_MQJS"
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
						path.join(__dirname,"../../src/jsval-util.cpp"),
						path.join(__dirname,"../../src/PeabindJsval.cpp"),
					]);
					break;

				case "mqjs":
					return ([
						path.join(__dirname,"../../src/jsval-mqjs.cpp"),
						path.join(__dirname,"../../src/jsval-util.cpp"),
						path.join(__dirname,"../../src/PeabindJsval.cpp"),
					]);
					break;

				case "wasm":
					return [
						path.join(__dirname,"../../src/PeabindJsval.cpp"),
					];

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

		case "vendor-cargs":
			switch (target) {
				case "quickjs":
					/*return ([
						path.join(__dirname,"../../ext/quickjs-2025-09-13/cutils.c"),
						path.join(__dirname,"../../ext/quickjs-2025-09-13/dtoa.c"),
						path.join(__dirname,"../../ext/quickjs-2025-09-13/libregexp.c"),
						path.join(__dirname,"../../ext/quickjs-2025-09-13/libunicode.c"),
						path.join(__dirname,"../../ext/quickjs-2025-09-13/quickjs.c"),
						path.join(__dirname,"../../ext/quickjs-2025-09-13/unicode_gen.c"),
						"-I"+path.join(__dirname,"../../ext/quickjs-2025-09-13")
					]);*/
					return ([
						path.join(__dirname,"../../ext/quickjs-2025-09-13/libquickjs.a"),
						"-I"+path.join(__dirname,"../../ext/quickjs-2025-09-13")
					]);

					break;

				case "mqjs":
					throw new Error("unimpl");
					break;

				case "wasm":
					throw new Error("why on earth would you need that?");
					return [];
					break;

				default:
					throw new Error("vendor-cargs needs target");
			}
			break;

		default:
			throw new Error("Unknown conf key: "+key);
	}
}