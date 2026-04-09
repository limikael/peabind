#!/usr/bin/env node
import {Command, program} from "commander";
import {peabind} from "./peabind.js";

program
    .name('peabind')
    .description('Create bindings from C++/JavaScript/WASM/quickjs.')
    .argument('<idl>', 'Idl file.')
    .argument('[sources...]', 'Additional source files.')
    .requiredOption("-o, --output <output file>","Primary output.")
    .option("-t, --target <target>","Target (wasm, quickjs).")
    .option("-p, --prefix <prefix>","Function prefix.")
    .option("-I, --include-path <path>","Add include dir.",(value, prev) => {
        prev.push(value);
        return prev;
    }, [])
    .version('0.1.0');

program.showHelpAfterError();
await program.parseAsync(process.argv);
let opts=program.opts();

await peabind({
    idl: program.args[0],
    sources: program.args.slice(1),
    ...opts
});
