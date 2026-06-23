import {idlGetClass} from "../idl/peabind-idl.js";
import {autoIndent, ifdefWrap} from "../utils/lang-util.js";
import IdlRenderer from "../idl/IdlRenderer.js";
import PeabindJsvalFunctionRenderer from "./PeabindJsvalFunctionRenderer.js";
import PeabindJsvalClassRenderer from "./PeabindJsvalClassRenderer.js";
import PeabindJsvalEventRenderer from "./PeabindJsvalEventRenderer.js";

export default class PeabindJsvalIdlRenderer extends IdlRenderer {
    constructor(options) {
        super({
            ...options,
            functionRendererClass: PeabindJsvalFunctionRenderer,
            classRendererClass: PeabindJsvalClassRenderer,
            eventRendererClass: PeabindJsvalEventRenderer
        });
    }

    generateSource({symbolRegs}={}) {
        if (symbolRegs===undefined)
            symbolRegs=true;

        return autoIndent(`
            ${this.include.map(i=>`#include "${i}"`).join("\n")}
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            #include "PeabindJsval.h"

            PeabindJsval *${this.prefix}context=nullptr;
            ${this.getClassRenderers().map(c=>c.generateClassId()).join("\n")}
            ${this.getFunctionRenderers().map(f=>f.generateDef()).join("\n")}
            ${this.getClassRenderers().map(c=>c.generateDef()).join("\n")}

            extern "C" void ${this.prefix}initmod(JSVAL mod) {
                assert(!${this.prefix}context);
                ${this.prefix}context=new PeabindJsval();
                ${symbolRegs?`
                    ${this.prefix}context->initPromiseClass(mod);
                    ${this.getFunctionRenderers().map(f=>f.generateReg()).join("\n")}
                    ${this.getClassRenderers().map(c=>c.generateReg()).join("\n")}
                `:""}
            }

            extern "C" void ${this.prefix}exitmod() {
                assert(${this.prefix}context);
                ${this.prefix}context->shutdown();
                delete(${this.prefix}context);
                ${this.prefix}context=nullptr;
            }

            extern "C" int ${this.prefix}get_num_objects() {
                if (!${this.prefix}context)
                    return 0;

                return ${this.prefix}context->opaques.size();
            }

            extern "C" int ${this.prefix}get_num_listeners() {
                if (!${this.prefix}context)
                    return 0;

                return ${this.prefix}context->listeners.size();
            }
        `); 
    }
}
