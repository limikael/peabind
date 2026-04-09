import {peabind} from "../../src/peabind/peabind.js";
import {dirnameFromImportMeta} from "../../src/utils/node-util.js";
import fs, {promises as fsp} from "fs";
import path from "path";

jasmine.DEFAULT_TIMEOUT_INTERVAL=10000;

let __dirname=dirnameFromImportMeta(import.meta);

describe("basic-wasm",()=>{
	it("can compile and run wasm",async ()=>{
		fs.rmSync(path.join(__dirname,"basic.out.js"),{force: true});
		fs.rmSync(path.join(__dirname,"basic.out.wasm"),{force: true});

		await peabind({
			idl: path.join(__dirname,"basic.json"),
			sources: [path.join(__dirname,"basic.cpp")],
			output: path.join(__dirname,"basic.out.js"),
			target: "wasm"
		});

		let mod=await import(path.join(__dirname,"basic.out.js"));
		let v=mod.hello(1,2);
		//console.log(v);
		expect(v).toEqual(3);
		expect(mod.hello2()).toEqual(222);

		//console.log("calling...");

		let h1=new mod.Hello();
		let h2=new mod.Hello();

		//console.log("h1._handle="+h1._handle+" h2._handle="+h2._handle);
		expect(h1._handle).not.toEqual(h2._handle);

		//console.log("h1 val="+h1.getVal());
		expect(h1.getVal()).toEqual(100);

		h2.destroy();
		h1.destroy();

		let h3=mod.createHello();
		let h4=mod.createHello();

		//console.log("h3._handle="+h3._handle+" h4._handle="+h4._handle);
		expect(h3._handle).toEqual(h4._handle);
		expect(h3).toBe(h4);

		//console.log("h3 val="+h3.getVal());
		expect(h3.getVal()).toEqual(666);
		h3.setVal(789);
		expect(h3.getVal()).toEqual(789);

		mod.setHelloVal(h3,999);
		expect(h3.getVal()).toEqual(999);
		expect(h4.getVal()).toEqual(999);
	});
});
