import {peabindParse} from "./peabind-idl.js";
import {runCommand} from "../utils/node-util.js";
import {DeclaredError} from "../utils/js-util.js";
import path from "path";
import fs from "fs";
import os from "os";
import {autoIndent} from "../utils/auto-indent.js";

function generateVarDecl(typeDef, name) {
    switch (typeDef.type) {
        case "int":
            return `int ${name};\n`;
            break;

        default:
            throw new Error("Unknown type: "+name);
    }
}

function generatePack(typeDef, dest, src) {
    switch (typeDef.type) {
        case "int":
            return `${dest}=JS_NewInt32(ctx,${src});\n`;
            break;

        default:
            throw new Error("Unknown type: "+name);
    }
}

function generateUnpack(typeDef, dest, src) {
    switch (typeDef.type) {
        case "int":
            return `JS_ToInt32(ctx,&${dest},${src});\n`;
            break;

        default:
            throw new Error("Unknown type: "+name);
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

    generateFunctionReg(func) {
        return `
            JS_SetPropertyStr(ctx,global,"${func.name}",JS_NewCFunction(ctx,${this.prefix}${func.name},"${func.name}",0));
        `;
    }

    generateFunctionDef(func) {
        return `
            static JSValue ${this.prefix}${func.name}(JSContext *ctx, JSValueConst thisobj, int argc, JSValueConst *argv) {
                if (argc!=${func.args.length}) return JS_ThrowTypeError(ctx, "wrong arg count");
                ${func.args.map((arg,i)=>`
                    ${generateVarDecl(arg,"arg_"+i)}
                    ${generateUnpack(arg,"arg_"+i,"argv["+i+"]")}
                `).join("")}
                ${generateVarDecl(func.return,"ret")}
                ret=${func.name}(${func.args.map((arg,i)=>"arg_"+i).join(",")});
                JSValue retval;
                ${generatePack(func.return,"retval","ret")}
                return retval;
            }
        `;
    }

    generateCppSource() {
       return autoIndent(`
            #include "${this.projectName+".h"}"

            ${this.idl.functions.map(func=>this.generateFunctionDef(func)).join("\n")}

            void ${this.prefix}init(JSContext *ctx) {
                JSValue global=JS_GetGlobalObject(ctx);
                ${this.idl.functions.map(func=>this.generateFunctionReg(func)).join("\n")}
                JS_FreeValue(ctx,global);
            }
        `); 
    }

    generateIncludeSource() {
        return autoIndent(`
            #pragma once
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
    let idlDir=path.parse(idl).dir;
    idl=peabindParse(fs.readFileSync(idl,"utf8"));

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