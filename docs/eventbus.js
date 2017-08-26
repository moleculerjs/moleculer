    // --- SIMPLE TESTS ---
    /*
    console.log("match test-1 - false: ", matches("aaa", "bbb"));
    console.log("match test-2 - true:  ", matches("aaa", "a*"));
    console.log("match test-3 - true:  ", matches("aaa", "aaa"));
    console.log("match test-4 - false: ", matches("aaa", "ab*"));
    console.log("match test-5 - true:  ", matches("aaa", "aa*"));
    console.log("match test-6 - false: ", matches("aaa", "aaaa"));
    console.log("match test-7 - true:  ", matches("aaa.bbb", "aaa.*"));
    console.log("match test-8 - true:  ", matches("aaa.bbb", "aa*"));

    on("x*", (payload) => {
        console.log("Received all: " + payload);
    }, false);

    on("xy*", (payload) => {
        console.log("Received once: " + payload);
    }, true);

    emit("xyz", "Hello 1!");
    emit("xyz", "Hello 2!");
    emit("xyz", "Hello 3!");
    emit("xyz", "Hello 4!");

    emit("x", "Hello 5!");
    emit("yy", "Hello 6 (nem kapja meg!");
    */
    // --- GLOB MATCHER ---


module.exports = class EventBus {
    
    constructor() {
        this.listeners = {};
        
        this.listenerCache = {};        
    }

    matches(text, pattern) {
        let rest = null;
        let pos = pattern.indexOf('*');
        if (pos != -1) {
            rest = pattern.substring(pos + 1);
            pattern = pattern.substring(0, pos);
        }
        if (pattern.length > text.length) {
            return false;
        }

        // Handle the part up to the first *
        for (let i = 0; i < pattern.length; i++) {
            if (pattern.charAt(i) != '?' && pattern.substring(i, i + 1) != text.substring(i, i + 1)) {
                return false;
            }
        }

        // Recurse for the part after the first *, if any
        if (rest == null) {
            return pattern.length == text.length;
        } else {
            for (let i = pattern.length; i <= text.length; i++) {
                if (this.matches(text.substring(i), rest)) {
                    return true;
                }
            }
            return false;
        }
    }

    // --- REGISTER LISTENER ----

    on(name, listener, once) {
        let handlers = this.listeners[name];
        if (!handlers) {
            handlers = [];
            this.listeners[name] = handlers;
        }
        handlers.push({
            listener: listener,
            once: once
        });

        // Clear cache
        this.listenerCache = {};
    }

    // --- EMIT EVENT TO LISTENERS ---

    emit(name, payload = null) {

        // Get from cache
        const cachedListeners = this.listenerCache[name];

        if (cachedListeners) {
            if (cachedListeners.length === 1) {
                cachedListeners[0](payload);
            }
            
            // Invoke more listeners in loop
            else if (cachedListeners.length > 1) {
                for(let i = 0; i < cachedListeners.length; i++)
                    cachedListeners[i](payload);
            }            

        } else {
            // Collect listeners...
            let cachedListeners = [];

            // Found an 'once' subscription
            let foundOnce = false;

            // Iterator of all listener mappings
            for (let pattern in this.listeners) {
                if (!this.listeners.hasOwnProperty(pattern)) {
                    continue;
                }
                let listenersAndOnce = this.listeners[pattern];

                // Matches?
                if (this.matches(name, pattern)) {
                    for (let i = listenersAndOnce.length - 1; i >= 0; i--) {
                        let listenerAndOnce = listenersAndOnce[i];

                        // Invoke once?
                        if (listenerAndOnce.once) {
                            listenersAndOnce.splice(i, 1);
                            foundOnce = true;
                        }

                        // Add to listener set
                        cachedListeners.push(listenerAndOnce.listener);
                    }
                }
            }

            // Store into cache
            if (!foundOnce) {
                this.listenerCache[name] = cachedListeners;
            }
        }
    }
}