#!/usr/bin/env node
import {Command, program} from "commander";
import {peabindWasm} from "./peabind-wasm.js";

program
    .name('peabind')
    .description('Create bindings from C++/JavaScript/WASM/quickjs.')
    .argument('<idl>', 'Idl file.')
    .argument('[sources...]', 'Additional source files.')
    .option('-w, --wasm <wasm-output.js','Output wasm.')
    .version('0.1.0');

program.showHelpAfterError();
await program.parseAsync(process.argv);
let opts=program.opts();

if (opts.wasm) {
    await peabindWasm({
        idl: program.args[0],
        sources: program.args.slice(1),
        output: opts.wasm
    });
}
