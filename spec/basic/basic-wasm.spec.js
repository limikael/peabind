import {peabind} from "../../js/peabind/peabind.js";
import {dirnameFromImportMeta} from "../../js/utils/node-util.js";
import fs, {promises as fsp} from "fs";
import path from "path";
import {forceGc} from "../../js/utils/test-util.js";

jasmine.DEFAULT_TIMEOUT_INTERVAL=10000;

let __dirname=dirnameFromImportMeta(import.meta);

describe("basic-wasm",()=>{
	it("refactor",async()=>{
		fs.rmSync(path.join(__dirname,"basic.out.js"),{force: true});
		fs.rmSync(path.join(__dirname,"basic.out.wasm"),{force: true});

		await peabind({
			idl: path.join(__dirname,"basic.json"),
			sources: [path.join(__dirname,"basic.cpp")],
			output: path.join(__dirname,"basic.out.js"),
			target: "wasm"
		});
	});

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
		let a=[];
		h1.on("data",(d1,d2)=>{
			a.push(d1,d2);
			//console.log("got event: "+d1+","+d2);
		});
		h1.emitData(123,456);

		expect(a).toEqual([123,456]);

		let h2=new mod.Hello();

		//console.log("h1._handle="+h1._handle+" h2._handle="+h2._handle);
		expect(h1._handle).not.toEqual(h2._handle);

		//console.log("h1 val="+h1.getVal());
		expect(h1.getVal()).toEqual(100);

		/*h2.destroy();
		h1.destroy();*/

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

	it("can handle types and events",async ()=>{
		fs.rmSync(path.join(__dirname,"basic.out.js"),{force: true});
		fs.rmSync(path.join(__dirname,"basic.out.wasm"),{force: true});

		await peabind({
			idl: path.join(__dirname,"basic.json"),
			sources: [path.join(__dirname,"basic.cpp")],
			output: path.join(__dirname,"basic.out.js"),
			target: "wasm"
		});

		let mod=await import(path.join(__dirname,"basic.out.js"));
		let i=mod.hellof(1.5);
		expect(i).toEqual(15);

		let f=mod.hellothird(10);
		expect(f).toBeCloseTo(3.3333333333333333333333,6);

		let h=new mod.Hello();
		let invokeCount=0;
		h.on("dataVoid",()=>{
			//expect(1).toEqual(2);
			invokeCount++;
		});
		h.emitDataVoid();

		h.on("dataFloat",f=>{
			expect(f).toBeCloseTo(123.456,5);
			invokeCount++;
		});
		h.emitDataFloat(123.456);

		h.on("dataHello",ph=>{
			expect(ph.getVal()).toEqual(777);
			invokeCount++;
		});

		let eh=new mod.Hello();
		eh.setVal(777);
		h.emitDataHello(eh);

		h.on("dataString",s=>{
			expect(s).toEqual("hello");
			invokeCount++;
		});

		h.emitDataString("hello");

		expect(invokeCount).toEqual(4);
	});

	it("can handle strings",async ()=>{
		fs.rmSync(path.join(__dirname,"basic.out.js"),{force: true});
		fs.rmSync(path.join(__dirname,"basic.out.wasm"),{force: true});

		await peabind({
			idl: path.join(__dirname,"basic.json"),
			sources: [path.join(__dirname,"basic.cpp")],
			output: path.join(__dirname,"basic.out.js"),
			target: "wasm"
		});

		let mod=await import(path.join(__dirname,"basic.out.js"));
		let i=mod.hellos("123","00");
		expect(i).toEqual("12300");
	});

	it("works with gc",async()=>{
		fs.rmSync(path.join(__dirname,"basic.out.gc.js"),{force: true});
		fs.rmSync(path.join(__dirname,"basic.out.gc.wasm"),{force: true});

		await peabind({
			idl: path.join(__dirname,"basic.json"),
			sources: [path.join(__dirname,"basic.cpp")],
			output: path.join(__dirname,"basic.out.gc.js"),
			target: "wasm"
		});

		let mod=await import(path.join(__dirname,"basic.out.gc.js"));

		expect(mod.getLiveHelloCount()).toEqual(0);
		let h1=new mod.Hello();
		expect(mod.getLiveHelloCount()).toEqual(1);
		let h2=new mod.Hello();
		expect(mod.getLiveHelloCount()).toEqual(2);

		await forceGc();
		h2=null;
		await forceGc();
		expect(mod.getLiveHelloCount()).toEqual(1);
		h1=null;
		await forceGc();
		expect(mod.getLiveHelloCount()).toEqual(0);
	});
});
