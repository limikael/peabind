import {peabindWasm} from "../../src/peabind/peabind-wasm.js";
import {dirnameFromImportMeta} from "../../src/utils/node-util.js";
import fs, {promises as fsp} from "fs";
import path from "path";

let __dirname=dirnameFromImportMeta(import.meta);

describe("basic-wasm",()=>{
	it("can compile and run wasm",async ()=>{
		fs.rmSync(path.join(__dirname,"basic.out.js"),{force: true});
		fs.rmSync(path.join(__dirname,"basic.out.wasm"),{force: true});

		await peabindWasm({
			idl: path.join(__dirname,"basic.json"),
			sources: [path.join(__dirname,"basic.cpp")],
			output: path.join(__dirname,"basic.out.js")
		});

		let mod=await import(path.join(__dirname,"basic.out.js"));
		//let v=mod.hello(1,2);
		//console.log(v);
		//expect(v).toEqual(3);

		expect(mod.hello2()).toEqual(222);

		let h=new mod.Hello();
		expect(h.getVal()).toEqual(123);
	});
});
