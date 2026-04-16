#pragma once
#include <string>

static std::string jsvalToStdString(JSVAL val) {
    size_t size = jsvalGetSize(val);
    if (size == 0) return "";
    
    std::string result(size, '\0');  // Allocate once
    jsvalReadString(val, result.data());  // Write directly
    return result;  // RVO eliminates copy
}