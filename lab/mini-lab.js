import repl from "repl";

global.mini=await import("./mini.out.js");

repl.start("> ");