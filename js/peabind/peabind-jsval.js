import {createTypeStrategy} from "./peabind-jsval-types.js";
import {peabindNormalize} from "./peabind-idl.js";
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
		return createTypeStrategy(typeDef, {
			idl: this.idl, 
			prefix: this.prefix
		});
	}

	generateFunctionDef(func) {
        let name,prelude,callTarget,argStart;
        if (func.className) {
            name=`${this.prefix}${func.className}_${func.name}`;
            prelude=`
                Opaque *opaque=(Opaque *)jsvalGetOpaque(thisobj);
                assert(opaque!=NULL);
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
            static JSVAL ${name}(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=${func.args.length}) return jsvalUndefined();
                ${prelude}
                ${func.args.map((a,i)=>this.ts(a).nativeDecl(`a${i}`)).join("\n")}
                ${func.args.map((a,i)=>this.ts(a).unpack(`a${i}`,`argv[${i}]`)).join("\n")}
                ${call}
            }
        `;
	}

	generateFunctionReg(func) {
        if (func.className) {
            return `
                jsvalSetProtoProp(${this.prefix}${func.className}_id,"${func.name}",jsvalCreateFunc(${this.prefix}${func.className}_${func.name}));
            `;
        }

        else {
            return `
            	jsvalSetProp(mod,"${func.name}",jsvalCreateFunc(${this.prefix}${func.name}));
            `;
        }

	}

    generateEventOnDef(event) {
        let argDecl=event.args.map((a,i)=>this.ts(a).nativeParam(`a${i}`)).join(",");

        return `
            if (eventName=="${event.name}") {
                JSVAL cbCopy=jsvalDup(cbVal);
                int handle=instance->${event.name}.on([cbCopy](${argDecl}){
                    JSVAL params[${event.args.length}];
                    ${event.args.map((a,i)=>`
                        ${this.ts(a).pack(`params[${i}]`,`a${i}`)}
                    `).join("\n")}
                    //Serial.printf("will call handle\\n");
                    JSVAL res=jsvalCall(cbCopy,jsvalUndefined(),${event.args.length},params);
                    if (jsvalHasException()) {
                        std::string s=jsvalCatchExceptionStdString();
                        //Serial.printf("ev err: %s\\n",s.c_str());
                    }
                    jsvalFree(res);

                    ${event.args.map((a,i)=>`
                        ${this.ts(a).cleanup(`params[${i}]`)}
                    `).join("\n")}

                    //Serial.printf("called\\n");
                });

                Dispatcher<>* d=(Dispatcher<>*)&(instance->${event.name});
                Listener *listener=new Listener(d,handle);
                listeners.push_back(listener);
                instance->${event.name}.setIdInt(handle,cbId);
                instance->${event.name}.setDestructor(handle,[cbCopy,listener](){
                    auto it = std::remove(listeners.begin(), listeners.end(), listener);
                    if (it != listeners.end()) {
                        listeners.erase(it, listeners.end());
                        delete listener;
                    }

                    jsvalFree(cbCopy);
                });
            }
        `
    }

    generateEventOffDef(event) {
        return `
            if (eventName=="${event.name}") {
                int handle=instance->${event.name}.getHandleByIdInt(cbId);
                instance->${event.name}.off(handle);
            }
        `
    }

    generateEventDefs(cls) {
        if (!cls.events.length)
            return "";

        return `
            static JSVAL ${this.prefix}${cls.name}_on(JSVAL thisobj, int argc, JSVAL *argv) {
                std::shared_ptr<${cls.name}> instance=unpack<${cls.name}>(thisobj);
                std::string eventName=jsvalToStdString(argv[0]);
                JSVAL cbVal=argv[1];
                JSVAL_ID cbId=jsvalGetObjectId(cbVal);
                ${cls.events.map(event=>this.generateEventOnDef(event)).join("\n")}
                return jsvalUndefined();
            }

            static JSVAL ${this.prefix}${cls.name}_off(JSVAL thisobj, int argc, JSVAL *argv) {
                std::shared_ptr<${cls.name}> instance=unpack<${cls.name}>(thisobj);
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

        return `
            static JSVAL ${this.prefix}${cls.name}_constructor(JSVAL thisobj, int argc, JSVAL *argv) {
                if (argc!=${cls.ctorArgs.length}) return jsvalUndefined();
                ${cls.ctorArgs.map((a,i)=>this.ts(a).nativeDecl(`a${i}`)).join("\n")}
                ${cls.ctorArgs.map((a,i)=>this.ts(a).unpack(`a${i}`,`argv[${i}]`)).join("\n")}
                auto instance=std::make_shared<${cls.name}>(${params});
                jsvalByPointer[instance.get()]=thisobj;
                Opaque *opaque=new Opaque(instance);
                jsvalSetOpaque(thisobj,opaque);
                //Serial.printf("ctor...\\n");
                return thisobj;
            }

            static void ${this.prefix}${cls.name}_finalizer(JSVAL thisobj) {
                //Serial.printf("dtor...\\n");
                Opaque *opaque=(Opaque *)jsvalGetOpaque(thisobj);
                jsvalByPointer.erase(opaque->instance.get());
                delete opaque;
            }

            ${cls.methods.map(m=>this.generateFunctionDef(m)).join("\n")}

            ${this.generateEventDefs(cls)}
        `;
    }

    generateClassId(cls) {
        return `
            JSVAL ${this.prefix}${cls.name}_id;
        `;
    }

    generateClassReg(cls) {
        return `
            ${this.prefix}${cls.name}_id=jsvalCreateClass(${this.prefix}${cls.name}_constructor);
            jsvalSetClassFinalizer(${this.prefix}${cls.name}_id,${this.prefix}${cls.name}_finalizer);
            jsvalSetProp(mod,"${cls.name}",${this.prefix}${cls.name}_id);

            ${cls.methods.map(m=>this.generateFunctionReg(m)).join("\n")}

            ${cls.events.length?`
                jsvalSetProtoProp(${this.prefix}${cls.name}_id,"on",jsvalCreateFunc(${this.prefix}${cls.name}_on));
                jsvalSetProtoProp(${this.prefix}${cls.name}_id,"off",jsvalCreateFunc(${this.prefix}${cls.name}_off));
            `:""}
        `;
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
                Opaque(std::shared_ptr<void> instance_) { instance=instance_; };
                std::shared_ptr<void> instance;
            };

            static std::map<void *,JSVAL> jsvalByPointer;

            template<typename T>
            static std::shared_ptr<T> unpack(JSVAL v) {
                Opaque *opaque=(Opaque *)jsvalGetOpaque(v);
                std::shared_ptr<T> p=std::static_pointer_cast<T>(opaque->instance);
                return p;
            }

            template<typename T>
            static JSVAL pack(std::shared_ptr<T> instance, JSVAL classId) {
                if (instance==nullptr)
                    return jsvalNull();

                // MAYBE... shoud jsvalDup here... to increase the ref...
                if (jsvalByPointer.find(instance.get())!=jsvalByPointer.end())
                    return jsvalByPointer[instance.get()];

                JSVAL val=jsvalCreateObject(classId);
                jsvalByPointer[instance.get()]=val;
                Opaque *opaque=new Opaque(instance);
                jsvalSetOpaque(val,opaque);

                return val;
            }

            class Listener {
            public:
                Listener(Dispatcher<> *dispatcher_, JSVAL_ID id_) {
                    dispatcher=dispatcher_;
                    id=id_;
                }

                Dispatcher<> *dispatcher;
                JSVAL_ID id;
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

                while (listeners.size()) {
                    //printf("remove listeners size: %d\\n",listeners.size());
                    listeners[0]->dispatcher->off(listeners[0]->id);
                }

                //jsvalQuickjsRunGc();
                //printf("listeners size after: %d\\n",listeners.size());
                //Serial.printf("exitmod.. pointers: %d\\n",jsvalByPointer.size());
            }

            extern "C" int ${this.prefix}get_num_objects() {
                return jsvalByPointer.size();
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