import {normalizeStringOrObject, normalizeStringArray,
		normalizeAlternative, normalizeFlags} from "../js/utils/normalize-util.js";

describe("normalize-util",()=>{
	it("can normalize",()=>{
		let o;

		o=normalizeStringOrObject("int","type");
		expect(o).toEqual({type:"int"});
		o=normalizeStringOrObject({type:"int"},"type");
		expect(o).toEqual({type:"int"});

		o=normalizeStringOrObject(undefined,"type","void");
		expect(o).toEqual({type: "void"});
		o=normalizeStringOrObject(undefined,"type",{type: "void"});
		expect(o).toEqual({type: "void"});

		o=normalizeStringOrObject(undefined,"type",{type: "void"});
		expect(o).toEqual({type: "void"});
	});

	it("can normalize a string array",()=>{
		expect(normalizeStringArray()).toEqual([]);
		expect(normalizeStringArray("hello")).toEqual(["hello"]);
		expect(normalizeStringArray(["hello","world"])).toEqual(["hello","world"]);

		normalizeAlternative("hello",["hello","world"]);
		expect(()=>{
			normalizeAlternative("hello2",["hello","world"]);
		}).toThrow();

		expect(normalizeFlags("static",["static","promise"])).toEqual(["static"]);
		expect(normalizeFlags(undefined,["static","promise"])).toEqual([]);
		expect(normalizeFlags(["static"],["static","promise"])).toEqual(["static"]);

		expect(()=>{
			normalizeFlags("stutic",["hello","world"]);
		}).toThrow(new Error("Expected one of: hello,world, not: stutic"));
	});
});
