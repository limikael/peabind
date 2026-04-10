import {peabindNormalize, isPrimitiveType, idlGetClass} from "./peabind-idl.js";
import {runCommand,dirnameFromImportMeta} from "../utils/node-util.js";
import {DeclaredError} from "../utils/js-util.js";
import path from "path";
import fs from "fs";
import os from "os";
import {autoIndent} from "../utils/auto-indent.js";
import {peabindGenerateJs, peabindGenerateCpp} from "./peabind-gen.js";

let __dirname=dirnameFromImportMeta(import.meta);

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
            exportedFunctionNames.push(`_${this.prefix}${cls.name}_new`);
            for (let method of cls.methods)
                exportedFunctionNames.push(`_${this.prefix}${cls.name}_${method.name}`);

            for (let event of cls.events) {
                exportedFunctionNames.push(`_${this.prefix}${cls.name}_on_${event.name}`);
                exportedFunctionNames.push(`_${this.prefix}${cls.name}_off_${event.name}`);
            }
        }

        exportedFunctionNames.push(`_${this.prefix}destroy`);

        return exportedFunctionNames;
    }

    generateCppFunctionReturnType(func) {
        if (func.return.type=="void")
            return `void`;

        else if (["int","float"].includes(func.return.type))
            return `${func.return.type}`;

        if (!idlGetClass(this.idl,func.return.type))
            throw new Error("Unknown type: "+func.return.type);

        return `int`;
    }

    generateCppFunctionReturn(func, expr) {
        if (func.return.type=="void")
            return `${expr};`;

        else if (["int","float"].includes(func.return.type))
            return `return (${expr});`;

        if (!idlGetClass(this.idl,func.return.type))
            throw new Error("Unknown type: "+func.return.type);

        return `return store(${expr});`;
    }

    generateCppFunctionDeclArgList(func, {cls}={}) {
        let l=func.args.map((arg,i)=>{
            if (["int","float"].includes(arg.type))
                return `${arg.type} arg_${i}`

            if (!idlGetClass(this.idl,arg.type))
                throw new Error("Unknown type: "+arg.type);

            // It is an object type
            return `int arg_${i}`;
        });
        if (cls)
            l.unshift("int id");

        return l.join(",")
    }

    generateCppFunctionCallArgList(func) {
        return `${func.args.map((arg,i)=>{
            if (["int","float"].includes(arg.type))
                return `arg_${i}`;

            if (!idlGetClass(this.idl,arg.type))
                throw new Error("Unknown type: "+arg.type);

            return `std::static_pointer_cast<${arg.type}>(registry[arg_${i}])`;
        }).join(",")}`;
    }

    generateCppFunction(func, {cls}={}) {
        let returnType=this.generateCppFunctionReturnType(func);
        let declArgList=this.generateCppFunctionDeclArgList(func,{cls});
        let callArgList=this.generateCppFunctionCallArgList(func);

        let name,prelude,callTarget;
        if (cls) {
            name=`${this.prefix}${cls.name}_${func.name}`;
            prelude=`std::shared_ptr<${cls.name}> instance=std::static_pointer_cast<${cls.name}>(registry[id]);`;
            callTarget=`instance->${func.name}`;
        }

        else {
            name=`${this.prefix}${func.name}`;
            prelude="";
            callTarget=`${func.name}`;
        }

        return `
            ${returnType} ${name}(${declArgList}) {
                ${prelude}
                ${this.generateCppFunctionReturn(func,`${callTarget}(${callArgList})`)}
            }
        `;
    }

    generateCppEvent(event, {cls}) {
        let decl=event.args.map((arg,i)=>{
            if (["int","float"].includes(arg.type))
                return `${arg.type} a${i}`;

            if (!idlGetClass(this.idl,arg.type))
                throw new Error("Unknown type for event: "+arg.type);

            return `std::shared_ptr<${arg.type}> a${i}`;
        }).join(",");
        let call=event.args.map((arg,i)=>{
            if (["int","float"].includes(arg.type))
                return `a${i}`;

            if (!idlGetClass(this.idl,arg.type))
                throw new Error("Unknown type for event: "+arg.type);

            return `store(a${i})`;
        });
        call.unshift("callbackId");
        call=call.join(",");

        return `
            void ${this.prefix}${cls.name}_on_${event.name}(int id, int callbackId) {
                std::shared_ptr<${cls.name}> instance=std::static_pointer_cast<${cls.name}>(registry[id]);
                int listenerId=instance->${event.name}.on([callbackId](${decl}){
                    ${this.prefix}handle_${cls.name}_${event.name}(${call});
                });
                instance->${event.name}.setGlobalId(listenerId,callbackId);
            }

            void ${this.prefix}${cls.name}_off_${event.name}(int id, int callbackId) {
                std::shared_ptr<${cls.name}> instance=std::static_pointer_cast<${cls.name}>(registry[id]);
                int listenerId=instance->${event.name}.getIdByGlobalId(callbackId);
                instance->${event.name}.off(listenerId);
            }
        `;
    }

    generateCppClass(cls) {
        return `
            int ${this.prefix}${cls.name}_new() {
                return store(std::make_shared<${cls.name}>());
            }

            ${cls.methods.map(method=>this.generateCppFunction(method,{cls})).join("\n")}
            ${cls.events.map(event=>this.generateCppEvent(event,{cls})).join("\n")}
        `;
    }

    generateCppEventStub(ev, {cls}) {
        let decl=ev.args.map((arg,i)=>{
            if (["float","int"].includes(arg.type))
                return `${arg.type} a${i}`;

            if (!idlGetClass(this.idl,arg.type))
                throw new Error("Unknown type for event: "+arg.type);

            return `int a${i}`;
        });
        decl.unshift("int cbId");
        decl=decl.join(",");

        return `
            EM_JS(void,${this.prefix}handle_${cls.name}_${ev.name},(${decl}),{});
        `;
    }

    generateCppSource() {
        return autoIndent(`
            #include <emscripten.h>

            ${peabindGenerateCpp({
                idl: this.idl
            })}

            ${this.idl.classes.map(cls=>`
                ${cls.events.map(ev=>`
                    ${this.generateCppEventStub(ev,{cls})}
                `).join("\n")}
            `).join("")}

            extern "C" {
                void ${this.prefix}destroy(int id) {
                    destroy(id);
                }

                ${this.idl.functions.map(func=>this.generateCppFunction(func)).join("\n")}
                ${this.idl.classes.map(cls=>this.generateCppClass(cls)).join("\n")}
            }
        `);
    }

    generateJsCallbackReceiverImport(ev, {cls}) {
        return `
            ${this.prefix}handle_${cls.name}_${ev.name}: (...args)=>{
                globalThis.${this.prefix}handle_${cls.name}_${ev.name}(...args);
            }
        `
    }

    generateJsCallbackReceiverImports() {
        return `
            ${this.idl.classes.map(cls=>`
                ${cls.events.map(ev=>`
                    ${this.generateJsCallbackReceiverImport(ev,{cls})},
                `).join("\n")}
            `).join("")}
        `;
    }

    generateJsSource() {
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
                },
                env: {
                    ${this.generateJsCallbackReceiverImports()}
                }
            };

            let {instance}=await WebAssembly.instantiate(wasmBytes, imports);
            let exp=instance.exports;
            memory=instance.exports.memory;

            ${peabindGenerateJs({
                idl: this.idl, 
                prefix: this.prefix,
                mod: "exp",
                exports: true
            })}
        `);
    }
}

export async function peabindWasm({idl, includePath, sources, output, prefix}) {
    idl=peabindNormalize(idl);

    let outputPath=path.parse(output);
    if (outputPath.ext!=".js")
        throw new DeclaredError("Expected .js output");

    let outputBase=path.join(outputPath.dir,outputPath.name);
    let projectName=outputPath.name;
    let builder=new PeabindWasmBuilder({idl, projectName});

    let wrapperFn=path.join(outputPath.dir,outputPath.name+".js");
    fs.writeFileSync(wrapperFn,builder.generateJsSource());

    let stubFn=path.join(os.tmpdir(), "peabind-stub.cpp");
    fs.writeFileSync(stubFn,builder.generateCppSource());

    includePath.push(path.join(__dirname,"../../include"));
    //console.log(includePath);

    let includePathOptions=[];
    for (let i of includePath)
        includePathOptions.push("-I",i);

    await runCommand("emcc",[
        ...sources,
        stubFn,
        ...includePathOptions,
        "-o",outputBase+".wasm",
        "-s","STANDALONE_WASM=1",
        "-s",`EXPORTED_FUNCTIONS=${builder.getExportedFunctionNames().join(",")}`,
        "--no-entry"
    ]);
}