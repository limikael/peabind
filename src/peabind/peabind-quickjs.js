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

function generateFunctionDef(idl, func) {
    return `
        static JSValue ${idl.prefix}${func.name}(JSContext *ctx, JSValueConst thisobj, int argc, JSValueConst *argv) {
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

function generateFunctionReg(idl, func) {
    return `
        JS_SetPropertyStr(ctx,global,"${func.name}",JS_NewCFunction(ctx,${idl.prefix}${func.name},"${func.name}",0));
    `;
}

export async function peabindQuickjs({idl, prefix, output}) {
    let idlDir=path.parse(idl).dir;
    idl=peabindParse(fs.readFileSync(idl,"utf8"));

    let outputPath=path.parse(output);
    if (outputPath.ext!=".c" && outputPath.ext!=".cpp")
        throw new DeclaredError("Expected .js output");

    let outputBase=path.join(outputPath.dir,outputPath.name);
    let projectName=outputPath.name;

    if (!prefix)
        prefix=projectName.replaceAll(".","_")+"_";

    idl.prefix=prefix;

    let source=autoIndent(`
        #include "${outputPath.name+".h"}"

        ${idl.functions.map(func=>generateFunctionDef(idl,func)).join("\n")}

        void ${prefix}init(JSContext *ctx) {
            JSValue global=JS_GetGlobalObject(ctx);
            ${idl.functions.map(func=>generateFunctionReg(idl,func)).join("\n")}
            JS_FreeValue(ctx,global);
        }
    `);

    fs.writeFileSync(output,source);

    let includeSource=autoIndent(`
        #pragma once
        extern "C" {
        #include "quickjs.h"
        }

        ${idl.include.map(inc=>`#include "${inc}"`).join("\n")}

        void ${prefix}init(JSContext *ctx);
        void ${prefix}exit(JSContext *ctx);
    `);

    fs.writeFileSync(path.join(outputPath.dir,outputPath.name+".h"),includeSource);

    //console.log(js);*/
}