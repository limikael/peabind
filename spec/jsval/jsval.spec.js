import {buildJsvalWasm} from "../../js/jsval/build-jsval-wasm.js";
import {loadJsvalWasm} from "../../js/jsval/jsval-wasm.js";
import {dirnameFromImportMeta} from "../../js/utils/node-util.js";
import path from "path";

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
    });
})

