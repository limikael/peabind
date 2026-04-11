#pragma once
#include <memory>
#include "peabind.h"

int hello(int a, int b);
int hello2();
int hellof(float f);
float hellothird(int i);
std::string hellos(std::string s, std::string t);

class Hello {
public:
	~Hello() {
		//printf("destroying hello...\n");
	}

	int getVal() {
		//printf("getting val: %d\n",val);
		return val;
	}

	void setVal(int val_) {
		//printf("setting val: %d\n",val_);
		val=val_;
	}

	void emitData(int dataValue1, int dataValue2) {
		//printf("emitting data: %d\n",dataValue);
		data.emit(dataValue1,dataValue2);
	}

	void emitDataVoid() {
		dataVoid.emit();
	}

	void emitDataFloat(float f) {
		dataFloat.emit(f);
	}

	void emitDataHello(std::shared_ptr<Hello> h) {
		dataHello.emit(h);
	}

	static std::shared_ptr<Hello> create() {
		return std::make_shared<Hello>();
	}

	Hello() {
		val=100;
		//printf("creating hello, val=%d\n",val);
	}

	Dispatcher<int,int> data;
	Dispatcher<std::shared_ptr<Hello>> dataHello;
	Dispatcher<> dataVoid;
	Dispatcher<float> dataFloat;

private:
	int val;
};

std::shared_ptr<Hello> createHello();
void setHelloVal(std::shared_ptr<Hello>, int val);