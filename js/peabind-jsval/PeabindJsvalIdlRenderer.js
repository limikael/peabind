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
            #include "peabind-priv.h"
            #include "jsval-util.h"

            PeabindJsval *${this.prefix}context=nullptr;
            PeabindJsval *global_context=nullptr;

            //std::vector<Opaque*> opaques;
            //std::vector<Listener*> listeners;
            JSVAL promiseClassId;

            ${this.getClassRenderers().map(c=>c.generateClassId()).join("\n")}
            ${this.getFunctionRenderers().map(f=>f.generateDef()).join("\n")}
            ${this.getClassRenderers().map(c=>c.generateDef()).join("\n")}

            extern "C" void ${this.prefix}initmod(JSVAL mod) {
                assert(!${this.prefix}context);
                ${this.prefix}context=new PeabindJsval();
                global_context=${this.prefix}context;
                ${symbolRegs?`
                    promiseClassId=jsvalCreateClass(Promise_constructor);
                    jsvalSetClassFinalizer(promiseClassId,Promise_finalizer);
                    jsvalSetProp(mod,"PeabindPromise",promiseClassId);
                    jsvalSetProtoProp(promiseClassId,"then",jsvalCreateFunc(Promise_then));
                    jsvalSetProtoProp(promiseClassId,"catch",jsvalCreateFunc(Promise_catch));
                    ${this.getFunctionRenderers().map(f=>f.generateReg()).join("\n")}
                    ${this.getClassRenderers().map(c=>c.generateReg()).join("\n")}
                `:""}
            }

            extern "C" void ${this.prefix}exitmod() {
                assert(${this.prefix}context);
                printf("exitmod...\\n");

                ${this.prefix}context->clearListeners();

                delete(${this.prefix}context);
                ${this.prefix}context=nullptr;
            }

            extern "C" int ${this.prefix}get_num_objects() {
                return global_context->opaques.size();
            }

            extern "C" int ${this.prefix}get_num_listeners() {
                return global_context->listeners.size();
            }
        `); 
    }
}
