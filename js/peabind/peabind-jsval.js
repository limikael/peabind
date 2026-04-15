import {createTypeStrategy} from "./peabind-jsval-types.js";
import {peabindNormalize} from "./peabind-idl.js";
import {autoIndent} from "../utils/lang-util.js";

class PeabindJsvalBuilder {
	constructor({idl, projectName, prefix}) {
		this.idl=peabindNormalize(idl);
		this.projectName=projectName;
		this.prefix=prefix;

        if (!this.prefix)
            this.prefix=this.projectName.replaceAll(".","_")+"_";
	}

	ts(typeDef) {
		return createTypeStrategy(typeDef, {
			idl: this.idl, 
			prefix: this.prefix
		});
	}

	generateFunctionDef(func) {
        let name,prelude,callTarget,argStart;
        if (func.className) {
        	// FIX FIX FIX
            name=`${this.prefix}${func.className}_${func.name}`;
            prelude=`
                Opaque* opaque=(Opaque*)JS_GetOpaque(thisobj,${this.prefix}${func.className}_classid);
                std::shared_ptr<${func.className}> instance=std::static_pointer_cast<${func.className}>(opaque->instance);
            `;
            callTarget=`instance->${func.name}`;
        }

        else {
            name=`${this.prefix}${func.name}`;
            prelude="";
            callTarget=`${func.name}`;
        }

        let call;
        if (func.return.type=="void") {
            call=`
                ${callTarget}(${func.args.map((arg,i)=>`a${i}`).join(",")});
                return jsvalUndefined();
            `;
        }

        else {
            call=`
                ${this.ts(func.return).nativeDecl("ret")}
                ret=${callTarget}(${func.args.map((arg,i)=>`a${i}`).join(",")});
                ${this.ts(func.return).abiDecl("retval")}
                ${this.ts(func.return).pack("retval","ret")}
                return retval;
            `;
        }

        return `
            static JSVAL ${name}(JSVAL thisobj, JSVAL args) {
                if (jsvalGetSize(args)!=${func.args.length}) return jsvalThrow();
                ${prelude}
                ${func.args.map((a,i)=>this.ts(a).nativeDecl(`a${i}`)).join("\n")}
                ${func.args.map((a,i)=>this.ts(a).unpack(`a${i}`,`jsvalGetItemAt(args,${i})`)).join("\n")}
                ${call}
            }
        `;
	}

	generateFunctionReg(func) {
        if (func.className) {
            return `
                jsvalSetProtoProp(mod,"${func.name}",jsvalCreateFunc(${this.prefix}${func.className}_${func.name}));
            `;
        }

        else {
            return `
            	jsvalSetProp(mod,"${func.name}",jsvalCreateFunc(${this.prefix}${func.name}));
            `;
        }

	}

    generateSource() {
        return autoIndent(`
            #include "${this.projectName+".h"}"
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            #include <string>

            ${this.idl.functions.map(f=>this.generateFunctionDef(f)).join("\n")}
            ${this.idl.classes.map(c=>this.generateClassDef(c)).join("\n")}

            void ${this.prefix}init(JSVAL mod) {
                ${this.idl.functions.map(f=>this.generateFunctionReg(f)).join("\n")}
                ${this.idl.classes.map(c=>this.generateClassReg(c)).join("\n")}
            }
        `); 
    }
}

export function createPeabindJsvalBuilder({idl, projectName, prefix}) {
	return new PeabindJsvalBuilder({idl, projectName, prefix});
}