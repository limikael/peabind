import EventRenderer from "../idl/EventRenderer.js";
import {ifdefWrap} from "../utils/lang-util.js";

export default class StreamFrontendEventRenderer extends EventRenderer {
    generateSignature() {
        return `
            StreamFrontendDispatcher<> ${this.ev.dispatcher};
        `;
    }

    generateProxyInit() {
        return `
            ${this.ev.dispatcher}.setFrontendProxy(this);
            ${this.ev.dispatcher}.setEventId(${this.getId()});
        `;
    }
}