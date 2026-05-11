import {dirnameFromImportMeta, runCommand} from "../utils/node-util.js";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import {ifdefWrap, autoIndent} from "../utils/lang-util.js";
import {arrayify} from "../utils/js-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

function generateStubs({functions, classes}) {
    let s="";

    s+=(functions.map(f=>ifdefWrap(f.ifdef,`
    	JSVAL ${f.symbolName}(JSVAL thisobj, int argc, JSVAL *argv);
        static inline JSVAL jsval_${f.symbolName}(JSContext *ctx, JSValue* thisobj, int argc, JSValue* argv) {
            return ${f.symbolName}(*thisobj,argc,argv);
        }
    `)).join("\n"));

    s+=(classes.map(cls=>ifdefWrap(cls.ifdef,`
    	JSVAL ${cls["constructor"]}(JSVAL thisobj, int argc, JSVAL *argv);
        static inline JSVAL jsval_${cls["constructor"]}(JSContext *ctx, JSValue* thisobj, int argc, JSValue* argv) {
    		JSValue newthis=JS_NewObjectClassUser(ctx,${cls.name}_CLASS_ID);
            JSVAL ctorreturn=${cls["constructor"]}(newthis,argc,argv);
    		assert(ctorreturn==newthis);
    		return newthis;
        }
    `)).join("\n"));

    return s;
}

function generatePropHeader({functions, classes}) {
    return autoIndent(`
        ${functions.map(f=>ifdefWrap(f.ifdef,`
           JS_CFUNC_DEF("${f.name}", 0, jsval_${f.name}),
        `)).join("\n")}

        ${classes.map(cls=>ifdefWrap(cls.ifdef,`
            JS_PROP_CLASS_DEF("${cls.name}", &${cls.name}_class),
        `)).join("\n")}
    `);
}

function generateClassDef(cls) {
    return ifdefWrap(cls.ifdef,`
        static const JSClassDef ${cls.name}_class =
            JS_CLASS_DEF("${cls.name}", 1, jsval_${cls["constructor"]}, ${cls.name}_CLASS_ID,
                         NULL, NULL, NULL, NULL);
    `);
}

function generateDefHeader({classes}) {
    return autoIndent(`
        ${classes.map(cls=>generateClassDef(cls)).join("\n")}
    `);
}

function normalize({functions, classes}) {
	functions=arrayify(functions);
	functions=functions.map(f=>{
		if (!f.name)
			throw new Error("function doesn't have a name");

		if (!f.symbolName)
			f.symbolName=f.name;

		return f;
	});

	classes=arrayify(classes);

	return ({functions,classes});
}

export async function jsvalMqjsStdlibgen({output, functions, classes}) {
	({functions, classes}=normalize({functions,classes}))

    let propHeaderFn=path.join(os.tmpdir(), "mqjs-stdlib-props.h");
    fs.writeFileSync(propHeaderFn,generatePropHeader({functions,classes}));

    let defHeaderFn=path.join(os.tmpdir(), "mqjs-stdlib-defs.h");
    fs.writeFileSync(defHeaderFn,generateDefHeader({functions,classes}));

    let generatorFn=path.join(os.tmpdir(), "mqjs-stdlib-gen");
    await runCommand("gcc",[
        path.join(__dirname,"../../src/mqjs-stdlib.c"),
        path.join(__dirname,"../../ext/mquickjs-main/mquickjs_build.c"),
        `-DINCLUDE_PROP_HEADER=\"${propHeaderFn}\"`,
        `-DINCLUDE_DEF_HEADER=\"${defHeaderFn}\"`,
        "-I",path.join(__dirname,"../../ext/mquickjs-main"),
        "-o",generatorFn
    ]);

    let res=await runCommand(generatorFn,["-m64"],{stdio: ["ignore", "pipe", "pipe"]});

    let content=autoIndent(`
		#define JS_CLASS_COUNT (JS_CLASS_USER+${classes.length})
    	${classes.map((cls,index)=>`
    		#define ${cls.name}_CLASS_ID (JS_CLASS_USER+${index})
    	`)}
    	${generateStubs({functions, classes})}
    	#ifdef __cplusplus
    	extern "C" {
    	#endif
    	${res.stdout}
    	#ifdef __cplusplus
    	}
    	#endif
    `);

    fs.writeFileSync(output,content);
}