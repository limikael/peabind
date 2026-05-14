#!/usr/bin/env node
import {Command, program} from "commander";
import {peabind, peabindGetLibConf} from "./peabind.js";
import {DeclaredError} from "../utils/js-util.js";

program
    .name('peabind')
    .description('Create bindings for C++/JavaScript/WASM/quickjs.')
    .argument('[idl..]', 'Idl file. At least one required. (ext: .json)')
    .argument('[sources...]', 'Additional source files. (ext: .c, .cpp)')
    .option("-o, --output <output file>","Primary output. Required.")
    .option("-t, --target <target>","Target (wasm, quickjs, mqjs).")
    .option("-p, --prefix <prefix>","Function prefix.")
    .option("--lib-conf <conf>","Print local library config. [cargs,includeDir,cflags-only-I]")
    .option("-I, --include-path <path>","Add include dir.",(value, prev) => {
        prev.push(value);
        return prev;
    }, [])
    .version('0.1.0');

program.showHelpAfterError();
await program.parseAsync(process.argv);
let opts=program.opts();

if (opts.libConf) {
    let conf=peabindGetLibConf(opts.libConf,opts);
    if (Array.isArray(conf))
        conf=conf.join(" ");

    console.log(conf);
    process.exit();
}

try {
    if (!opts.output || opts.idl) {
        program.help();
        throw new DeclaredError("Need output and idl, try --help.");
    }

    let idl=[];
    let sources=[];
    for (let arg of program.args) {
        if (arg.endsWith(".json"))
            idl.push(arg)

        else if (arg.endsWith(".c") || arg.endsWith(".cpp"))
            sources.push(arg)

        else
            throw new DeclaredError("Only understand .json, .c, .cpp")
    }

    await peabind({idl, sources, ...opts});
}

catch (e) {
    if (!e.declared)
        throw e;

    console.log(e.message);
    process.exit(1);
}
