#include "PeabindStreamBackend.h"
#include <cassert>

PeabindStreamBackend::PeabindStreamBackend(StreamTransport* streamTransport_) {
	streamTransport=streamTransport_;
	cborStream=new CborStream(streamTransport);
}

PeabindStreamBackend::~PeabindStreamBackend() {
	delete cborStream;
}

std::vector<uint8_t> PeabindStreamBackend::handleFunction(std::vector<uint8_t> req) {
	std::vector<uint8_t> res;
	auto it=req.begin();
	size_t items;
	int opcode,funcid;

	CborLite::decodeArraySize(it,req.end(),items);
	CborLite::decodeInteger(it,req.end(),opcode);
	CborLite::decodeInteger(it,req.end(),funcid);

	if (functions.find(funcid)==functions.end()) // FIXME
		return res;

	res=functions[funcid](req);

	return res;
}

void PeabindStreamBackend::loop() {
	if (cborStream->available()) {
		std::vector<uint8_t> req=cborStream->read();
        std::vector<uint8_t> res;
        auto it=req.begin();
        size_t items;
        int opcode;

        CborLite::decodeArraySize(it,req.end(),items);
        CborLite::decodeInteger(it,req.end(),opcode);

        switch (opcode) {
            case PEABIND_STREAMOP_CALL:
            	res=handleFunction(req);
            	break;

            case PEABIND_STREAMOP_NEW:
            	assert(0 && "new not impl");
            	break;
        }

        cborStream->write(res);
	}
}

void PeabindStreamBackend::addFunction(int id, PeabindStreamBackendFunction* f) {
	functions[id]=f;
}

/*

             {
                            int funcid;
                            CborLite::decodeInteger(it,req.end(),funcid);
                            switch (funcid) {
                                ${this.idl.functions.map(func=>`
                                    case ${this.fs(func).getId()}:
                                        res=${this.prefix}${func.name}(req);
                                        break;
                                `).join("\n")}
                            }
                        }
                        break;

                            int clsid;
                            CborLite::decodeInteger(it,req.end(),clsid);
                            // create the class here!!!
                        }
                        break;
                    }
                }
            }


*/