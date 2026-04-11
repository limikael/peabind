import {peabindNormalize, idlGetClass} from "./peabind-idl.js";
import {runCommand} from "../utils/node-util.js";
import {DeclaredError} from "../utils/js-util.js";
import path from "path";
import fs from "fs";
import os from "os";
import {autoIndent, escapeCString} from "../utils/lang-util.js";
import {peabindGenerateJs, peabindGenerateCpp} from "./peabind-gen.js";
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
        return createTypeStrategy(this.idl,typeDef);
    }

    generateFunctionDef(func,{cls}={}) {
        let name,prelude,callTarget,argStart;
        if (cls) {
            name=`${this.prefix}${cls.name}_${func.name}`;
            prelude=`
                int id;
                JS_ToInt32(ctx,&id,argv[0]);
                std::shared_ptr<${cls.name}> instance=std::static_pointer_cast<${cls.name}>(registry[id]);
            `;
            callTarget=`instance->${func.name}`;
            argStart=1;
        }

        else {
            name=`${this.prefix}${func.name}`;
            prelude="";
            callTarget=`${func.name}`;
            argStart=0;
        }

        let call;
        if (func.return.type=="void") {
            call=`
                ${callTarget}(${func.args.map((arg,i)=>"arg_"+i).join(",")});
                return JS_UNDEFINED;
            `;
        }

        else {
            call=`
                ${this.ts(func.return).decl("ret")}
                ret=${callTarget}(${func.args.map((arg,i)=>"arg_"+i).join(",")});
                JSValue retval;
                ${this.ts(func.return).pack("retval","ret")}
                return retval;
            `;
        }

        return `
            static JSValue ${name}(JSContext *ctx, JSValueConst thisobj, int argc, JSValueConst *argv) {
                if (argc!=${func.args.length+argStart}) return JS_ThrowTypeError(ctx, "wrong arg count");
                ${prelude}
                ${func.args.map((arg,i)=>`
                    ${this.ts(arg).decl("arg_"+i)}
                    ${this.ts(arg).unpack("arg_"+i,"argv["+(i+argStart)+"]")}
                `).join("")}
                ${call}
            }
        `;
    }

    generateEventDef(event, {cls}) {
        let decl=event.args.map((arg,i)=>this.ts(arg).param(`a${i}`)).join(",");
        let onName=`${this.prefix}${cls.name}_on_${event.name}`;
        let offName=`${this.prefix}${cls.name}_off_${event.name}`;
        let handlerName=`${this.prefix}handle_${cls.name}_${event.name}`;

        return `
            static JSValue ${onName}(JSContext *ctx, JSValueConst thisobj, int argc, JSValueConst *argv) {
                int id,callbackId;
                JS_ToInt32(ctx,&id,argv[0]);
                JS_ToInt32(ctx,&callbackId,argv[1]);
                std::shared_ptr<${cls.name}> instance=std::static_pointer_cast<${cls.name}>(registry[id]);

                int listenerId=instance->${event.name}.on([ctx,callbackId](${decl}){
                    JSValue global=JS_GetGlobalObject(ctx);
                    JSValue cb=JS_GetPropertyStr(ctx,global,"${handlerName}");

                    JSValue args[${event.args.length+1}];
                    args[0] = JS_NewInt32(ctx, callbackId);

                    ${event.args.map((arg,i)=>`
                        ${this.ts(arg).pack(`args[${i+1}]`,`a${i}`)}
                    `).join("")}

                    JSValue result=JS_Call(ctx,cb,JS_UNDEFINED,${event.args.length+1},args);

                    if (JS_IsException(result)) {
                        // Handle JS errors here
                        printf("unhandled!!!\\n");
                    }

                    for (int i=0; i<${event.args.length+1}; i++)
                        JS_FreeValue(ctx,args[i]);

                    JS_FreeValue(ctx,result);
                    JS_FreeValue(ctx,cb);
                    JS_FreeValue(ctx,global);

                    //printf("on invoked...\\n");
                });
                instance->${event.name}.setGlobalId(listenerId,callbackId);
                return JS_UNDEFINED;
            }

            /*void ${this.prefix}${cls.name}_off_${event.name}(int id, int callbackId) {
                std::shared_ptr<${cls.name}> instance=std::static_pointer_cast<${cls.name}>(registry[id]);
                int listenerId=instance->${event.name}.getIdByGlobalId(callbackId);
                instance->${event.name}.off(listenerId);
            }*/
        `;
    }

    generateClassDef(cls) {
        return `
            static JSValue ${this.prefix}${cls.name}_new(JSContext *ctx, JSValueConst thisobj, int argc, JSValueConst *argv) {
                int id=store(std::make_shared<${cls.name}>());
                return JS_NewInt32(ctx,id);
            }

            ${cls.methods.map(method=>this.generateFunctionDef(method,{cls})).join("\n")}
            ${cls.events.map(event=>this.generateEventDef(event,{cls})).join("\n")}
        `;
    }

    getExportedFunctionNames() {
        let exportedFunctionNames=[];

        for (let func of this.idl.functions)
            exportedFunctionNames.push(`${this.prefix}${func.name}`);

        for (let cls of this.idl.classes) {
            exportedFunctionNames.push(`${this.prefix}${cls.name}_new`);
            for (let method of cls.methods)
                exportedFunctionNames.push(`${this.prefix}${cls.name}_${method.name}`);

            for (let event of cls.events) {
                exportedFunctionNames.push(`${this.prefix}${cls.name}_on_${event.name}`);
                //exportedFunctionNames.push(`${this.prefix}${cls.name}_off_${event.name}`);
            }
        }

        return exportedFunctionNames;
    }

    generateNamedFunctionReg(name) {
        return `
            JS_SetPropertyStr(ctx,global,"${name}",JS_NewCFunction(ctx,${name},"${name}",0));
        `;
    }

    generateCppSource() {
       return autoIndent(`
            #include "${this.projectName+".h"}"
            ${peabindGenerateCpp({
                idl: this.idl,
                prefix: this.prefix
            })}

            ${this.idl.functions.map(func=>this.generateFunctionDef(func)).join("\n")}
            ${this.idl.classes.map(cls=>this.generateClassDef(cls)).join("\n")}

            static const char *init_js="${escapeCString(peabindGenerateJs({
                idl: this.idl, 
                prefix: this.prefix,
                mod: "",
            }))}";

            void ${this.prefix}init(JSContext *ctx) {
                JSValue global=JS_GetGlobalObject(ctx);

                ${this.getExportedFunctionNames().map(name=>`
                    ${this.generateNamedFunctionReg(name)}
                `).join("\n")}

                JS_FreeValue(ctx,global);

                JSValue result=JS_Eval(
                    ctx,
                    init_js,
                    strlen(init_js),
                    "<input>",
                    JS_EVAL_TYPE_GLOBAL
                );

                JS_FreeValue(ctx, result);
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
        throw new DeclaredError("Expected .js output");

    let projectName=outputPath.name;
    let builder=new PeabindQuickjsBuilder({idl, prefix, projectName});

    fs.writeFileSync(output,builder.generateCppSource());

    let includeFn=path.join(outputPath.dir,projectName+".h");
    fs.writeFileSync(includeFn,builder.generateIncludeSource());

    //console.log(js);*/
}