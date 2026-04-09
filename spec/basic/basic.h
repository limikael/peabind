#pragma once
#include <memory>
#include "peabind.h"

int hello(int a, int b);
int hello2();

class Hello {
public:
	Hello() {
		val=100;
		//printf("creating hello, val=%d\n",val);
	}

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

	int val;
	Dispatcher<int,int> data;
};

std::shared_ptr<Hello> createHello();
void setHelloVal(std::shared_ptr<Hello>, int val);