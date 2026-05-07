import {normalizeMapOrArray, normalizeArray, normalizeBuildIndex,
		normalizeStringOrObject, normalizeObjectKeys} from "../utils/normalize-util.js";
import {arrayify} from "../utils/js-util.js";

export function isPrimitiveType(t) {
    return ["int"].includes(t);
}

export function idlGetClass(idl, className) {
	return idl.classesByName[className];
}

export function peabindMerge(...confs) {
	confs=arrayify(confs);
	confs=confs.map(c=>peabindNormalize(c));

	let resConf={
		include: [],
		functions: [],
		classes: []
	};

	for (let conf of confs) {
		resConf.include.push(...conf.include);
		resConf.functions.push(...conf.functions);
		resConf.classes.push(...conf.classes);
	}

	return peabindNormalize(resConf);
}

export function peabindNormalize(def) {
	normalizeObjectKeys(def,["include","functions","classes","functionsByName","classesByName"]);

	def.include=normalizeArray(arrayify(def.include));

	def.functions=normalizeMapOrArray(def.functions,"name");
	def.functionsByName=normalizeBuildIndex(def.functions,"name");

	for (let f of def.functions) {
		normalizeObjectKeys(f,["args","return","name","namespace","ifdef"]);
		f.args=normalizeArray(f.args).map(a=>normalizeStringOrObject(a,"type"));
		f.return=normalizeStringOrObject(f.return,"type","void");
	}

	def.classes=normalizeMapOrArray(def.classes,"name");
	def.classesByName=normalizeBuildIndex(def.classes,"name");

	for (let c of def.classes) {
		normalizeObjectKeys(c,["name","constructible","namespace","ctorArgs","methods","events"]);
		if (!c.hasOwnProperty("constructible"))
			c.constructible=true;

		c.ctorArgs=normalizeArray(c.ctorArgs).map(a=>normalizeStringOrObject(a,"type"));
		c.methods=normalizeMapOrArray(c.methods,"name");
		for (let m of c.methods) {
			normalizeObjectKeys(m,["args","return","name","className","static"]);
			m.args=normalizeArray(m.args).map(a=>normalizeStringOrObject(a,"type"));
			m.return=normalizeStringOrObject(m.return,"type","void");
			m.className=c.name
		}

		c.events=normalizeMapOrArray(c.events,"name");
		for (let e of c.events) {
			normalizeObjectKeys(e,["name","className","dispatcher","args"]);
			e.args=normalizeArray(e.args).map(a=>normalizeStringOrObject(a,"type"));
			e.className=c.name;
			if (!e.dispatcher)
				e.dispatcher=e.name;
		}
	}

	return def;
}