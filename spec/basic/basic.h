#pragma once
#include <memory>
#include "peabind.h"

int hello(int a, int b);
int hello2();

class Something {
	int getSomeVal() {
		return 1234;
	}
};

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

	void emitSomething() {
		some.emit(something);
	}

	static std::shared_ptr<Hello> create() {
		return std::make_shared<Hello>();
	}

	Hello() {
		val=100;
		//printf("creating hello, val=%d\n",val);

		something=std::make_shared<Something>();
	}

	Dispatcher<int,int> data;
	Dispatcher<std::shared_ptr<Something>> some;

private:
	int val;
	std::shared_ptr<Something> something;
};

std::shared_ptr<Hello> createHello();
void setHelloVal(std::shared_ptr<Hello>, int val);