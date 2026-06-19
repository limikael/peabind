import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";
import {ifdefWrap} from "../utils/lang-util.js";
import {idlGetClass} from "../peabind/peabind-idl.js";

export default class EventRenderer {
	constructor({idl, ev, prefix, idlRenderer}) {
		this.idl=idl;
		this.ev=ev;
		this.prefix=prefix;
        this.idlRenderer=idlRenderer;

        if (!this.idlRenderer)
            throw new Error("got no renderer!!!");
	}
}
