#include <peabind.h>
#include "StreamTransport.h"
#include "CborStream.h"

class PeabindStreamFrontend {
public:
    PeabindStreamFrontend(StreamTransport *streamTransport_);
    ~PeabindStreamFrontend();
    std::vector<uint8_t> query(std::vector<uint8_t> req);

private:
    StreamTransport *streamTransport;
    CborStream *cborStream;
};
