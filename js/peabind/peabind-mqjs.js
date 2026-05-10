import path from "path";
import os from "os";
import fs from "fs";
import {createPeabindJsvalBuilder} from "./peabind-jsval.js";
import {dirnameFromImportMeta, runCommand} from "../utils/node-util.js";
import {autoIndent} from "../utils/lang-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

function generateMqjsStubs(builder) {
    return (builder.idl.functions.map(f=>builder.ifdefWrap(f.ifdef,`
        JSVAL jsval_${builder.prefix}${f.name}(JSContext *ctx, JSValue* thisobj, int argc, JSValue* argv) {
            return ${builder.prefix}${f.name}(*thisobj,argc,argv);
        }
    `)).join("\n"));
}

function generateMsqlPropHeaderSource(builder) {
    return autoIndent(`
        ${builder.idl.functions.map(f=>builder.ifdefWrap(f.ifdef,`
           JS_CFUNC_DEF("${f.name}", ${f.args.length}, jsval_${builder.prefix}${f.name}),
        `)).join("\n")}
    `);
}

export async function peabindMqjs({idl, includePath, sources, output, prefix}) {
    if (!output.endsWith(".cpp"))
        throw new DeclaredError("Expected .cpp output");

    let projectName=path.basename(output).slice(0,-4);
    let builder=createPeabindJsvalBuilder({
        idl, 
        prefix,
        projectName,
        include: ["jsval-mqjs.h",projectName+".h"],
        symbolRegs: false,
    });

    let propHeaderFn=path.join(os.tmpdir(), "peabind-props.h");
    fs.writeFileSync(propHeaderFn,generateMsqlPropHeaderSource(builder));

    if (includePath.length!=1)
        throw new Error("Expected exactly one include path");

    let generatorFn=path.join(os.tmpdir(), "peabind-mqjs-stdlib");
    await runCommand("gcc",[
        path.join(__dirname,"../../src/mqjs-stdlib.c"),
        path.join(__dirname,"../../ext/mquickjs-main/mquickjs_build.c"),
        `-DINCLUDE_PROP_HEADER=\"${propHeaderFn}\"`,
        "-I",path.join(__dirname,"../../ext/mquickjs-main"),
        "-o",generatorFn
    ]);

    let res=await runCommand(generatorFn,["-m64"],{stdio: ["ignore", "pipe", "pipe"]});
    let libOutput=output.slice(0,-4)+".stdlib.h";
    fs.writeFileSync(libOutput,res.stdout);

    let source=autoIndent(`
        ${builder.generateSource()}
        ${generateMqjsStubs(builder)}

        extern "C" {
        #include "${projectName}.stdlib.h"
        }

        extern "C" const JSSTDLibraryDef *${builder.prefix}get_stdlib() {
            return &js_stdlib;
        }

        extern "C" void ${builder.prefix}initmod(JSVAL mod);
        extern "C" void ${builder.prefix}exitmod();

        static JSVAL lock;
        static bool owned;

        void ${builder.prefix}init(JSContext *ctx) {
            jsvalMqjsInitBorrowed(ctx);
            owned=true;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("new String(1337)");
        }

        void ${builder.prefix}init_jsval() {
            assert(jsvalMqjsGetContext()!=NULL);
            owned=false;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("new String(1337)");
        }

        void ${builder.prefix}exit() {
            ${builder.prefix}exitmod();
            jsvalFree(lock);
            if (owned)
                jsvalMqjsExit();
        }
    `);

    fs.writeFileSync(output,source);

    let headerOutput=output.slice(0,-4)+".h";
    let headerContent=autoIndent(`
        #pragma once
        #include "jsval.h"
        #include "jsval-util.h"
        extern "C" void ${builder.prefix}init(JSContext *ctx);
        extern "C" void ${builder.prefix}init_jsval();
        extern "C" void ${builder.prefix}exit();
        extern "C" int ${builder.prefix}get_num_objects();
        extern "C" int ${builder.prefix}get_num_listeners();
        extern "C" int ${builder.prefix}get_num_listeners();
        extern "C" int ${builder.prefix}get_num_listeners();
        extern "C" const JSSTDLibraryDef *${builder.prefix}get_stdlib();
    `);
    fs.writeFileSync(headerOutput,headerContent);
}