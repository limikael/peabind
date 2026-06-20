import path from "path";
import os from "os";
import fs from "fs";
import PeabindJsvalRenderer from "../peabind-jsval/PeabindJsvalIdlRenderer.js";
import {buildJsvalWasm} from "../jsval/build-jsval-wasm.js";
import {dirnameFromImportMeta} from "../utils/node-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

export async function peabindWasm({idl, includePath, sources, output, prefix, define}) {
    if (!output.endsWith(".js"))
        throw new DeclaredError("Expected .js output");

    let projectName=path.basename(output).slice(0,-3);
    let builder=new PeabindJsvalRenderer({
        idl, 
        prefix,
        projectName,
        output,
        include: ["jsval-wasm.h"]
    });

    let stubFn=path.join(os.tmpdir(), "peabind-stub.cpp");
    fs.writeFileSync(stubFn,builder.generateSource());

    if (!includePath)
        includePath=[];

    includePath.push(path.join(__dirname,"../../include"));

    await buildJsvalWasm({
        output,
        sources: [stubFn,...sources],
        initFunction: `${builder.prefix}initmod`,
//        hoistedSymbols: builder.getExports().map(exp=>exp.name),
        hoistedSymbols: builder.getSymbolNames(),
        define,
        includePath
    });
}