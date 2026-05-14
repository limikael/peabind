import path from "path";
import os from "os";
import fs from "fs";
import {createPeabindJsvalBuilder} from "./peabind-jsval.js";
import {dirnameFromImportMeta, runCommand} from "../utils/node-util.js";
import {autoIndent} from "../utils/lang-util.js";
import {jsvalMqjsStdlibgen} from "../jsval/jsval-mqjs-stdlibgen.js";

let __dirname=dirnameFromImportMeta(import.meta);

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

    await jsvalMqjsStdlibgen({
        output: output.slice(0,-4)+".stdlib.h",
        functions: builder.idl.functions.map(f=>{
            return ({
                ifdef: f.ifdef,
                name: f.name,
                symbolName: builder.prefix+f.name
            });
        }),
        classes: builder.idl.classes.map(cls=>{
            let clsSpec={
                ifdef: cls.ifdef,
                name: cls.name,
                constructor: builder.prefix+cls.name+"_constructor",
                finalizer: builder.prefix+cls.name+"_finalizer",
                methods: cls.methods.map(m=>{
                    return ({
                        ifdef: m.ifdef,
                        name: m.name,
                        symbolName: builder.prefix+cls.name+"_"+m.name
                    })
                })
            };

            if (cls.events.length) {
                clsSpec.methods.push({name: "on",symbolName: builder.prefix+cls.name+"_on"});
                clsSpec.methods.push({name: "off",symbolName: builder.prefix+cls.name+"_off"});
            }

            return clsSpec;
        })
    });

    let source=autoIndent(`
        ${builder.generateSource()}
        #include "${projectName}.stdlib.h"

        extern "C" const JSSTDLibraryDef *${builder.prefix}get_stdlib() {
            return &js_stdlib;
        }

        extern "C" void ${builder.prefix}initmod(JSVAL mod);
        extern "C" void ${builder.prefix}exitmod();

        static JSVAL lock;
        static bool owned;

        static void init_class_ids() {
            ${builder.idl.classes.map(cls=>`
                ${builder.prefix}${cls.name}_id=jsvalCreateObject(jsvalUndefined());
                jsvalSetProp(${builder.prefix}${cls.name}_id,"__classId",jsvalCreateInt(${cls.name}_CLASS_ID));
            `).join("\n")}
        }

        void ${builder.prefix}init(JSContext *ctx) {
            jsvalMqjsInitBorrowed(ctx);
            owned=true;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("String(1337)");
            init_class_ids();
        }

        void ${builder.prefix}init_jsval() {
            assert(jsvalMqjsGetContext()!=NULL);
            owned=false;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("String(1337)");
            init_class_ids();
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
        extern "C" const JSSTDLibraryDef *${builder.prefix}get_stdlib();
    `);
    fs.writeFileSync(headerOutput,headerContent);
}