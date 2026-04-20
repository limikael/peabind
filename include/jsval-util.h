#pragma once
#include <string>
#include <vector>
#include <cstdio>
#include "jsval.h"

std::string jsvalToStdString(JSVAL val);
std::vector<uint8_t> jsvalToStdUint8Vector(JSVAL val);
std::string jsvalCatchExceptionStdString();