#pragma once
#include <vector>
#include <functional>
#include <string>
#include <cstdio>
#include <cstdint>
#include <memory>
#include <variant>
#include "async_primitives.hpp"

#define PEABIND_STREAMOP_CALL 1
#define PEABIND_STREAMOP_NEW 2
#define PEABIND_STREAMOP_DELETE 3
#define PEABIND_STREAMOP_RETURN 4
