import path from "path";
import os from "os";
import fs from "fs";
import {createPeabindJsvalBuilder} from "./peabind-jsval.js";

export async function peabindWasm({idl, includePath, sources, output, prefix}) {
    if (!output.endsWith(".js"))
        throw new DeclaredError("Expected .js output");

    let projectName=path.basename(output).slice(0,-3);
    let builder=createPeabindJsvalBuilder({idl, projectName});

    let stubFn=path.join(os.tmpdir(), "peabind-stub.cpp");
    fs.writeFileSync(stubFn,builder.generateSource());

    //console.log(builder.generateSource());
}