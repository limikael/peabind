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
            #include "peabind-priv.h"
            #include "jsval-util.h"

            std::vector<Opaque*> opaques;
            std::vector<Listener*> listeners;
            JSVAL promiseClassId;

            ${this.getClassRenderers().map(c=>c.generateClassId()).join("\n")}
            ${this.getFunctionRenderers().map(f=>f.generateDef()).join("\n")}
            ${this.getClassRenderers().map(c=>c.generateDef()).join("\n")}

            extern "C" void ${this.prefix}initmod(JSVAL mod) {
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
                while (listeners.size()) {
                    //printf("remove listeners size: %d\\n",listeners.size());
                    listeners[0]->dispatcher->off(listeners[0]->handle);
                }
            }

            extern "C" int ${this.prefix}get_num_objects() {
                return opaques.size();
            }

            extern "C" int ${this.prefix}get_num_listeners() {
                return listeners.size();
            }
        `); 
    }
}
