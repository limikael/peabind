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
