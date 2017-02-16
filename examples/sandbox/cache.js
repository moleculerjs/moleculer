let { ServiceBroker } = require("../../index");
let MemoryCacher = require("../../index").Cachers.Memory;

let broker = new ServiceBroker({
	logger: console,
    cacher: new MemoryCacher()
});

broker.createService({
    name: "users",
    actions: {
        list: {
            cache: true,
            handler(ctx) {
                this.logger.info("Handler called!");
                return [
                    { id: 1, name: "John" },
                    { id: 2, name: "Jane" }
                ];
            }
        }
    }
});

Promise.resolve()
.then(() => {
    // Call the handler, because the cache is empty
    return broker.call("users.list").then(res => console.log("Users count:", res.length));
})
.then(() => {
    // Return from cache, handler didn't call
    return broker.call("users.list").then(res => console.log("Users count:", res.length));
});