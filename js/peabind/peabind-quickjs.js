import path from "path";
import os from "os";
import fs from "fs";
import PeabindJsvalRenderer from "../peabind-jsval/PeabindJsvalIdlRenderer.js";
import {dirnameFromImportMeta} from "../utils/node-util.js";
import {autoIndent, ifdefWrap} from "../utils/lang-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

export async function peabindQuickjs({idl, includePath, sources, output, prefix}) {
    if (!output.endsWith(".cpp"))
        throw new DeclaredError("Expected .cpp output");

    let projectName=path.basename(output).slice(0,-4);
    let builder=new PeabindJsvalRenderer({
        idl, 
        prefix,
        projectName,
        output,
        include: ["jsval-quickjs.h",projectName+".h"]
    });

    let source=autoIndent(`
        ${builder.generateSource()}

        extern "C" void ${builder.prefix}initmod(JSVAL mod);
        extern "C" void ${builder.prefix}exitmod();

        static JSVAL lock;
        static bool owned;

        void ${builder.prefix}init(JSContext *ctx) {
            jsvalQuickjsInitBorrowed(ctx);
            owned=true;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("new String(1337)");
        }

        void ${builder.prefix}init_jsval() {
            assert(jsvalQuickjsGetContext()!=NULL);
            owned=false;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("new String(1337)");
        }

        void ${builder.prefix}exit() {
            ${builder.prefix}exitmod();
            jsvalFree(lock);
            if (owned)
                jsvalQuickjsExit();
        }

        ${builder.idl.classes.map(cls=>ifdefWrap(cls.ifdef,`
            void ${builder.prefix}set_${cls.name}(const char *name, std::shared_ptr<${builder.getExtClassName(cls)}> val) {
                jsvalSetProp(jsvalGetGlobal(),name,pack<${builder.getExtClassName(cls)}>(val,${builder.prefix}${cls.name}_id));
            }
        `)).join("\n")}
    `);

    fs.writeFileSync(output,source);

    let headerOutput=output.slice(0,-4)+".h";
    let headerContent=autoIndent(`
        #pragma once
        #include "quickjs.h"
        #include "jsval-quickjs.h"
        #include "jsval-util.h"
        #include <memory>
        ${builder.idl.include.map(i=>`#include "${i}"`).join("\n")}

        extern "C" void ${builder.prefix}init(JSContext *ctx);
        extern "C" void ${builder.prefix}init_jsval();
        extern "C" void ${builder.prefix}exit();
        extern "C" int ${builder.prefix}get_num_objects();
        extern "C" int ${builder.prefix}get_num_listeners();

        ${builder.idl.classes.map(cls=>ifdefWrap(cls.ifdef,`
            void ${builder.prefix}set_${cls.name}(const char *name, std::shared_ptr<${builder.getExtClassName(cls)}> val);
        `)).join("\n")}
    `);
    fs.writeFileSync(headerOutput,headerContent);
}