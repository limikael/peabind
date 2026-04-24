import {peabindNormalize} from "../js/peabind/peabind-idl.js";
import {peabindMerge} from "../js/peabind/peabind.js";

describe("idl",()=>{
	it("can merge",()=>{
		let idl=peabindMerge({
			include: "hello.h",
			functions: {
				hello: {args: ["int","int"]}
			},
		},{
			include: ["helloagain.h","test.h"],
			functions: {
				hello2: {args: ["int","int"]}
			},
		});

		//console.log(idl);
	});

	it("can parse",()=>{
		let idl=peabindNormalize({
			functions: {
				hello: {args: ["int","int"]}
			},
			classes: {
				Hello: {
					ctorArgs: ["int","int"]
				}
			}
		});

		expect(idl.functionsByName["hello"].args[0].type).toEqual("int");
		expect(idl.classesByName["Hello"].ctorArgs[0].type).toEqual("int");

		//console.log(JSON.stringify(idl,null,2));
	});

	it("checks for errors",()=>{
		let idl={
			something: "not allowd"
		};

		expect(()=>{
			peabindNormalize(idl);
		}).toThrow(new Error("Expected one of: include,functions,classes,functionsByName,classesByName, not: something"));
	});
});
