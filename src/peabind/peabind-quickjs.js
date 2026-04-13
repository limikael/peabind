import {peabindNormalize, idlGetClass} from "./peabind-idl.js";
import {DeclaredError} from "../utils/js-util.js";
import path from "path";
import fs from "fs";
import os from "os";
import {autoIndent, escapeCString} from "../utils/lang-util.js";
import {createTypeStrategy} from "./peabind-quickjs-types.js";

class PeabindQuickjsBuilder {
    constructor({idl, prefix, projectName}) {
        this.idl=idl;
        this.prefix=prefix;
        this.projectName=projectName;

        if (!this.prefix)
            this.prefix=this.projectName.replaceAll(".","_")+"_";
    }

    ts(typeDef) {
        return createTypeStrategy(typeDef,{
            idl: this.idl, 
            prefix: this.prefix
        });
    }

    generateClassDef(cls) {
        return `
            static JSClassID ${this.prefix}${cls.name}_classid=0;
            static void ${this.prefix}${cls.name}_finalizer(JSRuntime *rt, JSValue obj) {
                Opaque* opaque=(Opaque*)JS_GetOpaque(obj,${this.prefix}${cls.name}_classid);
                delete opaque;
            }
            static JSValue ${this.prefix}${cls.name}_ctor(JSContext *ctx, JSValueConst new_target, int argc, JSValueConst *argv) {
                if (argc!=${cls.ctorArgs.length}) return JS_ThrowTypeError(ctx, "wrong arg count");
                ${cls.ctorArgs.map((a,i)=>this.ts(a).nativeDecl(`a${i}`)).join("\n")}
                ${cls.ctorArgs.map((a,i)=>this.ts(a).unpack(`a${i}`,`argv[${i}]`)).join("\n")}
                std::shared_ptr<${cls.name}> instance=std::make_shared<${cls.name}>(${cls.ctorArgs.map(a=>a.name).join(",")});
                JSValue obj=JS_NewObjectClass(ctx,${this.prefix}${cls.name}_classid);
                JS_SetOpaque(obj,new Opaque(instance));
                return obj;
            }
            ${cls.methods.map(m=>this.generateFunctionDef(m)).join("\n")}
        `;
    }

    generateClassReg(cls) {
        return `
            if (!${this.prefix}${cls.name}_classid) JS_NewClassID(&${this.prefix}${cls.name}_classid);
            JSClassDef ${cls.name}_def={.class_name="${cls.name}", .finalizer=${this.prefix}${cls.name}_finalizer};
            JS_NewClass(JS_GetRuntime(ctx),${this.prefix}${cls.name}_classid,&${cls.name}_def);
            JSValue ${cls.name}_proto=JS_NewObject(ctx);
            JS_SetClassProto(ctx, ${this.prefix}${cls.name}_classid,${cls.name}_proto);
            JSValue ${cls.name}_ctorval=JS_NewCFunction2(ctx,${this.prefix}${cls.name}_ctor,"${cls.name}",0,JS_CFUNC_constructor,0);
            JS_SetConstructor(ctx,${cls.name}_ctorval,${cls.name}_proto);
            JS_SetPropertyStr(ctx,global,"${cls.name}",${cls.name}_ctorval);
            ${cls.methods.map(m=>this.generateFunctionReg(m)).join("\n")}
        `;
    }

    generateFunctionDef(func) {
        let name,prelude,callTarget,argStart;
        if (func.className) {
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
                return JS_UNDEFINED;
            `;
        }

        else {
            call=`
                ${this.ts(func.return).nativeDecl("ret")}
                ret=${callTarget}(${func.args.map((arg,i)=>`a${i}`).join(",")});
                JSValue retval;
                ${this.ts(func.return).pack("retval","ret")}
                return retval;
            `;
        }

        return `
            static JSValue ${name}(JSContext *ctx, JSValueConst thisobj, int argc, JSValueConst *argv) {
                if (argc!=${func.args.length}) return JS_ThrowTypeError(ctx, "wrong arg count");
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
                JS_SetPropertyStr(ctx,${func.className}_proto,"${func.name}",JS_NewCFunction(ctx, ${this.prefix}${func.className}_${func.name},"${func.name}",0));
            `;
        }

        else {
            return `
                JS_SetPropertyStr(ctx,global,"${func.name}",JS_NewCFunction(ctx,${this.prefix}${func.name},"${func.name}",0));
            `;
        }
    }

    generateCppSource() {
        return autoIndent(`
            #include "${this.projectName+".h"}"
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            #include <string>

            class Opaque {
            public:
                Opaque(std::shared_ptr<void> instance_) {
                    instance=instance_;
                }
                std::shared_ptr<void> instance;
            };

            //map<void*, Opaque*> opaqueByPointer;

            ${this.idl.functions.map(f=>this.generateFunctionDef(f)).join("\n")}
            ${this.idl.classes.map(c=>this.generateClassDef(c)).join("\n")}

            void ${this.prefix}init(JSContext *ctx) {
                JSValue global=JS_GetGlobalObject(ctx);
                ${this.idl.functions.map(f=>this.generateFunctionReg(f)).join("\n")}
                ${this.idl.classes.map(c=>this.generateClassReg(c)).join("\n")}
                JS_FreeValue(ctx,global);
            }

            void ${this.prefix}exit(JSContext *ctx) {
            }
        `); 
    }

    generateIncludeSource() {
        return autoIndent(`
            #pragma once
            #include <memory>
            extern "C" {
            #include "quickjs.h"
            }

            ${this.idl.include.map(inc=>`#include "${inc}"`).join("\n")}

            void ${this.prefix}init(JSContext *ctx);
            void ${this.prefix}exit(JSContext *ctx);
        `);
    }
}

export async function peabindQuickjs({idl, prefix, output}) {
    idl=peabindNormalize(idl);

    let outputPath=path.parse(output);
    if (outputPath.ext!=".c" && outputPath.ext!=".cpp")
        throw new DeclaredError("Expected .c or .cpp output");

    let projectName=outputPath.name;
    let builder=new PeabindQuickjsBuilder({idl, prefix, projectName});

    fs.writeFileSync(output,builder.generateCppSource());

    let includeFn=path.join(outputPath.dir,projectName+".h");
    fs.writeFileSync(includeFn,builder.generateIncludeSource());

    //console.log(js);*/
}