#pragma once
#include <vector>
#include <functional>
#include <string>
#include <cstdio>
#include <cstdint>

template<typename... Args>
class Dispatcher {
    struct Listener {
        int handle;
        std::function<void(Args...)> fn;
        std::function<void()> destructor;
        //void *idPtr;
        uint64_t idInt;
    };

    std::vector<Listener> listeners;
    int nextHandle = 1;

public:
    ~Dispatcher() {
        //printf("dispatcher destructor...\n");

        off();
    }

    int on(std::function<void(Args...)> listener) {
        int handle = nextHandle++;
        listeners.push_back({handle, std::move(listener), nullptr, /*nullptr,*/ 0});
        return handle;
    }

    void setDestructor(int handle, std::function<void()> destructor) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->handle == handle) {
                it->destructor=std::move(destructor);
            }
        }
    }

    /*int getHandleByIdPtr(void *idPtr) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->idPtr == idPtr) {
                return it->handle;
            }
        }

        return 0;
    }

    void setIdPtr(int handle, void *idPtr) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->handle == handle) {
                it->idPtr=idPtr;
            }
        }
    }*/

    int getHandleByIdInt(uint64_t idInt) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->idInt == idInt) {
                return it->handle;
            }
        }

        return 0;
    }

    void setIdInt(int handle, uint64_t idInt) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->handle == handle) {
                it->idInt=idInt;
            }
        }
    }

    void off(int handle) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->handle == handle) {
                if (it->destructor)
                    it->destructor();
                listeners.erase(it);
                return;
            }
        }
    }

    void off() {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->destructor)
                it->destructor();
        }

        listeners.clear();
    }

    void emit(Args... args) {
        auto copy = listeners;
        for (auto& l : copy) {
            l.fn(args...);
        }
    }
};
