import {autoIndent} from "../utils/lang-util.js";
import {isPrimitiveType, idlGetClass} from "./peabind-idl.js";

class PeabindjsBuilder {
	constructor({idl, prefix, mod, exports, typeStrategyFactory}) {
		this.idl=idl;
		this.prefix=prefix;
		this.mod=mod;
		this.exports=exports;
        this.typeStrategyFactory=typeStrategyFactory;
	}

    ts(typeDef) {
        return this.typeStrategyFactory(typeDef);
    }

    getModPrefix() {
    	if (this.mod)
    		return `${this.mod}.${this.prefix}`;

    	return `${this.prefix}`;
    }

    generateJsFunction(func,{cls}={}) {
        let declArgs=func.args.map((arg,i)=>`a${i}`);
        let callArgs=func.args.map((arg,i)=>`p${i}`);

        let signature,callTarget;
        if (cls) {
            signature=`${func.name}`;
            callArgs.unshift(`this._handle`);
            callTarget=`${this.getModPrefix()}${cls.name}_${func.name}`;
        }

        else {
            signature=`${this.exports?"export":""} function ${func.name}`;
            callTarget=`${this.getModPrefix()}${func.name}`;
        }

        let call;
        if (func.return.type=="void") {
            call=`
                ${callTarget}(${callArgs.join(",")});
            `;
        }

        else {
            call=`
                let retval,ret=${callTarget}(${callArgs.join(",")});
                ${this.ts(func.return).jsUnpack(`retval`,`ret`)}
                return retval;
            `;
        }

        return `
            ${signature}(${declArgs.join(",")}) {
                ${func.args.map((arg,i)=>`
                    ${this.ts(arg).jsDecl(`p${i}`)}
                    ${this.ts(arg).jsPack(`p${i}`,`a${i}`)}
                `).join("\n")}
                ${call}
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
        let call=ev.args.map((arg,i)=>`c${i}`).join(",");

        return `
            globalThis.${this.prefix}handle_${cls.name}_${ev.name}=(cbId,${decl})=>{
                ${ev.args.map((arg,i)=>`
                    ${this.ts(arg).jsDecl(`c${i}`)}
                    ${this.ts(arg).jsUnpack(`c${i}`,`a${i}`)}
                `).join("\n")}
                ${this.prefix}getCallback(cbId)(${call});
            }
        `;
    }

    generateJsSource() {
        return autoIndent(`
            let ${this.prefix}registry=new Map();
            let ${this.prefix}finalizationRegistry=new FinalizationRegistry(handle=>{
                ${this.getModPrefix()}destroy(handle);
                ${this.prefix}registry.delete(handle);
            });

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
                if (!${this.prefix}registry.get(id) ||
                        !${this.prefix}registry.get(id).deref()) {
                    let o=Object.create(cls.prototype);
                    o._handle=id;
                    ${this.prefix}registry.set(id,new WeakRef(o));
                    ${this.prefix}finalizationRegistry.register(o,o._handle);
                }

                return ${this.prefix}registry.get(id).deref();
            }

            ${this.idl.functions.map(func=>this.generateJsFunction(func)).join("\n")}

            ${this.idl.classes.map(cls=>`
                ${this.exports?"export":""} class ${cls.name} {
                    constructor() {
                        this._handle=${this.getModPrefix()}${cls.name}_new();
                        ${this.prefix}registry.set(this._handle,new WeakRef(this));
                        ${this.prefix}finalizationRegistry.register(this,this._handle);
                    }

                    ${cls.methods.map(method=>this.generateJsFunction(method,{cls})).join("\n")}
                    ${this.generateJsClassEvents(cls)}
                }

                ${cls.events.map(event=>this.generateJsCallbackReceiver(event,{cls})).join("\n")}
            `).join("\n")}
        `);
    }
}

export function peabindGenerateJs({idl, prefix, mod, exports, typeStrategyFactory}) {
	let builder=new PeabindjsBuilder({idl, prefix, mod, exports, typeStrategyFactory});
	return builder.generateJsSource();
}

