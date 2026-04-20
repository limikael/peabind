#!/usr/bin/env node
import {Command, program} from "commander";
import {peabind, peabindGetLibConf} from "./peabind.js";

program
    .name('peabind')
    .description('Create bindings for C++/JavaScript/WASM/quickjs.')
    .argument('[idl]', 'Idl file.')
    .argument('[sources...]', 'Additional source files.')
    .option("-o, --output <output file>","Primary output.")
    .option("-t, --target <target>","Target (wasm, quickjs).")
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

if (!opts.output || opts.idl)
    throw new Error("Need output and idl.");

await peabind({
    idl: program.args[0],
    sources: program.args.slice(1),
    ...opts
});
