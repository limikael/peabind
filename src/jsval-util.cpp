#include "jsval-util.h"
#include <string>
#include <vector>
#include <cstdio>

std::string jsvalToStdString(JSVAL o) {
    JSVAL val=jsvalToString(o);
    //jsvalFree(o); // should really not

    size_t size = jsvalGetSize(val);
    if (size == 0) return "";
    
    std::string result(size, '\0');
    jsvalReadString(val, result.data());
    jsvalFree(val);

    return result;
}

std::vector<uint8_t> jsvalToStdUint8Vector(JSVAL val) {
    size_t size = jsvalGetSize(val);
    std::vector<uint8_t> buf(size);
    //std::vector<uint8_t> buf={88,99,88,88,88,88,88,88,88,88};

    jsvalReadBuffer(val,buf.data());

    return buf;
}

std::string jsvalCatchExceptionStdString() {
    JSVAL err=jsvalCatchException();
    JSVAL errStr=jsvalToString(err);
    std::string s=jsvalToStdString(errStr);

    jsvalFree(err);
    jsvalFree(errStr);

    return s;
}