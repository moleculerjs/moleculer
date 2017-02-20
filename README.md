![Moleculer logo](docs/assets/logo.png)

[![Build Status](https://travis-ci.org/ice-services/moleculer.svg?branch=master)](https://travis-ci.org/ice-services/moleculer)
[![Coverage Status](https://coveralls.io/repos/github/ice-services/ice-services/badge.svg?branch=master)](https://coveralls.io/github/ice-services/ice-services?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b108c12cbf554fca9c66dd1925d11cd0)](https://www.codacy.com/app/mereg-norbert/moleculer?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ice-services/moleculer&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://codeclimate.com/github/ice-services/moleculer/badges/gpa.svg)](https://codeclimate.com/github/ice-services/moleculer)
[![David](https://img.shields.io/david/ice-services/moleculer.svg)](https://david-dm.org/ice-services/moleculer)
[![Known Vulnerabilities](https://snyk.io/test/github/ice-services/moleculer/badge.svg)](https://snyk.io/test/github/ice-services/moleculer)

# Moleculer
Moleculer is a fast & powerful microservices framework for NodeJS (>= v6.x).
<!--
![](https://img.shields.io/badge/performance-%2B50%25-brightgreen.svg)
![](https://img.shields.io/badge/performance-%2B5%25-green.svg)
![](https://img.shields.io/badge/performance---10%25-yellow.svg)
![](https://img.shields.io/badge/performance---42%25-red.svg)
-->
**Please do not use this in production since it's still under heavy development!**

# What's included

- Promise-based functions
- request-reply concept
- event bus system
- supports middlewares
- multiple services on a node/server
- built-in caching solution (memory, redis)
- load balanced requests (round-robin, random)
- every nodes are equal, no master/leader node
- auto discovery services
- parameter validation
- request timeout handling with fallback response
- health monitoring & statistics
- supports versioned services (run different versions of the service)


# Installation
```
$ npm install moleculer --save
```

or

```
$ yarn add moleculer
```

# Quick start

### Simple service & call actions locally
```js
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
    .then(res => console.log("9 - 2 =", res));
    .catch(err => console.error(`Error occured! ${err.message}`));

// Chain calls
broker.call("math.add", { a: 3, b: 5})
    .then(res => broker.call("math.sub", { a: res, b: 2 }));
    .then(res => console.log("3 + 5 - 2 =", res));
```

# Main modules

## ServiceBroker
The `ServiceBroker` is the main component of Moleculer. It handles services & events, calls actions and communicates with remote nodes. You need to create an instance of `ServiceBroker` on every node.

### Create broker
```js
// Create broker with default settings
let broker = new ServiceBroker();

// Create broker with custom settings
let broker = new ServiceBroker({
    logger: console,
    logLevel: "info"
});

// Create with transporter
let { NatsTransporter } = require("moleculer");
let broker = new ServiceBroker({
    nodeID: "node-1",
    transporter: new NatsTransporter(),
    logger: console,
    logLevel: "debug",
    requestTimeout: 5 * 1000,
    requestRetry: 3
});

// Create with cacher
let MemoryCacher = require("moleculer").Cachers.Memory;
let broker = new ServiceBroker({
    cacher: new MemoryCacher(),
    logger: console,
    logLevel: {
        "*": "warn", // global log level for every modules
        "CACHER": "debug" // custom log level for cacher modules
    }
});    
```

### Constructor options
All available options:
```js
{
    nodeID: null,

    logger: null,
    logLevel: "info",

    transporter: null,
    requestTimeout: 15 * 1000,
    requestRetry: 0,
    sendHeartbeatTime: 10,
    nodeHeartbeatTimeout: 30,

    cacher: null,

    metrics: false,
    metricsNodeTime: 5 * 1000,
    statistics: false,
    validation: true,
    internalActions: true
    
    ServiceFactory: null,
    ContextFactory: null
}
```

| Name | Type | Default | Description |
| ------- | ----- | ------- | ------- |
| `nodeID` | `String` | Computer name | This is the ID of node. It's related to communication when you have 2 or more nodes. |
| `logger` | `Object` | `null` | Logger class. Under development or test you can set to `console`. In production you can set an external logger e.g. `winston` |
| `logLevel` | `String` or `Object` | `info` | Level of logging (debug, info, warn, error) |
| `transporter` | `Object` | `null` | Instance of transporter. Need if you have 2 or more nodes. Internal transporters: [NatsTransporter](#nats-transporter)  |
| `requestTimeout` | `Number` | `15000` | Timeout of request in milliseconds. If the request is timed out, broker will throw a `RequestTimeout` error. Disable: 0 |
| `requestRetry` | `Number` | `0` | Count of retry of request. If the request is timed out, broker will try to call again. |
| `cacher` | `Object` | `null` | Instance of cacher. Built-in cachers: [MemoryCacher](#memory-cacher) or [RedisCacher](#redis-cacher) |
| `metrics` | `Boolean` | `false` | Enable [metrics](#metrics) function. |
| `metricsNodeTime` | `Number` | `5000` | Metrics event sends period in milliseconds |
| `statistics` | `Boolean` | `false` | Enable broker [statistics](). Measure the requests count & latencies |
| `validation` | `Boolean` | `false` | Enable action [parameters validation](). |
| `internalActions` | `Boolean` | `true` | Register internal actions for metrics & statistics functions |
| `sendHeartbeatTime` | `Number` | `10` | ??? |
| `nodeHeartbeatTimeout` | `Number` | `30` | ??? |
| `ServiceFactory` | `Class` | `null` | Custom Service class. Broker will use it when create a service |
| `ContextFactory` | `Class` | `null` | Custom Context class. Broker will use it when create a context at call |

## Call actions
You can call an action with the `broker.call` method. Broker will search which service (and which node) has the action and calls it. The function returns with a Promise.

### Syntax
```js
let promise = broker.call(actionName, params, opts);
```
The `actionName` is a dot-separated string. The first part of it is the name of service. The seconds part of it is the name of action. So if you have a `posts` service which contains a `create` action, you need to use `posts.create` string as first parameter.

The `params` is an object, which pass to the action in a [Context](#context)

The `opts` is an object. With this, you can set/override some request parameters, e.g.: `timeout`, `retryCount`

Available options:

| Name | Type | Default | Description |
| ------- | ----- | ------- | ------- |
| `timeout` | `Number` | `requestTimeout of broker` | Timeout of request in milliseconds. If the request is timed out and you don't define `fallbackResponse`, broker will throw a `RequestTimeout` error. Disable: 0 |
| `retryCount` | `Number` | `requestRetry of broker` | Count of retry of request. If the request timed out, broker will try to call again. |
| `fallbackResponse` | `Any` | `null` | Return with it, if the request is timed out. [More info](#request-timeout-fallback-response) |


### Usage
```js
// Call without params
broker.call("user.list").then(res => console.log("User list: ", res));

// Call with params
broker.call("user.get", { id: 3 }).then(res => console.log("User: ", res));

// Call with options
broker.call("recommendation", { limit: 5 }, { timeout: 500, fallbackResponse: defaultRecommendation })
    .then(res => console.log("Result: ", res));

// Call with error handling
broker.call("posts.update", { id: 2, name: "New post" })
    .then(res => console.log("Post updated!"))
    .catch(err => console.error("Unable to update Post!", err));    
```

### Request timeout & fallback response
If you call action with timeout and the request is timed out, broker throws a `RequestTimeoutError` error.
But if you set `fallbackResponse` in calling options, broker won't throw error, instead returns with this value. It can be an `Object`, `Array`...etc. 
This can be also a `Function`, which returns a `Promise`. The broker will pass the current `Context` to this function as an argument.

## Emit events
Broker has an internal event bus. You can send events to local & global.

### Send event
You can send event with `emit` and `emitLocal` functions. First parameter is the name of event. Second parameter is the payload. 

```js
// Emit a local event. Only receive the local services
broker.emitLocal("service.started", { service: service, version: 1 });

// Emit a global event. It will be send to all nodes via transporter. 
// The `user` will be serialized with JSON.stringify
broker.emit("user.created", user);
```

### Subscribe to events
To subscribe for events use the `on`, `once` methods. Or in [Service](#service) use the `events` property.
In event names you can use wildcards too.

```js
// Subscribe to `user.created` event
broker.on("user.created", user => console.log("User created:", user));

// Subscribe to `user` events
broker.on("user.*", user => console.log("User event:", user));

// Subscribe to all events
broker.on("**", payload => console.log("Event:", payload));    
```

To unsubscribe use the `off` method.

## Middlewares
Broker supports middlewares. You can add your custom middleware, and it'll be called on every local request. The middleware is a `Function` what returns a wrapped action handler. 

Example middleware from validators modules:
```js
return function validatorMiddleware(handler, action) {
    // Wrap a param validator
    if (_.isObject(action.params)) {
        return ctx => {
            this.validate(action.params, ctx.params);
            return handler(ctx);
        };
    }
    return handler;
}.bind(this);
```

The `handler` is the handler of action, what is defined in [Service](#service) schema. The `action` is the action object from Service schema. The middleware should return with the `handler` or a new wrapped handler. In this example above, we check the action has a `params` props. If yes, we wrap the handler. Create a new handler, what calls the validator function and calls the original `handler`. 
If no `params` prop, we return the original `handler`.

If you don't call the original `handler`, it will break the request. You can use it in cachers. If you find the data in cache, don't call the handler, instead return the cached data.

If you would like to do something with response after the success request, use the `ctx.after` function.

Example code from cacher middleware:
```js
return (handler, action) => {
    return function cacherMiddleware(ctx) {
        const cacheKey = this.getCacheKey(action.name, ctx.params, action.cache.keys);
        const content = this.get(cacheKey);
        if (content != null) {
            // Found in the cache! Don't call handler, return with the context
            ctx.cachedResult = true;
            return content;
        }

        // Call the handler
        return ctx.after(handler(ctx), result => {
            // Save the response to the cache
            this.set(cacheKey, result);

            return result;
        });
    }.bind(this);
};
```

## Internal actions
The broker registers some internal actions to check health of node or get request statistics.

### List of local services
This action lists name of local services.
```js
broker.call("$node.services").then(res => console.log(res));
```

### List of local actions
This action lists name of local actions
```js
broker.call("$node.actions").then(res => console.log(res));
```

### List of nodes
This actions lists all connected nodes.
```js
broker.call("$node.list").then(res => console.log(res));
```

### Health of node
This action returns the health info of process & OS.
```js
broker.call("$node.health").then(res => console.log(res));
```

### Statistics
This action returns the request statistics if the `statistics` is enabled in options.
```js
broker.call("$node.stats").then(res => console.log(res));
```

# Service
The Service is the other main module in the Moleculer. With this you can define actions.

## Schema
You need to create a schema to define a service. The schema has some fix parts (`name`, `version`, `settings`, `actions`, `methods`, `events`).

### Simple service schema
```js
{
	name: "math",
	actions: {
		add(ctx) {
			return Number(ctx.params.a) + Number(ctx.params.b);
		},

		sub(ctx) {
			return Number(ctx.params.a) - Number(ctx.params.b);
		}
	}
}
```

## Base properties
The Service has some base properties in the schema.
```js
{
    name: "posts",
    version: 1
}
```
The `name` is a mandatory property so it must be defined. It's the first part of actionName when you call it with `broker.call`.

The `version` is an optional property. If you running multiple version of a service, it needs to set. It will be a prefix in the actionName.
```js
{
    name: "posts",
    version: 2,
    actions: {
        find() {...}
    }
}
```
You can call the `find` action as
```js
broker.call("v2.posts.find");
```

## Settings
You can add custom settings to your service under `settings` property in schema. You can reach it in the service via `this.settings`.

```js
{
    name: "mailer",
    settings: {
        transport: "mailgun"
    },

    action: {
        send(ctx) {
            if (this.settings.transport == "mailgun") {
                ...
            }
        }
    }
}
```

## Actions
The actions are the callable/public methods of the service. They can be called with `broker.call`.
The action could be a function (handler) or an object with some properties and with handler.
The actions should be placed under `actions` key in the service schema.

```js
{
	name: "math",
	actions: {
        // Simple action, only define a handler
		add(ctx) {
			return Number(ctx.params.a) + Number(ctx.params.b);
		},

        // Complex action, they set other properties. In this case
        // the `handler` is required!
		mult: {
            cache: false,
			params: {
				a: "required|numeric",
				b: "required|numeric"
			},
			handler(ctx) {
                // You can reach action params with `ctx.action.*`
                if (ctx.action.cache)
				    return Number(ctx.params.a) * Number(ctx.params.b);
			}
		}
	}
}
```
You can call this actions as
```js
broker.call("math.add", { a: 5, b: 7 }).then(res => console.log(res));
broker.call("math.mult", { a: 10, b: 31 }).then(res => console.log(res));
```

Inside the action you can sub-call other actions in other services with `ctx.call`.
```js
{
    name: "posts",
    actions: {
        get(ctx) => {
            let post = posts[ctx.params.id];
            // Populate the post.author field through "users" service
            // Call the "users.get" action with author ID
            return ctx.call("users.get", { id: post.author }).then(user => {
                if (user)
                    post.author = user;

                return post;
            })
        }
    }
}
```

## Events
You can subscribe to events and can define event handlers in the schema under `events` key.

```js
{
    name: "users",
    actions: {
        ...
    },

    events: {
        // Subscribe to "user.create" event
        "user.create": function(payload) {
            this.logger.info("Create user...");
            // Do something
        },

        // Subscribe to all "user.*" event
        "user.*": function(payload, eventName) {
            // Do something with payload. The `eventName` contains the original event name.
        }
    }

}
```

## Methods
You can create also private functions in Service. They are called as `methods`. These functions are private, can't be called with `broker.call`. But you can call it inside service.

```js
{
    name: "mailer",
    actions: {
        send(ctx) {
            // Call my `sendMail` method
            return this.sendMail(ctx.params.recipients, ctx.params.subject, ctx.params.body);
        }
    },

    methods: {
        // Send an email to recipients
        sendMail(recipients, subject, body) {
            return new Promise((resolve, reject) => {
                ...
            });
        }
    }
}
```
> The name of method can't be `name`, `version`, `settings`, `schema`, `broker`, `actions`, `logger`, because these words are reserved.

## Lifecycle events
There are some lifecycle service events, what will be triggered by ServiceBroker.

```js
{
    name: "www",
    actions: {...},
    events: {...},
    methods: {...},

    created() {
        // Fired when the service instance created.
    },

    started() {
        // Fired when `broker.start()` called.
    }

    stopped() {
        // Fired when `broker.stop()` called.
    }
}
```

## Properties of `this`
In service functions the `this` is always binded to the instance of service. It has some properties & methods what you can use in functions.

| Name | Type |  Description |
| ------- | ----- | ------- |
| `this.name` | `String` | Name of service from schema |
| `this.version` | `Number` | Version of service from schema |
| `this.settings` | `Object` | Settings of service from schema |
| `this.schema` | `Object` | Schema of service |
| `this.broker` | `ServiceBroker` | Instance of broker |
| `this.logger` | `Logger` | Logger module |
| `this.actions` | `Object` | Actions of service. *Service can call its own actions directly.* |

## Create a service
There are several ways to create/load a service.

### broker.createService()
You can use this method when developing or testing.
Call the `broker.createService` method with the schema of service as argument.

```js
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
```

### Load service
You can place your service code to an individual file and load this file with broker.

**math.service.js**
```js
// Export the schema of service
module.exports = {
    name: "math",
    actions: {
        add(ctx) {
            return Number(ctx.params.a) + Number(ctx.params.b);
        },
        sub(ctx) {
            return Number(ctx.params.a) - Number(ctx.params.b);
        }
    }
}
```

**index.js**
```js
// Create broker
let broker = new ServiceBroker();

// Load service
broker.loadService("./math.service");

// Start broker
broker.start();
```

In the individual files also you can create the [Service](#service) instance. In this case you need to export a function that returns the instance of [Service](#service).
```js
// Export a function, what the `loadService` will be call with the instance of ServiceBroker
module.exports = function(broker) {
    return new Service(broker, {
        name: "math",
        actions: {
            add(ctx) {
                return Number(ctx.params.a) + Number(ctx.params.b);
            },
            sub(ctx) {
                return Number(ctx.params.a) - Number(ctx.params.b);
            }
        }
    });
}
```

Or create a function that returns with the schema of service
```js
// Export a function, what the `loadService` will be call with the instance of ServiceBroker
module.exports = function() {
    let users = [....];

    return {
        name: "math",
        actions: {
            create(ctx) {
                users.push(ctx.params);
            }
        }
    };
}
```

or load manually with `require`
```js
let userSchema = require("./user.service");

broker.createService(userSchema);
```

### Load multiple services from a folder
You can load multiple services from a folder.

**Syntax**
```js
broker.loadServices(folder = "./services", fileMask = "*.service.js");
```

**Example**
```js
// Load every *.service.js file from "./services" folder
broker.loadServices();

// Load every *.service.js file from current folder
broker.loadServices("./");

// Load every user*.js file from the "./svc" folder
broker.loadServices("./svc", "user*.js");
```

## Private properties
If you would like to create private properties in service, we recommend to declare them in the `created` handler.

```js
const http = require("http");

// Simple HTTP server service
module.exports = {
    name: "www",

    settings: {
        port: 3000
    },

    created() {
        // Create HTTP server
        this.server = http.createServer(this.httpHandler);
    },

    started() {
        // Listening...
        this.server.listen(this.settings.port);
    },

    stopped() {
        // Stop server
        this.server.close();
    },

    methods() {
        // HTTP handler
        httpHandler(req, res) {
            res.end("Hello Moleculer!");
        }
    }
}
```

# Context
When you call an action, the broker creates a `Context` instance, which contains all request informations and pass to the action handler as argument.

Available properties & methods of `Context`:

| Name | Type |  Description |
| ------- | ----- | ------- |
| `ctx.id` | `String` | Context ID |
| `ctx.requestID` | `String` | Request ID. If you make sub-calls in a request, it will be the same ID |
| `ctx.parent` | `Context` | Parent context, if it's a sub-call |
| `ctx.broker` | `ServiceBroker` | Instance of broker |
| `ctx.action` | `Object` | Instance of action |
| `ctx.params` | `Any` | Params of request. *Second argument of `broker.call`* |
| `ctx.nodeID` | `String` | Node ID |
| `ctx.logger` | `Logger` | Logger module |
| `ctx.level` | `Number` | Level of request |
| `ctx.call()` | `Function` | You can make a sub-call. Same arguments like `broker.call` |
| `ctx.emit()` | `Function` | Emit an event, like `broker.emit` |

# Logging
In Services every modules have a custom logger instance. It is inherited from the broker logger instance and you can set in options of broker.
Every modules add a prefix to the log messages. Using that prefix you can identify the sender of message.

```js
let { ServiceBroker } = require("moleculer");
let broker = new ServiceBroker({
    logger: console,
    logLevel: "info"
});

broker.createService({
    name: "posts",
    actions: {
        get(ctx) {
            ctx.logger.info("Log message via Context logger");
        }
    },
    created() {
        this.logger.info("Log message via Service logger");
    }
});

broker.call("posts.get").then(() => broker.logger.info("Log message via Broker logger"));
```
Console messages:
```
[POSTS-SVC] Log message via Service logger
[CTX] Log message via Context logger
[BROKER] Log message via Broker logger
```

## Custom log levels
If you want to change log level you need to set `logLevel` in broker options.
```js
let broker = new ServiceBroker({
    logger: console,
    logLevel: "warn" // only print the 'warn' & 'error' log entries
});
```
You can set custom log levels to every module by prefix.
```js
let broker = new ServiceBroker({
    logger: console,
    logLevel: {
        "*": "warn", // global settings
        "BROKER": "info",
        "CTX": "debug",
        "POSTS-SVC": "error",
        "NATS": "info"
    }
});
```

# Cachers
Moleculer has built-in cache solutions. You have to do two things to enable it:

1. Set a cacher instance to the broker in constructor options
2. Set the `cache: true` in action definition.

```js
let { ServiceBroker } = require("moleculer");
let MemoryCacher = require("moleculer").Cachers.Memory;

let broker = new ServiceBroker({
    cacher: new MemoryCacher()
});

broker.createService({
    name: "users",
    // cache: true, // If you enable here, all actions will be cached!
    actions: {
        list: {
            cache: true, // Cache this action
            handler(ctx) {
                this.logger.info("Handler called!");
                return [
                    { id: 1, name: "John" },
                    { id: 2, name: "Jane" }
                ]
            }
        }
    }
});

Promise.resolve()
.then(() => {
    // Will be called the handler, because the cache is empty
    return broker.call("users.list").then(res => console.log("Users count:", res.count));
})
.then(() => {
    // Return from cache, handler won't be called
    return broker.call("users.list").then(res => console.log("Users count:", res.count));
});
```
Console messages:
```
[BROKER] users service registered!
[USERS-SVC] Handler called!
Users count: 2
Users count: 2
```

### Cache keys
The cacher creates keys by service name, action name, and hash of params of context.
The key syntax is
```
    <actionName>:<parameters or hash of parameters>
```
So if you call the `posts.list` action with params `{ limit: 5, offset: 20 }`, the cacher calculate a hash from the params. So next time if you call this action with the same params, it will find in the cache by key. 
```
// Hashed cache key for "posts.find" actionName
posts.find:0d6bcb785d1ae84c8c20203401460341b84eb8b968cffcf919a9904bb1fbc29a
```

However the hash calculation is an expensive operation. So other solution is that specify which parameters want to use for caching. In this case you need to set an object for `cache` property of action, what contains the list of parameter.
```js
{
    name: "posts",
    actions: {
        list: {
            cache: {
                keys: ["limit", "offset"]
            },
            handler(ctx) {
                return this.getList(ctx.params.limit, ctx.params.offset);
            }
        }
    }
}

// If params is { limit: 10, offset: 30 }, the cache will be:
//   posts.list:10-30
```
> This second solution is faster, so we recommend to use it in production environment.

### Manual caching
You can also use the cacher manually. Just call the `get`, `set`, `del` methods of `broker.cacher`.

```js
// Save to cache
broker.cacher.set("mykey", { a: 5 });

// Get from cache (some cacher maybe returns with Promise)
let obj = broker.cacher.get("mykey", { a: 5 });

// Remove from cache
broker.cacher.del("mykey");

// Clean the cache
broker.cacher.clean();
```

### Clear cache
When you create a new model in your service, sometimes you have to clear the cache entries. For this purpose there is an internal event which the cacher listens.

```js
{
    name: "users",
    actions: {
        create(ctx) {
            // Create new user
            let user = new User(ctx.params);

            // Clear all cache entries
            ctx.emit("cache.clean");

            // Clear all cache entries which keys start with `users.`
            ctx.emit("cache.clean", "users.*");

            // Delete only one entry
            ctx.emit("cache.del", "users.list");
        }
    }
}
```

## Memory cacher
`MemoryCacher` is a built-in memory cache module.

```js
let MemoryCacher = require("moleculer").Cachers.Memory;

let broker = new ServiceBroker({
    cacher: new MemoryCacher({
        ttl: 30 // Time-to-live is 30sec. Disabled: 0 or null
    })
});
```

## Redis cacher
`RedisCacher` is a built-in [Redis](https://redis.io/) based cache module. It uses [`ioredis`](https://github.com/luin/ioredis) cleint.

```js
let RedisCacher = require("moleculer").Cachers.Redis;

let broker = new ServiceBroker({
    cacher: new RedisCacher({
        ttl: 30, // Time-to-live is 30sec. Disabled: 0 or null
        prefix: "SERVICER" // Prefix for cache keys
        monitor: false // Turn on/off Redis client monitoring. Will be logged (on debug level) every client operations.

        // Redis settings, pass to `new Redis()`
        redis: { 
            host: "redis",
            port: 6379,
            password: "1234",
            db: 0
        }
    })
});
```

## Custom cacher
You can also create your custom cache module. We recommend to you to copy the source of [`MemoryCacher`](src/cachers/memory.js) or [`RedisCacher`](src/cachers/redis.js) and implement the `get`, `set`, `del` and `clean` methods.

# Transporters
Transporter is an important module if you are running services on more nodes. Transporter communicates with every nodes. Send events, call requests...etc.

## NATS Transporter
Moleculer has a built-in transporter for [NATS](http://nats.io/).
> NATS Server is a simple, high performance open source messaging system for cloud native applications, IoT messaging, and microservices architectures.

```js
let { ServiceBroker} = require("moleculer");
let NatsTransporter = require("moleculer").Transporters.NATS;

let broker = new ServiceBroker({
	nodeID: "server-1",
	transporter: new NatsTransporter(),
	requestTimeout: 5 * 1000
});
```

### Transporter options
Every transporter options pass to `nats.connect()` method.

```js
// Connect to 'nats://localhost:4222'
new NatsTransporter(); 

// Connect to remote server and change the prefix
new NatsTransporter({
    url: "nats://nats-server:4222",
    prefix: "SERVICER" // Use for channel names at subscribe & publish. Default: "SVC"
});

// Connect to remote server with user & pass
new NatsTransporter({
    url: "nats://nats-server:4222",
    user: "admin",
    pass: "1234"
});
```
## Custom transporter
You can also create your custom transporter module. We recommend to you that copy the source of [`NatsTransporter`](src/transporters/nats.js) and implement the `connect`, `disconnect`, `emit`, `subscribe`, `request` and `sendHeartbeat` methods.

# Metrics
Moleculer has a metrics function. You can turn on in broker options with `metrics: true` property.
If enabled, the broker sends metrics events in every `metricsNodeTime`.

## Metrics events

### Health info
Broker emits a global event as `metrics.node.health` with health info of node.

Example health info:
```json
{
    "cpu": {
        "load1": 0,
        "load5": 0,
        "load15": 0,
        "cores": 4,
        "utilization": 0
    },
    "mem": {
        "free": 1217519616,
        "total": 17161699328,
        "percent": 7.094400109979598
    },
    "os": {
        "uptime": 366733.2786046,
        "type": "Windows_NT",
        "release": "6.1.7601",
        "hostname": "Developer-PC",
        "arch": "x64",
        "platform": "win32",
        "user": {
            "uid": -1,
            "gid": -1,
            "username": "Developer",
            "homedir": "C:\\Users\\Developer",
            "shell": null
        }
    },
    "process": {
        "pid": 13096,
        "memory": {
            "rss": 47173632,
            "heapTotal": 31006720,
            "heapUsed": 22112024
        },
        "uptime": 25.447
    },
    "net": {
        "ip": [
            "192.168.2.100",
            "192.168.232.1",
            "192.168.130.1",
            "192.168.56.1",
            "192.168.99.1"
        ]
    },
    "time": {
        "now": 1487338958409,
        "iso": "2017-02-17T13:42:38.409Z",
        "utc": "Fri, 17 Feb 2017 13:42:38 GMT"
    }
}
```

# Statistics
Moleculer has a statistics module that collects and aggregates the count & latency info of the requests.
You can enable it in boker options with `statistics: true` property. You need to enable [metrics](#metrics) functions too!

Broker emits global events as `metrics.node.stats`. The payload contains the statistics.

Example statistics:
```json
{
  "requests": {
    "total": {
      "count": 45,
      "errors": {},
      "rps": {
        "current": 0.7999854548099126,
        "values": [
          0,
          6.59868026394721,
          2.200440088017604
        ]
      },
      "latency": {
        "mean": 0.8863636363636364,
        "median": 0,
        "90th": 1,
        "95th": 5,
        "99th": 12,
        "99.5th": 12
      }
    },
    "actions": {
      "posts.find": {
        "count": 4,
        "errors": {},
        "rps": {
          "current": 0.599970001499925,
          "values": [
            1.7985611510791368,
            0.20004000800160032
          ]
        },
        "latency": {
          "mean": 7.5,
          "median": 5,
          "90th": 12,
          "95th": 12,
          "99th": 12,
          "99.5th": 12
        }
      }
    }
  }
}
```

# Nodes
Moleculer supports many architectures.
## Monolith architecture
In this version you are running every services on one node in one broker. In this case every service can call other services locally. So there is no network latency and no transporter.

![](docs/assets/monolith-architecture.png)

## Microservices architecture
This is the well-known microservices architecture when every service running on individual nodes and communicates others via transporter.

![](docs/assets/microservices-architecture.png)

## Mixed architecture
In this case we are running coherent services on the same node. For example, if the `posts` service calls many times the `users` service, we put them together, that we cut down the network latency. If this node is overloaded, we will create replicas.


![](docs/assets/mixed-architecture.png)

# Docker
TODO

# Best practices
- service files
- configuration
- benchmark

# Benchmarks
TODO

# Test
```
$ npm test
```

or in development

```
$ npm run ci
```

# Contribution
Please send pull requests improving the usage and fixing bugs, improving documentation and providing better examples, or providing some testing, because these things are important.

# License
Moleculer is available under the [MIT license](https://tldrlegal.com/license/mit-license).

# Contact
Copyright (c) 2017 Icebob

[![@icebob](https://img.shields.io/badge/github-icebob-green.svg)](https://github.com/icebob) [![@icebob](https://img.shields.io/badge/twitter-Icebobcsi-blue.svg)](https://twitter.com/Icebobcsi)