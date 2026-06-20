import {ifdefWrap} from "../utils/lang-util.js";

export default class EventRenderer {
	constructor({idl, ev, prefix, idlRenderer, classRenderer}) {
		this.idl=idl;
		this.ev=ev;
		this.prefix=prefix;
        this.idlRenderer=idlRenderer;
        this.classRenderer=classRenderer;

        if (!this.idlRenderer)
            throw new Error("got no renderer!!!");
	}

    getId() {
        let idx=this.classRenderer.getEventNames().indexOf(this.ev.name);
        return idx+this.classRenderer.getId();
    }
}
