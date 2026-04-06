import {autoIndent} from "../utils/auto-indent.js";
import {isPrimitiveType} from "./peabind-idl.js";

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

        else if (isPrimitiveType(func.return.type))
            return `return (${call});`;

        else 
            return `return (${this.prefix}getRegistryObject(${call},${func.return.type}));`;
    }

    generateJsFunctionDeclArgList(func) {
        return func.args.map((arg,i)=>`a${i}`).join(",");
    }

    generateJsFunctionCallArgList(func) {
        return func.args.map((arg,i)=>{
            if (isPrimitiveType(arg.type))
                return `a${i}`;

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

    generateJsSource() {
        return autoIndent(`
            let ${this.prefix}registry=new Map();

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
                }
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