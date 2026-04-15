import path from "path";
import os from "os";
import fs from "fs";
import {createPeabindJsvalBuilder} from "./peabind-jsval.js";
import {buildJsvalWasm} from "../jsval/build-jsval-wasm.js";
import {dirnameFromImportMeta} from "../utils/node-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

export async function peabindWasm({idl, includePath, sources, output, prefix}) {
    if (!output.endsWith(".js"))
        throw new DeclaredError("Expected .js output");

    let projectName=path.basename(output).slice(0,-3);
    let builder=createPeabindJsvalBuilder({
        idl, 
        projectName,
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
        initFunction: `${builder.prefix}init`,
        hoistedSymbols: builder.getSymbolNames(),
        includePath
    });
}