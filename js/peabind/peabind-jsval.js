import {createTypeStrategy} from "./peabind-jsval-types.js";
import {peabindNormalize, idlGetClass} from "./peabind-idl.js";
import {autoIndent} from "../utils/lang-util.js";

class PeabindJsvalBuilder {
	constructor({idl, projectName, prefix, include}) {
		this.idl=peabindNormalize(idl);
		this.projectName=projectName;
		this.prefix=prefix;
        this.include=include;
        if (!this.include)
            this.include=[];

        if (!this.prefix)
            this.prefix=this.projectName.replaceAll(".","_")+"_";
	}

	ts(typeDef) {
        if (typeof typeDef=="string")
            typeDef={type: typeDef};

		return createTypeStrategy(typeDef, {
			idl: this.idl, 
			prefix: this.prefix
		});
	}

	generateFunctionDef(func) {
        let name,prelude,callTarget,argStart;
        if (func.className) {
            if (func.static) {
                name=`${this.prefix}${func.className}_${func.name}`;
                prelude="";
                callTarget=`${this.getExtClassName(func.className)}::${func.name}`
            }

            else {
                name=`${this.prefix}${func.className}_${func.name}`;
                prelude=`
                    Opaque *opaque=(Opaque *)jsvalGetOpaque(thisobj);
                    assert(opaque!=NULL);
                    std::shared_ptr<${this.getExtClassName(func.className)}> instance=std::static_pointer_cast<${this.getExtClassName(func.className)}>(opaque->instance);
                `;
                callTarget=`instance->${func.name}`;
            }
        }

        else {
            name=`${this.prefix}${func.name}`;
            prelude="";
            callTarget=`${func.name}`;
            if (func.namespace)
                callTarget=`${func.namespace}::${func.name}`
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

        return this.ifdefWrap(func.ifdef,`
            static JSVAL ${name}(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=${func.args.length}) return jsvalThrow(\"wrong arg count\");
                ${prelude}
                ${func.args.map((a,i)=>this.ts(a).nativeDecl(`a${i}`)).join("\n")}
                ${func.args.map((a,i)=>this.ts(a).unpack(`a${i}`,`argv[${i}]`)).join("\n")}
                ${call}
            }
        `);
	}

    ifdefWrap(ifdef, content) {
        if (!ifdef)
            return content;

        return `
            #ifdef ${ifdef}
            ${content}
            #endif
        `
    }

	generateFunctionReg(func) {
        if (func.className) {
            if (func.static) {
                return this.ifdefWrap(func.ifdef,`
                    jsvalSetProp(${this.prefix}${func.className}_id,"${func.name}",jsvalCreateFunc(${this.prefix}${func.className}_${func.name}));
                `);
            }

            else {
                return this.ifdefWrap(func.ifdef,`
                    jsvalSetProtoProp(${this.prefix}${func.className}_id,"${func.name}",jsvalCreateFunc(${this.prefix}${func.className}_${func.name}));
                `);
            }
        }

        else {
            return this.ifdefWrap(func.ifdef,`
            	jsvalSetProp(mod,"${func.name}",jsvalCreateFunc(${this.prefix}${func.name}));
            `);
        }

	}

    generateEventOnDef(event) {
        let argDecl=event.args.map((a,i)=>this.ts(a).nativeParam(`a${i}`)).join(",");

        return `
            if (eventName=="${event.name}") {
                JSVAL cbCopy=jsvalDup(cbVal);
                int handle=instance->${event.dispatcher}.on([cbCopy](${argDecl}){
                    JSVAL params[${event.args.length}];
                    ${event.args.map((a,i)=>`
                        ${this.ts(a).pack(`params[${i}]`,`a${i}`)}
                    `).join("\n")}
                    //Serial.printf("will call handle\\n");
                    JSVAL res=jsvalCall(cbCopy,jsvalUndefined(),${event.args.length},params);
                    if (jsvalHasException()) {
                        //std::string s=jsvalCatchExceptionStdString();
                        //Serial.printf("ev err: %s\\n",s.c_str());
                    }
                    jsvalFree(res);

                    ${event.args.map((a,i)=>`
                        ${this.ts(a).cleanup(`params[${i}]`)}
                    `).join("\n")}

                    //Serial.printf("called\\n");
                });

                Dispatcher<>* d=(Dispatcher<>*)&(instance->${event.dispatcher});
                Listener *listener=new Listener(d,handle);
                listeners.push_back(listener);
                instance->${event.dispatcher}.setIdInt(handle,cbId);
                instance->${event.dispatcher}.setDestructor(handle,[cbCopy,listener](){
                    //printf("listeer destr... weak exp=%d\\n",instanceWeak.expired());
                    auto it = std::remove(listeners.begin(), listeners.end(), listener);
                    assert(it!=listeners.end());

                    if (it != listeners.end()) {
                        listeners.erase(it, listeners.end());
                        delete listener;
                    }

                    else {
                        printf("listener not found!\\n");
                    }

                    jsvalFree(cbCopy);
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

                std::shared_ptr<${this.ts(cls.name).getTemplateParam()}> instance=unpack<${this.ts(cls.name).getTemplateParam()}>(thisobj,${this.prefix}${cls.name}_id);
                std::string eventName=jsvalToStdString(argv[0]);
                JSVAL cbVal=argv[1];
                JSVAL_ID cbId=jsvalGetObjectId(cbVal);
                ${cls.events.map(event=>this.generateEventOnDef(event)).join("\n")}
                return jsvalUndefined();
            }

            static JSVAL ${this.prefix}${cls.name}_off(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=2)
                    return jsvalThrow("worng arg count for off");

                std::shared_ptr<${this.ts(cls.name).getTemplateParam()}> instance=unpack<${this.ts(cls.name).getTemplateParam()}>(thisobj,${this.prefix}${cls.name}_id);
                std::string eventName=jsvalToStdString(argv[0]);
                JSVAL cbVal=argv[1];
                JSVAL_ID cbId=jsvalGetObjectId(cbVal);
                ${cls.events.map(event=>this.generateEventOffDef(event)).join("\n")}
                return jsvalUndefined();
            }
        `
    }

    getExtClassName(cls) {
        if (typeof cls=="string")
            cls=idlGetClass(this.idl,cls);

        if (!cls)
            throw new Error("Undef class: "+cls);

        let name=cls.name;
        if (cls.namespace)
            name=`${cls.namespace}::${cls.name}`;

        return name;
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
                    ${cls.ctorArgs.map((a,i)=>this.ts(a).nativeDecl(`a${i}`)).join("\n")}
                    ${cls.ctorArgs.map((a,i)=>this.ts(a).unpack(`a${i}`,`argv[${i}]`)).join("\n")}
                    auto instance=std::make_shared<${this.getExtClassName(cls.name)}>(${params});
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

        return this.ifdefWrap(cls.ifdef,`
            ${ctor}

            static void ${this.prefix}${cls.name}_finalizer(JSVAL thisobj) {
                //Serial.printf("dtor...\\n");
                Opaque *opaque=(Opaque *)jsvalGetOpaque(thisobj);
                auto it = std::find(opaques.begin(), opaques.end(), opaque);
                assert(it != opaques.end());
                opaques.erase(it);
                delete opaque;
            }

            ${this.getClassMethods(cls).map(m=>this.generateFunctionDef(m)).join("\n")}

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
            //${cls.methods.map(m=>this.generateFunctionReg(m)).join("\n")}

    generateClassReg(cls) {
        return this.ifdefWrap(cls.ifdef,`
            ${this.prefix}${cls.name}_id=jsvalCreateClass(${this.prefix}${cls.name}_constructor);
            jsvalSetClassFinalizer(${this.prefix}${cls.name}_id,${this.prefix}${cls.name}_finalizer);
            jsvalSetProp(mod,"${cls.name}",${this.prefix}${cls.name}_id);

            ${this.getClassMethods(cls).map(m=>this.generateFunctionReg(m)).join("\n")}

            ${cls.events.length?`
                jsvalSetProtoProp(${this.prefix}${cls.name}_id,"on",jsvalCreateFunc(${this.prefix}${cls.name}_on));
                jsvalSetProtoProp(${this.prefix}${cls.name}_id,"off",jsvalCreateFunc(${this.prefix}${cls.name}_off));
            `:""}
        `);
    }

    generateSource() {
        return autoIndent(`
            ${this.include.map(i=>`#include "${i}"`).join("\n")}
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            #include <string>
            #include <map>
            #include <memory>
            #include <algorithm>
            #include <cassert>
            #include "jsval-util.h"
            #include "peabind.h"

            class Opaque {
            public:
                Opaque(std::shared_ptr<void> instance_, JSVAL val_) { 
                    instance=instance_; 
                    val=val_;
                };

                std::shared_ptr<void> instance;
                JSVAL val;
            };

            static std::vector<Opaque*> opaques;

            template<typename T>
            static std::shared_ptr<T> unpack(JSVAL v, JSVAL classId) {
                if (!jsvalInstanceOf(v,classId))
                    return nullptr;

                Opaque *opaque=(Opaque *)jsvalGetOpaque(v);
                if (!opaque)
                    return nullptr;

                std::shared_ptr<T> p=std::static_pointer_cast<T>(opaque->instance);
                return p;
            }

            template<typename T>
            static JSVAL pack(std::shared_ptr<T> instance, JSVAL classId) {
                if (instance==nullptr)
                    return jsvalNull();

                // Causes a leak, dunno why...
                /*for (Opaque *o: opaques) {
                    if (o->instance.get()==instance.get()) {
                        printf("reusing...\\n");
                        JSVAL val=jsvalDup(o->val);
                        Opaque *opaque=new Opaque(instance,val);
                        opaques.push_back(opaque);
                        jsvalSetOpaque(val,opaque);
                        return val;
                    }
                }*/

                JSVAL val=jsvalCreateObject(classId);
                Opaque *opaque=new Opaque(instance,val);
                opaques.push_back(opaque);
                jsvalSetOpaque(val,opaque);
                return val;
            }

            class Listener {
            public:
                Listener(Dispatcher<> *dispatcher_, int handle_) {
                    dispatcher=dispatcher_;
                    handle=handle_;
                }

                Dispatcher<> *dispatcher;
                int handle;
            };

            static std::vector<Listener*> listeners;

            ${this.idl.classes.map(c=>this.generateClassId(c)).join("\n")}

            ${this.idl.functions.map(f=>this.generateFunctionDef(f)).join("\n")}
            ${this.idl.classes.map(c=>this.generateClassDef(c)).join("\n")}

            extern "C" void ${this.prefix}initmod(JSVAL mod) {
                ${this.idl.functions.map(f=>this.generateFunctionReg(f)).join("\n")}
                ${this.idl.classes.map(c=>this.generateClassReg(c)).join("\n")}
            }

            extern "C" void ${this.prefix}exitmod() {
                //printf("listeners size: %d\\n",listeners.size());
                //jsvalQuickjsRunGc();

                //printf("removing listeners...\\n");
                while (listeners.size()) {
                    //printf("remove listeners size: %d\\n",listeners.size());
                    listeners[0]->dispatcher->off(listeners[0]->handle);
                }
                //printf("done removing listeners...\\n");

                //jsvalQuickjsRunGc();
                //printf("listeners size after: %d\\n",listeners.size());
                //Serial.printf("exitmod.. pointers: %d\\n",jsvalByPointer.size());
            }

            extern "C" int ${this.prefix}get_num_objects() {
                return opaques.size();
            }

            extern "C" int ${this.prefix}get_num_listeners() {
                return listeners.size();
            }
        `); 
    }

    getSymbolNames() {
        return [
            ...this.idl.functions.map(f=>f.name),
            ...this.idl.classes.map(f=>f.name)
        ];
    }
}

export function createPeabindJsvalBuilder({idl, projectName, prefix, include}) {
	return new PeabindJsvalBuilder({idl, projectName, prefix, include});
}