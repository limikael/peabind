import {peabindParse} from "../src/peabind/peabind-idl.js";

describe("idl",()=>{
	it("can parse",()=>{
		let idl=peabindParse({
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
});
