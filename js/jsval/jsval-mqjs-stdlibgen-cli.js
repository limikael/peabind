#!/usr/bin/env node
import {Command, program} from "commander";
import fs from "node:fs";
import {jsvalMqjsStdlibgen} from "./jsval-mqjs-stdlibgen.js";
import JSON5 from "json5";

program
    .name('jsval-mqjs-stdlibgen')
    .argument('<descriptor>', 'Export descriptor json.')
    .requiredOption("-o, --output <output file>","Primary output. Required.")
    .version('0.1.0');

program.showHelpAfterError();
await program.parseAsync(process.argv);
let opts=program.opts();

let desc=JSON5.parse(fs.readFileSync(program.args[0]));

await jsvalMqjsStdlibgen({
    output: opts.output,
    functions: desc.functions
});