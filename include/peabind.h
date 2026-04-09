#pragma once
#include <vector>
#include <functional>

template<typename... Args>
class Dispatcher {
    struct Listener {
        int id, globalId;
        std::function<void(Args...)> fn;
    };

    std::vector<Listener> listeners;
    int nextId = 1;

public:
    ~Dispatcher() {
        off();
    }

    int on(std::function<void(Args...)> listener) {
        int id = nextId++;
        listeners.push_back({id, 0, std::move(listener)});
        return id;
    }

    int getIdByGlobalId(int globalId) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->globalId == globalId) {
                return it->id;
            }
        }

        return 0;
    }

    void setGlobalId(int id, int globalId) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->id == id) {
                it->globalId=globalId;
            }
        }
    }

    void off(int id) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->id == id) {
                listeners.erase(it);
                return;
            }
        }
    }

    void off() {
        listeners.clear();
    }

    void emit(Args... args) {
        auto copy=listeners;
        for (auto& l: copy) {
            l.fn(args...);
        }
    }
};
