import {buildJsvalWasm} from "../../js/jsval/build-jsval-wasm.js";
import {loadJsvalWasm} from "../../js/jsval/jsval-wasm.js";
import {dirnameFromImportMeta} from "../../js/utils/node-util.js";
import {forceGc} from "../../js/utils/test-util.js";
import path from "path";

jasmine.DEFAULT_TIMEOUT_INTERVAL=10000;
let __dirname=dirnameFromImportMeta(import.meta);

describe("jsval",()=>{
    it("can compile and run wasm",async ()=>{
        await buildJsvalWasm({
            output: path.join(__dirname,"mymod.out.wasm"),
            sources: [path.join(__dirname,"mymod.cpp")]
        });

        let mod=await loadJsvalWasm({
            url: new URL('./mymod.out.wasm', import.meta.url),
        });

        mod.init();

        let v=mod.add(1,2);
        expect(v).toEqual(3);

        function hello() {
            return "testing";
        }

        let s=mod.makecall(hello);
        expect(s).toEqual("testing");
 
        let i=mod.getstringlen("test");
        expect(i).toEqual(4);

        let s2=mod.concat("hello","world");
        //console.log("s2=",s2,s2.length);
        expect(s2).toEqual("helloworld");

        let my=new mod.MyClass();
        expect(my.getVal()).toEqual(100);
        my.setVal(123);
        expect(my.getVal()).toEqual(123);
    });

    it("does gc properly",async ()=>{
        await buildJsvalWasm({
            output: path.join(__dirname,"mymod.out.wasm"),
            sources: [path.join(__dirname,"mymod.cpp")]
        });

        let mod=await loadJsvalWasm({
            url: new URL('./mymod.out.wasm', import.meta.url),
        });

        mod.init();
        let numObjsBefore=mod.__jsvalWasmModule.objectById.keys().toArray().length;
        //console.log("objs before gc: "+numObjsBefore);

        await forceGc();
        let numObjsAfter=mod.__jsvalWasmModule.objectById.keys().toArray().length;
        //console.log("objs after gc: "+numObjsBefore);

        expect(numObjsAfter).toBeLessThan(numObjsBefore*.8);

        /*for (let id of mod.__jsvalWasmModule.objectById.keys())
            console.log(id,mod.__jsvalWasmModule.objectById.get(id).deref())*/
    });
})

