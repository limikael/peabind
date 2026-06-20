import {idlGetClass} from "../idl/peabind-idl.js";
import {autoIndent, ifdefWrap} from "../utils/lang-util.js";
import IdlRenderer from "../idl/IdlRenderer.js";
import PeabindJsvalFunctionRenderer from "./PeabindJsvalFunctionRenderer.js";

export default class PeabindJsvalIdlRenderer extends IdlRenderer {
    constructor(options) {
        super({
            ...options,
            functionRendererClass: PeabindJsvalFunctionRenderer,
        });
    }

    generateEventOnDef(event) {
        let argDecl=event.args.map((a,i)=>this.tr(a).nativeParam(`a${i}`)).join(",");

        return `
            if (eventName=="${event.name}") {
                JSVAL_REF cbRef=jsvalRefCreate(cbVal);
                int handle=instance->${event.dispatcher}.on([cbRef](${argDecl}){
                    JSVAL params[${event.args.length}];
                    ${event.args.map((a,i)=>`
                        ${this.tr(a).pack(`params[${i}]`,`a${i}`)}
                    `).join("\n")}
                    //Serial.printf("will call handle\\n");
                    //printf("will call...\\n");
                    JSVAL res=jsvalCall(jsvalRefGetValue(cbRef),jsvalUndefined(),${event.args.length},params);
                    if (jsvalHasException()) {
                        //std::string s=jsvalCatchExceptionStdString();
                        //Serial.printf("ev err: %s\\n",s.c_str());
                    }
                    jsvalFree(res);

                    ${event.args.map((a,i)=>`
                        ${this.tr(a).cleanup(`params[${i}]`)}
                    `).join("\n")}

                    //Serial.printf("called\\n");
                });

                Dispatcher<>* d=(Dispatcher<>*)&(instance->${event.dispatcher});
                Listener *listener=new Listener(d,handle);
                listeners.push_back(listener);
                instance->${event.dispatcher}.setIdInt(handle,cbId);
                instance->${event.dispatcher}.setDestructor(handle,[cbRef,listener](){
                    removeListener(listener);
                    jsvalRefFree(cbRef);
                });
            }
        `
    }

    generateEventOffDef(event) {
        return `
            if (eventName=="${event.name}") {
                int handle=instance->${event.dispatcher}.getHandleByIdInt(cbId);
                instance->${event.dispatcher}.off(handle);
            }
        `
    }

    generateEventDefs(cls) {
        if (!cls.events.length)
            return "";

        return `
            static JSVAL ${this.prefix}${cls.name}_on(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=2)
                    return jsvalThrow("worng arg count for on");

                std::shared_ptr<${this.tr(cls.name).getTemplateParam()}> instance=unpack<${this.tr(cls.name).getTemplateParam()}>(thisobj,${this.prefix}${cls.name}_id);
                std::string eventName=jsvalToStdString(argv[0]);
                JSVAL cbVal=argv[1];
                JSVAL_ID cbId=jsvalGetObjectId(cbVal);
                ${cls.events.map(event=>this.generateEventOnDef(event)).join("\n")}
                return jsvalUndefined();
            }

            static JSVAL ${this.prefix}${cls.name}_off(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=2)
                    return jsvalThrow("worng arg count for off");

                std::shared_ptr<${this.tr(cls.name).getTemplateParam()}> instance=unpack<${this.tr(cls.name).getTemplateParam()}>(thisobj,${this.prefix}${cls.name}_id);
                std::string eventName=jsvalToStdString(argv[0]);
                JSVAL cbVal=argv[1];
                JSVAL_ID cbId=jsvalGetObjectId(cbVal);
                ${cls.events.map(event=>this.generateEventOffDef(event)).join("\n")}
                return jsvalUndefined();
            }
        `
    }

    generateClassDef(cls) {
        let params=cls.ctorArgs.map((a,i)=>`a${i}`).join(",");
        let ctor;

        if (cls.constructible) {
            ctor=`
                static JSVAL ${this.prefix}${cls.name}_constructor(JSVAL thisobj, int argc, JSVAL *argv) {
                    if (argc!=${cls.ctorArgs.length}) {
                        Opaque *opaque=new Opaque(nullptr,thisobj);
                        opaques.push_back(opaque);
                        jsvalSetOpaque(thisobj,opaque);
                        return jsvalThrow("wrong ctor arg count");
                    }
                    ${cls.ctorArgs.map((a,i)=>this.tr(a).nativeDecl(`a${i}`)).join("\n")}
                    ${cls.ctorArgs.map((a,i)=>this.tr(a).unpack(`a${i}`,`argv[${i}]`)).join("\n")}
                    auto instance=std::make_shared<${this.cr(cls.name).getExtClassName()}>(${params});
                    Opaque *opaque=new Opaque(instance,thisobj);
                    opaques.push_back(opaque);
                    jsvalSetOpaque(thisobj,opaque);
                    return thisobj;
                }
            `;
        }

        else {
            ctor=`
                static JSVAL ${this.prefix}${cls.name}_constructor(JSVAL thisobj, int argc, JSVAL *argv) {
                    Opaque *opaque=new Opaque(nullptr,thisobj);
                    opaques.push_back(opaque);
                    jsvalSetOpaque(thisobj,opaque);
                    return jsvalThrow(\"private constructor\");
                }
            `;
        }

        return ifdefWrap(cls.ifdef,`
            ${ctor}

            static void ${this.prefix}${cls.name}_finalizer(JSVAL thisobj) {
                //Serial.printf("dtor...\\n");
                Opaque *opaque=(Opaque *)jsvalGetOpaque(thisobj);
                auto it = std::find(opaques.begin(), opaques.end(), opaque);
                assert(it != opaques.end());
                opaques.erase(it);
                delete opaque;
            }

            ${""/*this.getClassMethods(cls).map(m=>this.generateFunctionDef(m)).join("\n")*/}
            ${this.getClassMethods(cls).map(m=>this.fr(m).generateDef()).join("\n")}

            ${this.generateEventDefs(cls)}
        `);
    }

    generateClassId(cls) {
        return `
            JSVAL ${this.prefix}${cls.name}_id;
        `;
    }

    getClassMethods(cls) {
        let hierarcyName=cls.name;
        let methods=[];

        while (hierarcyName) {
            methods.push(...idlGetClass(this.idl,hierarcyName).methods);
            hierarcyName=idlGetClass(this.idl,hierarcyName).extends;
        }

        return methods.map(m=>{
            m=structuredClone(m);
            m.className=cls.name;
            return m;
        });
    }

    generateClassReg(cls) {
        return ifdefWrap(cls.ifdef,`
            ${this.prefix}${cls.name}_id=jsvalCreateClass(${this.prefix}${cls.name}_constructor);
            jsvalSetClassFinalizer(${this.prefix}${cls.name}_id,${this.prefix}${cls.name}_finalizer);
            jsvalSetProp(mod,"${cls.name}",${this.prefix}${cls.name}_id);

            ${this.getClassMethods(cls).map(m=>this.fr(m).generateReg()).join("\n")}

            ${cls.events.length?`
                jsvalSetProtoProp(${this.prefix}${cls.name}_id,"on",jsvalCreateFunc(${this.prefix}${cls.name}_on));
                jsvalSetProtoProp(${this.prefix}${cls.name}_id,"off",jsvalCreateFunc(${this.prefix}${cls.name}_off));
            `:""}

            ${Object.keys(cls.const).map(c=>`
                jsvalSetProp(${this.prefix}${cls.name}_id,"${c}",jsvalCreateInt(${cls.const[c]}));
            `).join("\n")}
        `);
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

            ${this.idl.classes.map(c=>this.generateClassId(c)).join("\n")}
            ${""/*this.idl.functions.map(f=>this.generateFunctionDef(f)).join("\n")*/}
            ${this.idl.functions.map(f=>this.fr(f).generateDef()).join("\n")}
            ${this.idl.classes.map(c=>this.generateClassDef(c)).join("\n")}

            extern "C" void ${this.prefix}initmod(JSVAL mod) {
                ${symbolRegs?`
                    promiseClassId=jsvalCreateClass(Promise_constructor);
                    jsvalSetClassFinalizer(promiseClassId,Promise_finalizer);
                    jsvalSetProp(mod,"PeabindPromise",promiseClassId);
                    jsvalSetProtoProp(promiseClassId,"then",jsvalCreateFunc(Promise_then));
                    jsvalSetProtoProp(promiseClassId,"catch",jsvalCreateFunc(Promise_catch));
                    ${this.idl.functions.map(f=>this.fr(f).generateReg()).join("\n")}
                    ${this.idl.classes.map(c=>this.generateClassReg(c)).join("\n")}
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
