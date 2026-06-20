import EventRenderer from "../idl/EventRenderer.js";
import {ifdefWrap} from "../utils/lang-util.js";

export default class StreamBackendEventRenderer extends EventRenderer {
    generateBackendCase() {
        return `
            case ${this.getId()}: {
                auto instance=backend->unpack<${this.classRenderer.getExtClassName()}>(instanceId);
                instance->${this.ev.dispatcher}.on([handlerId,backend](){
                    //printf("dispatched...\\n");
                    std::vector<uint8_t> msg;
                    size_t size=2;
                    CborLite::encodeArraySize(msg,size);
                    CborLite::encodeInteger(msg,PEABIND_STREAMOP_EMIT);
                    CborLite::encodeInteger(msg,handlerId);
                    backend->cborStream->write(msg);
                });
            }
            break;
        `;
    }
}