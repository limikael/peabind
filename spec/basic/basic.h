#pragma once
#include <memory>
#include "peabind.h"

int hello(int a, int b);
int hello2();

class WithPrivateCtor {
public:
	int getVal() { return val; }
	static std::shared_ptr<WithPrivateCtor> getNullish() { return nullptr; }
	static std::shared_ptr<WithPrivateCtor> create() { 
		return std::shared_ptr<WithPrivateCtor>(new WithPrivateCtor());
	}

	static int extractVal(std::shared_ptr<WithPrivateCtor> i) { 
		if (!i)
			return -1;

		return i->val; 
	}

private:
	WithPrivateCtor() {
		val=777;
	}
	int val;
};

namespace mynamespace {
	int hello3();
	class Namespaced {
	public:
		int getTheVal() { return 1234; }
		static int getTheStaticVal() { return 9876; }
	};
}
int hellof(float f);
float hellothird(int i);
std::string hellos(std::string s, std::string t);
void removeHello();
std::vector<uint8_t> createBuffer();
int peekBuffer(std::vector<uint8_t> buffer, int i);

extern int liveHelloCount;
int getLiveHelloCount();

class Hello {
public:
	Hello(int val_) {
		val=val_;
		liveHelloCount++;
		//printf("creating hello, val=%d\n",val);
	}

	~Hello() {
		liveHelloCount--;
		//printf("destroying hello, val=%d\n",getVal());
	}

	static int staticAddOne(int v) {
		return v+1;
	}

	int getVal() {
		//printf("getting val: %d\n",val);
		return val;
	}

	void setVal(int val_) {
		//printf("setting val: %d\n",val_);
		val=val_;
	}

	void emitDataVoid() {
		dataVoid.emit();
	}

	void emitData(int dataValue1, int dataValue2) {
		//printf("emitting data: %d\n",dataValue);
		dataEvent.emit(dataValue1,dataValue2);
	}

	void emitDataFloat(float f) {
		dataFloat.emit(f);
	}

	void emitDataHello(std::shared_ptr<Hello> h) {
		dataHello.emit(h);
	}

	void emitDataString(std::string s) {
		dataString.emit(s);
	}

	static std::shared_ptr<Hello> create() {
		return std::make_shared<Hello>(100);
	}

	Dispatcher<> dataVoid;
	Dispatcher<int,int> dataEvent;
	Dispatcher<std::shared_ptr<Hello>> dataHello;
	Dispatcher<float> dataFloat;
	Dispatcher<std::string> dataString;

private:
	int val;
};

std::shared_ptr<Hello> createHello();
void setHelloVal(std::shared_ptr<Hello>, int val);