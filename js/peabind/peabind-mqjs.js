import path from "path";
import os from "os";
import fs from "fs";
import {createPeabindJsvalBuilder} from "./peabind-jsval.js";
import {dirnameFromImportMeta, runCommand} from "../utils/node-util.js";
import {autoIndent} from "../utils/lang-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

function generateMqjsStubs(builder) {
    let s="";

    s+=(builder.idl.functions.map(f=>builder.ifdefWrap(f.ifdef,`
        JSVAL jsval_${builder.prefix}${f.name}(JSContext *ctx, JSValue* thisobj, int argc, JSValue* argv) {
            return ${builder.prefix}${f.name}(*thisobj,argc,argv);
        }
    `)).join("\n"));

    s+=(builder.idl.classes.map(cls=>builder.ifdefWrap(cls.ifdef,`
        JSVAL jsval_${builder.prefix}${cls.name}_constructor(JSContext *ctx, JSValue* thisobj, int argc, JSValue* argv) {
            return ${builder.prefix}${cls.name}_constructor(*thisobj,argc,argv);
        }
    `)).join("\n"));

    return s;
}

function generateMsqlPropHeaderSource(builder) {
    return autoIndent(`
        ${builder.idl.functions.map(f=>builder.ifdefWrap(f.ifdef,`
           JS_CFUNC_DEF("${f.name}", ${f.args.length}, jsval_${builder.prefix}${f.name}),
        `)).join("\n")}

        ${builder.idl.classes.map(cls=>builder.ifdefWrap(cls.ifdef,`
            JS_PROP_CLASS_DEF("${cls.name}", &${cls.name}_class),
        `)).join("\n")}
    `);
}

function generateMqjsClassReg({builder, cls, index}) {
    return builder.ifdefWrap(cls.ifdef,`
        // ${cls.name}
        //static const JSClassDef ${cls.name}_class =
        //    JS_CLASS_DEF("${cls.name}", ${cls.ctorArgs.length}, jsval_${builder.prefix}${cls.name}_constructor, ${cls.name}_CLASS_ID, NULL, NULL, NULL, NULL);

        static const JSClassDef ${cls.name}_class =
            JS_CLASS_DEF("${cls.name}", 1, jsval_${builder.prefix}${cls.name}_constructor, ${cls.name}_CLASS_ID,
                         js_object, js_object_proto, NULL, NULL);

        //static const JSClassDef ${cls.name}_class =
        //    JS_CLASS_DEF("${cls.name}", 0, jsval_${builder.prefix}${cls.name}_constructor, JS_CLASS_OBJECT,
        //                 NULL, NULL, NULL, NULL);
    `);
}

function generateMsqlDefHeaderSource(builder) {
    return autoIndent(`
        //#define JS_CLASS_COUNT (JS_CLASS_USER+10)

        ${builder.idl.classes.map((cls,index)=>generateMqjsClassReg({builder,cls,index})).join("\n")}
    `);
}

async function generateStdlib({builder, output}) {
    let propHeaderFn=path.join(os.tmpdir(), "peabind-props.h");
    fs.writeFileSync(propHeaderFn,generateMsqlPropHeaderSource(builder));

    let defHeaderFn=path.join(os.tmpdir(), "peabind-defs.h");
    fs.writeFileSync(defHeaderFn,generateMsqlDefHeaderSource(builder));

    let generatorFn=path.join(os.tmpdir(), "peabind-mqjs-stdlib");
    await runCommand("gcc",[
        path.join(__dirname,"../../src/mqjs-stdlib.c"),
        path.join(__dirname,"../../ext/mquickjs-main/mquickjs_build.c"),
        `-DINCLUDE_PROP_HEADER=\"${propHeaderFn}\"`,
        `-DINCLUDE_DEF_HEADER=\"${defHeaderFn}\"`,
        "-I",path.join(__dirname,"../../ext/mquickjs-main"),
        "-o",generatorFn
    ]);

    let res=await runCommand(generatorFn,["-m64"],{stdio: ["ignore", "pipe", "pipe"]});
    let libOutput=output.slice(0,-4)+".stdlib.h";
    fs.writeFileSync(libOutput,res.stdout);
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

    await generateStdlib({builder,output});

    let source=autoIndent(`
        ${builder.generateSource()}
        ${generateMqjsStubs(builder)}

        ${builder.idl.classes.map((cls,index)=>`
        #define ${cls.name}_CLASS_ID (JS_CLASS_USER + ${index})
        `).join("\n")}

        #define JS_CLASS_COUNT (JS_CLASS_USER+10)

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
            lock=jsvalEval("String(1337)");
        }

        void ${builder.prefix}init_jsval() {
            assert(jsvalMqjsGetContext()!=NULL);
            owned=false;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("String(1337)");
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