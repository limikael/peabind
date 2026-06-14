#include <peabind.h>
#include "StreamTransport.h"
#include "CborStream.h"
#include <map>

typedef std::vector<uint8_t> PeabindStreamBackendFunction(std::vector<uint8_t>);

class PeabindStreamBackend {
public:
    PeabindStreamBackend(StreamTransport *streamTransport_);
    ~PeabindStreamBackend();
    void addFunction(int id, PeabindStreamBackendFunction *f);
    void loop();
    std::vector<uint8_t> handleFunction(std::vector<uint8_t> req);

private:
    std::map<int,PeabindStreamBackendFunction*> functions;
    StreamTransport *streamTransport;
    CborStream *cborStream;
};

/*
*/

/*            #include "StreamTransport.h"
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            class ${this.prefix}Backend {
            public:
                ${this.prefix}Backend(StreamTransport &streamTransport_);
                void loop();
            private:
                CborStream cborStream;
            };
*/

/*
            void ${this.prefix}Backend::loop() {
                if (cborStream.available()) {
                    std::vector<uint8_t> req=cborStream.read();
                    std::vector<uint8_t> res;
                    auto it=req.begin();
                    size_t items;
                    CborLite::decodeArraySize(it,req.end(),items);
                    int opcode;
                    CborLite::decodeInteger(it,req.end(),opcode);
                    switch (opcode) {
                        case PEABIND_STREAMOP_CALL: {
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

                        case PEABIND_STREAMOP_NEW: {
                            int clsid;
                            CborLite::decodeInteger(it,req.end(),clsid);
                            // create the class here!!!
                        }
                        break;
                    }
                    cborStream.write(res);
                }
            }

*/