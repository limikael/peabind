import {peabindWasm} from "./peabind-wasm.js";
//import {peabindQuickjs} from "./peabind-quickjs.js";
import {peabindNormalize} from "./peabind-idl.js";
import {arrayify} from "../utils/js-util.js";
import JSON5 from "json5";
import path from "path";
import fs from "fs";
export {peabindMerge} from "./peabind-idl.js";

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