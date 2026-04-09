import {peabindNormalize} from "./peabind-idl.js";
import {runCommand} from "../utils/node-util.js";
import {DeclaredError} from "../utils/js-util.js";
import path from "path";
import fs from "fs";
import os from "os";
import {autoIndent} from "../utils/auto-indent.js";
import {peabindGenerateJs, peabindGenerateCpp} from "./peabind-gen.js";

function escapeCString(str) {
    return str
        .replace(/\\/g, '\\\\')   // backslash
        .replace(/"/g, '\\"')     // double quote
        .replace(/\n/g, '\\n')    // newline
        .replace(/\r/g, '\\r')    // carriage return
        .replace(/\t/g, '\\t');   // tab
}

function generateVarDecl(typeDef, name) {
    switch (typeDef.type) {
        case "int":
            return `int32_t ${name};\n`;
            break;

        default:
            return `
                int ${name}_id;
                std::shared_ptr<${typeDef.type}> ${name}; 
            `;
    }
}

function generatePack(typeDef, dest, src) {
    switch (typeDef.type) {
        case "int":
            return `${dest}=JS_NewInt32(ctx,${src});\n`;
            break;

        default:
            return `
                ${dest}=JS_NewInt32(ctx,store(${src}));
            `;

            throw new Error("Unknown type: "+typeDef.type);
    }
}

function generateUnpack(typeDef, dest, src) {
    switch (typeDef.type) {
        case "int":
            return `JS_ToInt32(ctx,&${dest},${src});\n`;
            break;

        default:
            return `
                JS_ToInt32(ctx,&${dest}_id,${src});\n
                ${dest}=std::static_pointer_cast<${typeDef.type}>(registry[${dest}_id]);\n
            `;
    }
}

class PeabindQuickjsBuilder {
    constructor({idl, prefix, projectName}) {
        this.idl=idl;
        this.prefix=prefix;
        this.projectName=projectName;

        if (!this.prefix)
            this.prefix=this.projectName.replaceAll(".","_")+"_";

        this.idl.prefix=this.prefix; // remote later!!!
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
                ${generateVarDecl(func.return,"ret")}
                ret=${callTarget}(${func.args.map((arg,i)=>"arg_"+i).join(",")});
                JSValue retval;
                ${generatePack(func.return,"retval","ret")}
                return retval;
            `;
        }

        return `
            static JSValue ${name}(JSContext *ctx, JSValueConst thisobj, int argc, JSValueConst *argv) {
                if (argc!=${func.args.length+argStart}) return JS_ThrowTypeError(ctx, "wrong arg count");
                ${prelude}
                ${func.args.map((arg,i)=>`
                    ${generateVarDecl(arg,"arg_"+i)}
                    ${generateUnpack(arg,"arg_"+i,"argv["+(i+argStart)+"]")}
                `).join("")}
                ${call}
            }
        `;
    }

    generateClassDef(cls) {
        return `
            static JSValue ${this.prefix}${cls.name}_new(JSContext *ctx, JSValueConst thisobj, int argc, JSValueConst *argv) {
                int id=store(std::make_shared<${cls.name}>());
                return JS_NewInt32(ctx,id);
            }

            ${cls.methods.map(method=>this.generateFunctionDef(method,{cls})).join("\n")}
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