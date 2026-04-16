import {loadWasmInstance} from "../utils/wasm-util.js";

class JsvalWasmModule {
    constructor({url, initFunction}) {
        if (!initFunction)
            throw new Error("No init function for load!");

        this.objectById=new Map();
        this.strongById=new Map();
        this.idByObject=new WeakMap();
        this.finalizationRegistry=new FinalizationRegistry(({classId,id})=>{
            this.objectById.delete(id);
            //let o=this.objectById.get(id).deref();

            if (classId) {
                //console.log("finalizing from JS: ",id);
                this.instance.exports.jsvalNotifyFinalize(classId,id);
            }
        });
        this.nextRegistryId=1;
        this.url=url;
        this.initFunction=initFunction;
    }

    async load() {
        this.instance=await loadWasmInstance({
            url: this.url,
            env: {
                jsvalGetSize: this.jsvalGetSize,
                jsvalGetItemAt: this.jsvalGetItemAt,
                jsvalSetItemAt: this.jsvalSetItemAt,
                jsvalCreateFuncStub: this.jsvalCreateFuncStub,
                jsvalCreateClassStub: this.jsvalCreateClassStub,
                jsvalCallArray: this.jsvalCallArray,
                jsvalCreateString: this.jsvalCreateString,
                jsvalSetPropJsval: this.jsvalSetPropJsval,
                jsvalGetPropJsval: this.jsvalGetPropJsval,
                jsvalGetInt: this.jsvalGetInt,
                jsvalGetFloat: this.jsvalGetFloat,
                //jsvalGetModule: this.jsvalGetModule,
                jsvalCreateInt: this.jsvalCreateInt,
                jsvalCreateFloat: this.jsvalCreateFloat,
                jsvalCreateArray: this.jsvalCreateArray,
                jsvalReadString: this.jsvalReadString,
                jsvalDup: this.jsvalDup,
                jsvalFree: this.jsvalFree,
                jsvalCreateObject: this.jsvalCreateObject,
                jsvalUndefined: this.jsvalUndefined,
            }
        });

        this.mod={...this.instance.exports};
        this.mod[this.initFunction](this.pack(this.mod));
        this.mod.__jsvalWasmModule=this;

        return this.mod;
    }

    jsvalUndefined=()=>{
        return this.pack(undefined);
    }

    jsvalDup=(id)=>{
        //console.log("dup: "+id);
        if (!this.strongById.has(id)) {
            this.strongById.set(id,{
                count: 0,
                object: this.unpack(id)
            });
        }

        this.strongById.get(id).count++;
        return id;
    }

    jsvalFree=(id)=>{
        //console.log("free: "+id);
        let strong=this.strongById.get(id);
        if (!strong) {
            console.log("warning! double free!")
            return;
        }

        strong.count--;
        if (!strong.count)
            this.strongById.delete(id);
    }

    pack=(o)=>{
        if (this.idByObject.has(o))
            return this.idByObject.get(o);

        let id=this.nextRegistryId++;
        if (typeof o=="string" ||
                typeof o=="number" ||
                [true,false,null,undefined].includes(o))
            o={__jsval_boxed: o};

        let classId;
        if (Object.getPrototypeOf(o))
            classId=Object.getPrototypeOf(o).__classId;

        this.objectById.set(id,new WeakRef(o));
        this.idByObject.set(o,id);
        this.finalizationRegistry.register(o,{classId,id});

        return id;
    }

    unpack=(id)=>{
        if (id===0)
            return 0;

        let o=this.objectById.get(id).deref();
        if (o===undefined) {
            console.log("warning!!! unpacking undefined id: "+id);
        }

        if (typeof o=="object" && o.hasOwnProperty("__jsval_boxed"))
            return o.__jsval_boxed;

        return o;
    }

    jsvalGetModule=()=>{
        return this.pack(this.mod);
    }

    jsvalGetSize=(id)=>{
        let o=this.unpack(id);

        if (Array.isArray(o))
            return o.length;

        if (typeof o=="string") {
            let bytes=new TextEncoder().encode(o);
            return bytes.length;
        }

        return 0;
    }

    jsvalGetItemAt=(oid, index)=>{
        let array=this.unpack(oid);
        let o=array[index];

        return this.pack(o);
    }

    jsvalSetItemAt=(oid, index, val)=>{
        let array=this.unpack(oid);
        array[index]=this.unpack(val);
    }

    jsvalCallArray=(fid, thisid, argid)=>{
        let fn=this.unpack(fid);
        let thisobj=this.unpack(thisid);
        let arg=this.unpack(argid);
        if (!arg)
            arg=[];
        let ret=fn.apply(thisobj,arg);
        return this.pack(ret);
    }

    jsvalCreateObject=(classId)=>{
        //console.log("creating class, classid="+classId);

        let cls=this.unpack(classId);
        let instance=Object.create(cls.prototype);
        return this.pack(instance);
    }

    jsvalCreateString=(ptr)=>{
        let mem=new Uint8Array(this.instance.exports.memory.buffer);
        let end=ptr;
        while (mem[end]!==0) end++;
        let s=new TextDecoder("utf-8").decode(mem.subarray(ptr, end));
        return this.pack(s);
    }

    jsvalCreateArray=(size)=>{
        return this.pack(new Array(size));
    }

    jsvalCreateFloat=(i)=>{
        return this.pack(i);
    }

    jsvalCreateInt=(i)=>{
        return this.pack(i);
    }

    jsvalSetPropJsval=(oid, propid, valid)=>{
        let o=this.unpack(oid);
        let prop=this.unpack(propid);
        let val=this.unpack(valid);
        o[prop]=val;
    }

    jsvalGetPropJsval=(oid, propid)=>{
        let o=this.unpack(oid);
        let prop=this.unpack(propid);
        return this.pack(o[prop]);
    }

    jsvalCreateFuncStub=()=>{
        let id;
        let that=this;

        function fn(...args) {
            let thisid=that.pack(this);
            let aid=that.pack(args);
            let retid=that.instance.exports.jsvalCallNative(id,thisid,aid);
            return that.unpack(retid);
        }

        id=this.pack(fn);

        return id;
    }

    jsvalCreateClassStub = () => {
        let id;
        let that = this;

        function C(...args) {
            let thisid = that.pack(this);
            //console.log("created instance=",thisid," classid=",id);
            let aid = that.pack(args);
            let retid = that.instance.exports.jsvalCallNative(id, thisid, aid);
            let ret = that.unpack(retid);

            // JS constructor semantics:
            if (ret !== null && (typeof ret === "object" || typeof ret === "function")) {
                return ret;
            }

            return this;
        }

        let o={};
        C.prototype=o; //{__classId: id};
        id=this.pack(C);
        o.__classId=id;

        return id;
    };

    jsvalGetInt=(oid)=>{
        return this.unpack(oid);
    }

    jsvalGetFloat=(oid)=>{
        return this.unpack(oid);
    }

    jsvalReadString=(id, dest)=>{
        let o=this.unpack(id);
        let bytes=new TextEncoder().encode(o);
        let mem=new Uint8Array(this.instance.exports.memory.buffer);
        mem.set(bytes,dest);
        mem[dest+bytes.length]=0;

        return dest;
    }
}

export async function loadJsvalWasm({url, initFunction}) {
    let jsvalWasmModule=new JsvalWasmModule({url, initFunction});
    return await jsvalWasmModule.load();
}