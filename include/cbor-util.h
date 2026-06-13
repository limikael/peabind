#include "cbor-lite/codec.h"
#include <sys/types.h> // ssize_t

template <typename InputIterator>
ssize_t cborByteSize(InputIterator pos, InputIterator end) {
    using namespace CborLite;

    auto start = pos;

    auto failIncomplete = []() -> ssize_t {
        return -1;
    };

    auto failInvalid = []() -> ssize_t {
        return -2;
    };

    //
    // Read additional length value
    //

    auto readLength = [&](Tag additional, std::uint64_t& value) -> ssize_t {

        value = 0;

        if (additional < 24) {
            value = additional;
            return 0;
        }

        int bytes = 0;

        switch (additional) {
        case Minor::length1: bytes = 1; break;
        case Minor::length2: bytes = 2; break;
        case Minor::length4: bytes = 4; break;
        case Minor::length8: bytes = 8; break;

        default:
            return failInvalid();
        }

        if (std::distance(pos, end) < bytes) {
            return failIncomplete();
        }

        for (int i = 0; i < bytes; i++) {
            value <<= 8;
            value |= static_cast<unsigned char>(*pos++);
        }

        return 0;
    };

    //
    // Need at least one byte
    //

    if (pos == end) {
        return failIncomplete();
    }

    auto octet = static_cast<unsigned char>(*pos++);

    Tag tag = octet & Major::mask;
    Tag additional = octet & Minor::mask;

    std::uint64_t value = 0;

    switch (tag) {

    //
    // Unsigned / negative integers
    //

    case Major::unsignedInteger:
    case Major::negativeInteger: {

        auto r = readLength(additional, value);

        if (r < 0) return r;

        break;
    }

    //
    // Byte string / text string
    //

    case Major::byteString:
    case Major::textString: {

        auto r = readLength(additional, value);

        if (r < 0) return r;

        if (std::distance(pos, end) < static_cast<std::ptrdiff_t>(value)) {
            return failIncomplete();
        }

        std::advance(pos, value);

        break;
    }

    //
    // Array
    //

    case Major::array: {

        auto r = readLength(additional, value);

        if (r < 0) return r;

        for (std::uint64_t i = 0; i < value; i++) {

            auto child = cborByteSize(pos, end);

            if (child < 0)
                return child;

            std::advance(pos, child);
        }

        break;
    }

    //
    // Map
    //

    case Major::map: {

        auto r = readLength(additional, value);

        if (r < 0) return r;

        for (std::uint64_t i = 0; i < value; i++) {

            auto keySize = cborByteSize(pos, end);

            if (keySize < 0)
                return keySize;

            std::advance(pos, keySize);

            auto valueSize = cborByteSize(pos, end);

            if (valueSize < 0)
                return valueSize;

            std::advance(pos, valueSize);
        }

        break;
    }

    //
    // Semantic tag
    //

    case Major::semantic: {

        auto r = readLength(additional, value);

        if (r < 0) return r;

        auto child = cborByteSize(pos, end);

        if (child < 0)
            return child;

        std::advance(pos, child);

        break;
    }

    //
    // Floats / simple values
    //

    case Major::floatingPoint: {

        if (additional < 24) {
            // simple value
        }
        else if (additional == Minor::length1) {

            if (std::distance(pos, end) < 1)
                return failIncomplete();

            ++pos;
        }
        else if (additional == Minor::length2) {

            if (std::distance(pos, end) < 2)
                return failIncomplete();

            std::advance(pos, 2);
        }
        else if (additional == Minor::length4) {

            if (std::distance(pos, end) < 4)
                return failIncomplete();

            std::advance(pos, 4);
        }
        else if (additional == Minor::length8) {

            if (std::distance(pos, end) < 8)
                return failIncomplete();

            std::advance(pos, 8);
        }
        else {
            return failInvalid();
        }

        break;
    }

    default:
        return failInvalid();
    }

    return std::distance(start, pos);
}