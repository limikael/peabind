#include "CborStream.h"
#include "cbor-util.h"
#include <cassert>

CborStream::CborStream(StreamTransport* transport_) {
	transport=transport_;
}

bool CborStream::available() {
	if (cborByteSize(buffer.begin(),buffer.end())>=0)
		return true;

	while (transport->available())
		buffer.push_back(transport->read());

	return (cborByteSize(buffer.begin(),buffer.end())>=0);
}

std::vector<uint8_t> CborStream::read() {
	while (cborByteSize(buffer.begin(),buffer.end())<0)
		buffer.push_back(transport->read());

	ssize_t size=cborByteSize(buffer.begin(),buffer.end());
	std::vector<uint8_t> res;
	res.insert(res.begin(),buffer.begin(),buffer.begin()+size);
	buffer.erase(buffer.begin(),buffer.begin()+size);
	return res;
}

void CborStream::write(std::vector<uint8_t> v) {
	for (int i=0; i<v.size(); i++)
		transport->write(v[i]);
}
