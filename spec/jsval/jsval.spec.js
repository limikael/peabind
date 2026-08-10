import {buildJsvalWasm} from "../../js/jsval/build-jsval-wasm.js";
import {loadJsvalWasm} from "../../js/jsval/jsval-wasm.js";
import {dirnameFromImportMeta} from "../../js/utils/node-util.js";
import {forceGc} from "../../js/utils/test-util.js";
import path from "path";

jasmine.DEFAULT_TIMEOUT_INTERVAL=30000;
let __dirname=dirnameFromImportMeta(import.meta);

async function buildMod() {
    //console.log("building jsval");
    await buildJsvalWasm({
        output: path.join(__dirname,"mymod.out.js"),
        sources: [path.join(__dirname,"mymod.cpp")],
        initFunction: "init"
    });

    return (await import(path.join(__dirname,"mymod.out.js"))).default;
}

let modPromise;
async function getMod() {
    if (!modPromise)
        modPromise=buildMod();

    return await modPromise;
}

describe("jsval",()=>{
    it("can generate a module",async ()=>{
        let mod=await getMod();
        expect(mod.add(1,2)).toEqual(3);
    });

    it("can check instance of",async ()=>{
        let mod=await getMod();
        let instance1=new mod.Class1();
        let instance2=new mod.Class2();

        expect(mod.checkInstanceOf(instance1,mod.Class1)).toBeTrue();
        expect(mod.checkInstanceOf(instance1,mod.Class2)).toBeFalse();
        expect(mod.checkInstanceOf(instance2,mod.Class2)).toBeTrue();
        expect(mod.checkInstanceOf(instance2,mod.Class1)).toBeFalse();
        //expect().toBeTrue();
    });

    it("can compile and run wasm",async ()=>{
        let mod=await getMod();
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
        let mod=await getMod();
        for (let i=0; i<100; i++) {
            let my=new mod.MyClass();
        }

        let numObjsBefore=mod.__jsvalWasmModule.objectById.keys().toArray().length;
        //console.log("objs before gc: "+numObjsBefore);

        await forceGc();
        let numObjsAfter=mod.__jsvalWasmModule.objectById.keys().toArray().length;
        //console.log("objs after gc: "+numObjsBefore);

        expect(numObjsAfter).toBeLessThan(numObjsBefore*.8);

        /*for (let id of mod.__jsvalWasmModule.objectById.keys())
            console.log(id,mod.__jsvalWasmModule.objectById.get(id).deref())*/
    });

    it("calls finalizers",async ()=>{
        let mod=await getMod();
        await forceGc();

        expect(mod.getNumLiveMyClass()).toEqual(0);
        //console.log("creating myclass");
        let c=new mod.MyClass();
        expect(mod.getNumLiveMyClass()).toEqual(1);
        let c2=new mod.MyClass();
        expect(mod.getNumLiveMyClass()).toEqual(2);
        await forceGc();
        expect(mod.getNumLiveMyClass()).toEqual(2);
        //console.log("removing before MyClass...");
        c=null;
        await forceGc();
        expect(mod.getNumLiveMyClass()).toEqual(1);
        c2=null;
        await forceGc();
        expect(mod.getNumLiveMyClass()).toEqual(0);
        //console.log("removing after MyClass...");
    });

    it("round-trips small ints without growing the registry",async ()=>{
        let mod=await getMod();
        let reg=mod.__jsvalWasmModule.objectById;

        // Boundary values that fit in the 31-bit tagged range.
        const TAG_MAX=(1<<30)-1;
        const TAG_MIN=-(1<<30);
        for (const v of [0,1,-1,42,-42,12345,-12345,TAG_MAX,TAG_MIN]) {
            expect(mod.echoInt(v)).withContext(`v=${v}`).toEqual(v);
            expect(mod.isArgTaggedInt(v)).withContext(`tagged? v=${v}`).toEqual(1);
        }

        // Hammer it. Without tagging the int arg AND the int return value
        // would each get registered, giving ~3 entries per call (args,
        // unpacked arg via jsvalGetItemAt, packed return via jsvalCreateInt).
        // With tagging, only the args array gets a slot — so growth is at
        // most one per call.
        const N=200;
        const sizeBefore=reg.size;
        for (let i=0; i<N; i++) {
            expect(mod.echoInt(i)).toEqual(i);
        }
        const grew=reg.size-sizeBefore;
        expect(grew).withContext(`registry grew by ${grew} over ${N} calls`).toBeLessThanOrEqual(N);
    });

    it("falls back to boxed ints when out of tagged range",async ()=>{
        let mod=await getMod();
        const TAG_MAX=(1<<30)-1;

        // Just outside the tagged range — must use the boxed path, but
        // still round-trip correctly.
        for (const v of [TAG_MAX+1, -(TAG_MAX+2), 2**30, -(2**30)-1, 2**30+12345]) {
            expect(mod.echoInt(v)).withContext(`v=${v}`).toEqual(v);
            expect(mod.isArgTaggedInt(v)).withContext(`not tagged? v=${v}`).toEqual(0);
        }
    });

    it("passes many tagged ints in one call",async ()=>{
        let mod=await getMod();
        // sumInts is variadic, so we get one args array (boxed) but each
        // element is a tagged int with no individual registry entry.
        expect(mod.sumInts(1,2,3,4,5)).toEqual(15);
        expect(mod.sumInts(-10,10)).toEqual(0);
        expect(mod.sumInts()).toEqual(0);
    });

    it("can call callbacks",async ()=>{
        let mod=await getMod();
        let callCount=0;

        let my=new mod.MyClass();
        my.setCallback((i,s)=>{
            callCount++;
            //console.log("p: ",i,s);
            expect(s).toEqual("hello"+i);
            //console.log("hello");
        });

        my.triggerCallback(1,"hello1");
        expect(callCount).toEqual(1);
        await forceGc();
        my.triggerCallback(2,"hello2");
        expect(callCount).toEqual(2);

        my=null;
        await forceGc();

        expect(mod.__jsvalWasmModule.strongById.keys().toArray().length).toEqual(0);
    });
});

