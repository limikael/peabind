import {autoIndent} from "../utils/lang-util.js";
import {isPrimitiveType, idlGetClass} from "./peabind-idl.js";

class PeabindjsBuilder {
	constructor({idl, prefix, mod, exports}) {
		this.idl=idl;
		this.prefix=prefix;
		this.mod=mod;
		this.exports=exports;
	}

    generateJsFunctionReturn(func, call) {
        if (func.return.type=="void")
            return `${call};`;

        else if (["int","float"].includes(func.return.type))
            return `return (${call});`;

        if (!idlGetClass(this.idl,func.return.type))
            throw new Error("Unknown type: "+func.return.type);

        return `return (${this.prefix}getRegistryObject(${call},${func.return.type}));`;
    }

    generateJsFunctionDeclArgList(func) {
        return func.args.map((arg,i)=>`a${i}`).join(",");
    }

    generateJsFunctionCallArgList(func) {
        return func.args.map((arg,i)=>{
            if (["int","float"].includes(arg.type))
                return `a${i}`;

            if (!idlGetClass(this.idl,arg.type))
                throw new Error("Unknown type: "+arg.type);

            return `a${i}._handle`;
        }).join(",");
    }

    getModPrefix() {
    	if (this.mod)
    		return `${this.mod}.${this.prefix}`;

    	return `${this.prefix}`;
    }

    generateJsFunction(func,{cls}={}) {
        let declArgs=this.generateJsFunctionDeclArgList(func);
        let callArgs=this.generateJsFunctionCallArgList(func);

        let signature,call;

        if (cls) {
            signature=`${func.name}(${declArgs})`;
            call=`${this.getModPrefix()}${cls.name}_${func.name}(this._handle,${callArgs})`;
        }

        else {
            signature=`${this.exports?"export":""} function ${func.name}(${declArgs})`;
            call=`${this.getModPrefix()}${func.name}(${callArgs})`;
        }

        return `
            ${signature} {
                ${this.generateJsFunctionReturn(func,call)}
            }
        `;
    }

    generateJsClassEvents(cls) {
        if (!cls.events.length)
            return;

        return `
            on(ev, fn) {
                let cbId=${this.prefix}registerCallback(fn);
                switch (ev) {
                    ${cls.events.map(ev=>`
                        case "${ev.name}":
                        ${this.getModPrefix()}${cls.name}_on_${ev.name}(this._handle,cbId);
                        break;
                    `).join("\n")}

                    default:
                        throw new Error("Unknown event: "+ev);
                }
            }

            off(ev, fn) {

            }
        `
    }

    generateJsCallbackReceiver(ev, {cls}) {
        let decl=ev.args.map((arg,i)=>`a${i}`).join(",");
        let call=ev.args.map((arg,i)=>{
            if (["int","float"].includes(arg.type))
                return `a${i}`;

            if (!idlGetClass(this.idl,arg.type))
                throw new Error("Unknown type: "+arg.type);

            return `${this.prefix}getRegistryObject(a${i},${arg.type})`;
        }).join(",");

        return `
            globalThis.${this.prefix}handle_${cls.name}_${ev.name}=(cbId,${decl})=>{
                ${this.prefix}getCallback(cbId)(${call});
            }
        `;
    }

    generateJsSource() {
        return autoIndent(`
            let ${this.prefix}registry=new Map();
            let ${this.prefix}callbackRegistry=new Map();
            let ${this.prefix}reverseCallbackRegistry=new Map();
            let ${this.prefix}nextCallbackId=100;

            function ${this.prefix}registerCallback(fn) {
                let cbId=${this.prefix}nextCallbackId++;
                ${this.prefix}callbackRegistry.set(cbId,fn);
                ${this.prefix}reverseCallbackRegistry.set(fn,cbId);
                return cbId;
            }

            function ${this.prefix}getCallback(cbId) {
                return ${this.prefix}callbackRegistry.get(cbId);
            }

            function ${this.prefix}getRegistryObject(id,cls) {
                if (!${this.prefix}registry.get(id)) {
                    let o=Object.create(cls.prototype);
                    o._handle=id;
                    ${this.prefix}registry.set(id,o);
                }

                return ${this.prefix}registry.get(id);
            }

            ${this.idl.functions.map(func=>this.generateJsFunction(func)).join("\n")}

            ${this.idl.classes.map(cls=>`
                ${this.exports?"export":""} class ${cls.name} {
                    constructor() {
                        this._handle=${this.getModPrefix()}${cls.name}_new();
                        ${this.prefix}registry.set(this._handle,this);
                    }

                    destroy() {
                        ${this.getModPrefix()}destroy(this._handle);
                        this._handle=null;
                    }

                    ${cls.methods.map(method=>this.generateJsFunction(method,{cls})).join("\n")}
                    ${this.generateJsClassEvents(cls)}
                }

                ${cls.events.map(event=>this.generateJsCallbackReceiver(event,{cls})).join("\n")}
            `).join("\n")}
        `);
    }
}

export function peabindGenerateJs({idl, prefix, mod, exports}) {
	let builder=new PeabindjsBuilder({idl, prefix, mod, exports});
	return builder.generateJsSource();
}

export function peabindGenerateCpp({idl, prefix}) {
	return autoIndent(`
        ${idl.include.map(i=>`#include "${i}"`).join("\n")}
        #include <map>

        static std::map<int, std::shared_ptr<void>> registry;
        static std::map<void*, int> reverseRegistry;
        static int registryIdCounter = 1;

        template<typename T>
        static int store(std::shared_ptr<T> obj) {
            void* key = obj.get();
            auto it = reverseRegistry.find(key);
            if (it != reverseRegistry.end())
                return it->second;

            int id = registryIdCounter++;
            registry[id] = obj;
            reverseRegistry[key] = id;
            return id;
        }

        static void destroy(int id) {
            auto it = registry.find(id);
            if (it == registry.end()) return;
            void* key = it->second.get();
            reverseRegistry.erase(key);
            registry.erase(it);
        }
    `);
}