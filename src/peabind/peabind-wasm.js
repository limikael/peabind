import {peabindParse} from "./peabind-idl.js";
import {runCommand} from "../utils/node-util.js";
import {DeclaredError} from "../utils/js-util.js";
import path from "path";
import fs from "fs";
import os from "os";
import {autoIndent} from "../utils/auto-indent.js";

function isPrimitiveType(t) {
    return ["int"].includes(t);
}

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

        exportedFunctionNames.push(`_${this.prefix}destroy`);

        return exportedFunctionNames;
    }

    generateFunction(func) {
        if (isPrimitiveType(func.return.type)) {
            return `
                ${func.return.type} ${this.prefix}${func.name}(
                    ${func.args.map((arg,i)=>`${arg.type} arg_${i}`).join(",")}) {
                    return ${func.name}(${func.args.map((arg,i)=>`arg_${i}`).join(",")});
                }
            `;
        }

        else {
            return `
                int ${this.prefix}${func.name}(
                    ${func.args.map((arg,i)=>`${arg.type} arg_${i}`).join(",")}) {
                    return store(${func.name}(${func.args.map((arg,i)=>`arg_${i}`).join(",")}));
                }
            `;
        }
    }

    createWasmStub() {

        return autoIndent(`
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            #include <map>
            #include <cstdio>

            std::map<int, std::shared_ptr<void>> registry;
            std::map<void*, int> reverseRegistry;
            int registryIdCounter = 1;

            template<typename T>
            int store(std::shared_ptr<T> obj) {
                void* key = obj.get();
                auto it = reverseRegistry.find(key);
                if (it != reverseRegistry.end())
                    return it->second;

                int id = registryIdCounter++;
                registry[id] = obj;
                reverseRegistry[key] = id;
                return id;
            }

            extern "C" {
                void ${this.prefix}destroy(int id) {
                    auto it = registry.find(id);
                    if (it == registry.end()) return;
                    void* key = it->second.get();
                    reverseRegistry.erase(key);
                    registry.erase(it);
                }

                ${this.idl.functions.map(func=>this.generateFunction(func)).join("\n")}

                ${this.idl.classes.map(cls=>`
                    int ${cls.name}_new() {
                        return store(std::make_shared<${cls.name}>());
                    }

                    ${cls.methods.map(method=>`
                        int ${cls.name}_${method.name}(int id) {
                            std::shared_ptr<${cls.name}> instance=std::static_pointer_cast<Hello>(registry[id]);
                            return instance->${method.name}();
                        }
                    `).join("\n")}
                `).join("\n")}
            }
        `);
    }

    createWasmFunctionWrapper(func) {
        if (isPrimitiveType(func.return.type)) {
            return `
                export const ${func.name}=exp.${this.prefix}${func.name};
            `;
        }

        else {
            return `
                export function ${func.name}() {
                    return getRegistryObject(exp.${this.prefix}${func.name}(),${func.return.type});
                }
            `;
        }
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

            let memory;
            const imports = {
                wasi_snapshot_preview1: {
                    proc_exit: (code) => {
                        throw new Error("WASM exited with code " + code);            
                    },        // called on program exit
                    fd_write: (fd, iovs, iovs_len, nwritten) => {
                        const mem = new DataView(memory.buffer);

                        let written = 0;

                        for (let i = 0; i < iovs_len; i++) {
                            const ptr = iovs + i * 8;
                            const buf = mem.getUint32(ptr, true);
                            const len = mem.getUint32(ptr + 4, true);
                            written += len;

                            // (optional) actually print:
                            const bytes = new Uint8Array(memory.buffer, buf, len);
                            console.log(new TextDecoder().decode(bytes));
                        }

                        mem.setUint32(nwritten, written, true);
                        return 0;
                    },
                    fd_close: () => 0,          // optional if you don’t use files
                    fd_seek: () => 0,           // optional
                    fd_fdstat_get: () => 0,     // optional
                    environ_sizes_get: () => 0, // optional
                    environ_get: () => 0,       // optional
                }
            };

            let {instance}=await WebAssembly.instantiate(wasmBytes, imports);
            let exp=instance.exports;
            memory=instance.exports.memory;

            let registry=new Map();

            function getRegistryObject(id,cls) {
                if (!registry.get(id)) {
                    let o=Object.create(cls.prototype);
                    o._handle=id;
                    registry.set(id,o);
                }

                return registry.get(id);
            }

            ${this.idl.functions.map(func=>this.createWasmFunctionWrapper(func)).join("\n")}

            ${this.idl.classes.map(cls=>`
                export class ${cls.name} {
                    constructor() {
                        this._handle=exp.${cls.name}_new();
                        registry.set(this._handle,this);
                    }

                    destroy() {
                        exp.${this.prefix}destroy(this._handle);
                        this._handle=null;
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