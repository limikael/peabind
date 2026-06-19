import path from "node:path";
import {idlGetClass} from "../peabind/peabind-idl.js";
import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";

export default class IdlRenderer {
	constructor({idl, output, prefix, namespace,
			functionRendererClass, classRendererClass, eventRendererClass}) {
	    this.projectName=path.basename(output).slice(0,-4);
    	if (!prefix)
        	prefix=this.projectName.replaceAll(".","_")+"_";

		this.idl=idl;
		this.namespace=namespace;
		this.output=output;
		this.prefix=prefix;
		this.functionRendererClass=functionRendererClass;
		this.classRendererClass=classRendererClass;
		this.eventRendererClass=eventRendererClass;

		this.fr=(...args)=>this.getFunctionRenderer(...args);
		this.tr=(...args)=>this.getTypeRenderer(...args);
    	this.cr=(...args)=>this.getClassRenderer(...args);
	}

	getOutput(prefix) {
		if (prefix)
			return this.output.slice(0,-4)+".h";		

		return this.output;
	}

	getFunctionRenderer(funcDef) {
        return new this.functionRendererClass({idl: this.idl, prefix: this.prefix, func: funcDef, idlRenderer: this});
	}

	getClassRenderer(clsDef) {
        if (typeof clsDef=="string")
            clsDef=idlGetClass(this.idl,clsDef);

        return new this.classRendererClass({idl: this.idl, prefix: this.prefix, cls: clsDef, idlRenderer: this});
	}

    getTypeRenderer(typeDef) {
        return createTypeStrategy(typeDef, {idl: this.idl, prefix: this.prefix, idlRenderer: this});
    }
}