import {normalizeMapOrArray, normalizeArray, normalizeBuildIndex,
		normalizeStringOrObject} from "../utils/normalize-util.js";
import {arrayify} from "../utils/js-util.js";

export function isPrimitiveType(t) {
    return ["int"].includes(t);
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
	/*if (typeof def=="string")
		def=JSON5.parse(def);*/

	def.include=normalizeArray(arrayify(def.include));

	def.functions=normalizeMapOrArray(def.functions,"name");
	def.functionsByName=normalizeBuildIndex(def.functions,"name");

	for (let f of def.functions) {
		f.args=normalizeArray(f.args).map(a=>normalizeStringOrObject(a,"type"));
		f.return=normalizeStringOrObject(f.return,"type","void");
	}

	def.classes=normalizeMapOrArray(def.classes,"name");
	def.classesByName=normalizeBuildIndex(def.classes,"name");

	for (let c of def.classes) {
		c.ctorArgs=normalizeArray(c.ctorArgs).map(a=>normalizeStringOrObject(a,"type"));
		c.methods=normalizeMapOrArray(c.methods,"name");
		for (let m of c.methods) {
			m.args=normalizeArray(m.args).map(a=>normalizeStringOrObject(a,"type"));
			m.return=normalizeStringOrObject(m.return,"type","void");
		}
	}

	return def;
}