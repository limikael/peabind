import EventRenderer from "../idl/EventRenderer.js";
import {ifdefWrap} from "../utils/lang-util.js";

export default class StreamFrontendEventRenderer extends EventRenderer {
    generateSignature() {
        return `
            StreamFrontendDispatcher<> ${this.ev.dispatcher};
        `;
    }
}