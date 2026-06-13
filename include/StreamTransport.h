#pragma once

class StreamTransport {
public:
	virtual void loop()=0;
	virtual bool available()=0;
	virtual int read()=0;
	virtual void write(int value)=0;
};
