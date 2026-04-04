import {peabindParse} from "./peabind-idl.js";
import {runCommand} from "../utils/node-util.js";
import {DeclaredError} from "../utils/js-util.js";
import path from "path";
import fs from "fs";
import os from "os";

function peabindWasmWrapper({idl, projectName}) {
    let js=`
        const wasmUrl = new URL('./${projectName}.wasm', import.meta.url);
        let wasmBytes;
        if (typeof window === 'undefined') {
            let fs=await import('fs');
            wasmBytes=await fs.promises.readFile(wasmUrl);
        } else {
            let res=await fetch(wasmUrl);
            wasmBytes=await res.arrayBuffer();
        }

        const imports = {
            wasi_snapshot_preview1: {
                proc_exit: () => {},        // called on program exit
                fd_write: () => 0,          // called for stdout/stderr writes
                fd_close: () => 0,          // optional if you don’t use files
                fd_seek: () => 0,           // optional
                fd_fdstat_get: () => 0,     // optional
                environ_sizes_get: () => 0, // optional
                environ_get: () => 0,       // optional
            }
        };

        let {instance}=await WebAssembly.instantiate(wasmBytes, imports);
        let exp=instance.exports;
    `;

    for (let func of idl.functions) {
        js+=`
            export const ${func.name}=exp.${func.name};
        `;
    }

    for (let cls of idl.classes) {
        js+=`
            export class ${cls.name} {
                constructor() {
                    this._handle=exp.${cls.name}_new();
                }
        `;

        for (let method of cls.methods) {
            js+=`${method.name}() {
                return exp.${cls.name}_${method.name}(this._handle);
            }\n`;
        }

        js+=`};\n`;
    }

    return js;
}

export async function peabindWasmStub({idl, projectName, exportedFunctionNames}) {
    let src=``;
    src+=idl.include.map(i=>`#include "${i}"\n`);

    src+=`extern "C" {\n`;

    for (let cls of idl.classes) {
        exportedFunctionNames.push(`_${cls.name}_new`);
        src+=`${cls.name}* ${cls.name}_new() {
            return new ${cls.name}();
        }\n`;

        for (let method of cls.methods) {
            exportedFunctionNames.push(`_${cls.name}_${method.name}`);
            src+=`int ${cls.name}_${method.name}(${cls.name}* instance) {
                return instance->${method.name}();
            }\n`;
        }
    }

    src+=`}\n`;

    return src;
}

export async function peabindWasm({idl, sources, output}) {
    let idlDir=path.parse(idl).dir;
    idl=peabindParse(fs.readFileSync(idl,"utf8"));

    let outputPath=path.parse(output);
    if (outputPath.ext!=".js")
        throw new DeclaredError("Expected .js output");

    let outputBase=path.join(outputPath.dir,outputPath.name);
    let projectName=outputPath.name;
    let exportedFunctionNames=idl.functions.map(f=>"_"+f.name);

    let stub=await peabindWasmStub({idl, projectName, exportedFunctionNames});
    let stubFn=path.join(os.tmpdir(), "peabind-stub.cpp");
    fs.writeFileSync(stubFn,stub);

    //console.log(stub);

    await runCommand("emcc",[
        ...sources,
        stubFn,
        "-I",idlDir,
        "-o",outputBase+".wasm",
        "-s","STANDALONE_WASM=1",
        "-s",`EXPORTED_FUNCTIONS=${exportedFunctionNames.join(",")}`,
        "--no-entry"
    ]);

    let js=peabindWasmWrapper({idl, projectName});
    fs.writeFileSync(path.join(outputPath.dir,outputPath.name+".js"),js);

    //console.log(js);
}