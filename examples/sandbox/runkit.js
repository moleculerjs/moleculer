"use strict";

const { ServiceBroker, Service } = require("moleculer");

// Create broker
let broker = new ServiceBroker({ 
    logger: console 
});

// Create a service
broker.createService({
    name: "math",
    actions: {
        // You can call it as broker.call("math.add")
        add(ctx) {
            return Number(ctx.params.a) + Number(ctx.params.b);
        },

        // You can call it as broker.call("math.sub")
        sub(ctx) {
            return Number(ctx.params.a) - Number(ctx.params.b);
        }
    }
});

// Start broker
broker.start();

// Call actions of service
broker.call("math.add", { a: 5, b: 3 })
    .then(res => console.log("5 + 3 =", res));

// Call actions with error handling
broker.call("math.sub", { a: 9, b: 2 })
    .then(res => console.log("9 - 2 =", res))
    .catch(err => console.error(`Error occured! ${err.message}`));

// Chain calls
broker.call("math.add", { a: 3, b: 5})
    .then(res => broker.call("math.sub", { a: res, b: 2 }))
    .then(res => console.log("3 + 5 - 2 =", res));