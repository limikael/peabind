import {peabindParse} from "./peabind-idl.js";
import {runCommand} from "../utils/node-util.js";
import {DeclaredError} from "../utils/js-util.js";
import path from "path";
import fs from "fs";
import os from "os";
import {autoIndent} from "../utils/auto-indent.js";

class PeabindWasmBuilder {
    constructor({idl, prefix, projectName}) {
        this.idl=idl;
        this.prefix=prefix;
        this.projectName=projectName;

        if (!this.prefix)
            this.prefix=this.projectName.replaceAll(".","_")+"_";
    }

    getExportedFunctionNames() {
        let exportedFunctionNames=[];

        for (let func of this.idl.functions)
            exportedFunctionNames.push(`_${this.prefix}${func.name}`);

        for (let cls of this.idl.classes) {
            exportedFunctionNames.push(`_${cls.name}_new`);
            for (let method of cls.methods)
                exportedFunctionNames.push(`_${cls.name}_${method.name}`);
        }

        return exportedFunctionNames;
    }

    createWasmStub() {

        return autoIndent(`
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}

            extern "C" {
                ${this.idl.functions.map(func=>`
                    ${func.return.type} ${this.prefix}${func.name}(
                        ${func.args.map((arg,i)=>`${arg.type} arg_${i}`).join(",")}) {
                    return ${func.name}(${func.args.map((arg,i)=>`arg_${i}`).join(",")});
                }`).join("\n")}

                ${this.idl.classes.map(cls=>`
                    ${cls.name}* ${cls.name}_new() {
                        return new ${cls.name}();
                    }

                    ${cls.methods.map(method=>`
                        int ${cls.name}_${method.name}(${cls.name}* instance) {
                            return instance->${method.name}();
                        }
                    `).join("\n")}
                `).join("\n")}
            }
        `);
    }

    createWasmWrapper() {
        return autoIndent(`
            const wasmUrl = new URL('./${this.projectName}.wasm', import.meta.url);
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

            ${this.idl.functions.map(func=>`
                export const ${func.name}=exp.${this.prefix}${func.name};
            `).join("\n")}

            ${this.idl.classes.map(cls=>`
                export class ${cls.name} {
                    constructor() {
                        this._handle=exp.${cls.name}_new();
                    }

                    ${cls.methods.map(method=>`
                        ${method.name}() {
                            return exp.${cls.name}_${method.name}(this._handle);
                        }
                    `).join("\n")}
                }
            `).join("\n")}
        `);
    }
}

export async function peabindWasm({idl, sources, output, prefix}) {
    let idlDir=path.parse(idl).dir;
    idl=peabindParse(fs.readFileSync(idl,"utf8"));

    let outputPath=path.parse(output);
    if (outputPath.ext!=".js")
        throw new DeclaredError("Expected .js output");

    let outputBase=path.join(outputPath.dir,outputPath.name);
    let projectName=outputPath.name;
    let builder=new PeabindWasmBuilder({idl, projectName});

    let stubFn=path.join(os.tmpdir(), "peabind-stub.cpp");
    fs.writeFileSync(stubFn,builder.createWasmStub());

    await runCommand("emcc",[
        ...sources,
        stubFn,
        "-I",idlDir,
        "-o",outputBase+".wasm",
        "-s","STANDALONE_WASM=1",
        "-s",`EXPORTED_FUNCTIONS=${builder.getExportedFunctionNames().join(",")}`,
        "--no-entry"
    ]);

    let wrapperFn=path.join(outputPath.dir,outputPath.name+".js");
    fs.writeFileSync(wrapperFn,builder.createWasmWrapper());
}