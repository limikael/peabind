#ifndef ASYNC_PRIMITIVES_HPP
#define ASYNC_PRIMITIVES_HPP

#include <functional>
#include <cstdint>
#include <string>
#include <variant>
#include <memory>
#include <vector>

template<typename... Args>
class Dispatcher {
    struct Listener {
        int handle;
        std::function<void(Args...)> fn;
        std::function<void()> destructor;
    };

    std::vector<Listener> listeners;
    int nextHandle = 1;

public:
    Dispatcher() = default;
    Dispatcher(const Dispatcher&) = delete;
    Dispatcher& operator=(const Dispatcher&) = delete;
    Dispatcher(Dispatcher&&) = delete;
    Dispatcher& operator=(Dispatcher&&) = delete;

    ~Dispatcher() {
        off();
    }

    int on(std::function<void(Args...)> listener) {
        int handle = nextHandle++;
        listeners.push_back({handle, std::move(listener), nullptr});
        return handle;
    }

    void setDestructor(int handle, std::function<void()> destructor) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->handle == handle) {
                it->destructor=std::move(destructor);
            }
        }
    }

    void off(int handle) {
        for (auto it = listeners.begin(); it != listeners.end(); ++it) {
            if (it->handle == handle) {
                std::function<void()> destructor=it->destructor;
                listeners.erase(it);
                if (destructor)
                    destructor();

                return;
            }
        }
    }

    void off() {
        //printf("destructor offing, size=%d\n",listeners.size());

        while (listeners.size())
            off(listeners[0].handle);
    }

    void emit(Args... args) {
        auto copy = listeners;
        for (auto& l : copy) {
            l.fn(args...);
        }
    }
};

template <typename T>
class PromiseState {
public:
    PromiseState() {
        state=PENDING;
    }

    ~PromiseState() {
        //printf("promise state destructor\n");

        if (!isSettled())
            reject("lost promise");
    }

    void resolve(T val) {
        if (isSettled())
            return;

        state=RESOLVED;
        result=val;
        thenEvent.emit(val);
        thenEvent.off();
        catchEvent.off();
    }

    void reject(std::string s) {
        if (isSettled())
            return;

        state=REJECTED;
        reason=s;
        catchEvent.emit(s);
        thenEvent.off();
        catchEvent.off();
    }

    bool isSettled() {
        return (state!=PENDING);
    }

    bool isResolved() {
        return (state==RESOLVED);
    }

    bool isRejected() {
        return (state==REJECTED);
    }

    T getResult() {
        return result;
    }

    std::string getReason() {
        return reason;
    }

    Dispatcher<T> thenEvent;
    Dispatcher<std::string> catchEvent;

private:
    enum State {
        PENDING,
        RESOLVED,
        REJECTED
    };
    State state;
    T result;
    std::string reason;
};

template <typename T=void>
class Promise {
public:
    Promise() {
        state=std::make_shared<PromiseState<T>>();
    }

    void then(std::function<void(T)> handler) {
        if (state->isSettled()) {
            if (state->isResolved())
                handler(state->getResult());

            return;
        }

        state->thenEvent.on(handler);
    }

    void onCatch(std::function<void(std::string)> handler) { 
        if (state->isSettled()) {
            if (state->isRejected())
                handler(state->getReason());

            return;
        }

        state->catchEvent.on(handler);
    }

    Dispatcher<T> *getThenDispatcher() { return &state->thenEvent; }
    Dispatcher<std::string> *getCatchDispatcher() { return &state->catchEvent; }
    void resolve(T val) { state->resolve(val); }
    void reject(std::string s) { state->reject(s); }
    bool isSettled() { return state->isSettled(); }
    bool isResolved() { return state->isResolved(); }
    bool isRejected() { return state->isRejected(); }
    T getResult() { return state->getResult(); }
    std::string getReason() { return state->getReason(); }

protected:
    std::shared_ptr<PromiseState<T>> state;
};

template <>
class Promise<void>: public Promise<std::monostate> {
public:
    void then(std::function<void()> handler) {
        Promise<std::monostate>::then([handler](std::monostate) {
            handler();
        });
    }

    void resolve() { state->resolve(std::monostate{}); }
};

typedef Promise<> VoidPromise;

#endif