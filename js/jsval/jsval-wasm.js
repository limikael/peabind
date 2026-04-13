import {loadWasmInstance} from "../utils/wasm-util.js";

class JsvalWasmModule {
    constructor({url}) {
        this.objectById=new Map();
        this.idByObject=new Map();
        this.nextRegistryId=1;
        this.url=url;
    }

    async load() {
        this.instance=await loadWasmInstance({
            url: this.url,
            env: {
                jsvalGetSize: this.jsvalGetSize,
                jsvalGetItemAt: this.jsvalGetItemAt,
                jsvalCreateFuncStub: this.jsvalCreateFuncStub,
                jsvalCall: this.jsvalCall,
                jsvalCreateString: this.jsvalCreateString,
                jsvalSetPropJsval: this.jsvalSetPropJsval,
                jsvalGetInt: this.jsvalGetInt,
                jsvalGetModule: this.jsvalGetModule,
                jsvalCreateInt: this.jsvalCreateInt,
            }
        });

        this.mod={...this.instance.exports};
    }

    pack=(o)=>{
        if (this.idByObject.has(o))
            return this.idByObject.get(o);

        let id=this.nextRegistryId++;
        this.objectById.set(id,o);
        this.idByObject.set(o,id);

        return id;
    }

    unpack=(id)=>{
        return this.objectById.get(id);
    }

    jsvalGetModule=()=>{
        return this.pack(this.mod);
    }

    jsvalGetSize=(id)=>{
        let o=this.objectById.get(id);

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

    jsvalCall=(fid, thisid, argid)=>{
        let fn=this.unpack(fid);
        let thisobj=this.unpack(thisid);
        let arg=this.unpack(argid);
        let ret=fn.apply(thisobj,arg);
        return this.pack(ret);
    }

    jsvalCreateString=(ptr, size)=>{
        let bytes=new Uint8Array(this.instance.exports.memory.buffer, ptr, size);
        let s=new TextDecoder("utf-8").decode(bytes);
        return this.pack(s);
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

    jsvalGetInt=(oid)=>{
        return this.unpack(oid);
    }
}

export async function loadJsvalWasm({url}) {
    let mod=new JsvalWasmModule({url});
    await mod.load();

    return mod.mod;
}