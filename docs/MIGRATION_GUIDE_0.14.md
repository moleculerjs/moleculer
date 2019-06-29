# Migration guide to v0.14.x
This documentation leads you how you can migrate your project to be compatible with the Moleculer v0.14.x versions.

>Please note, the communication protocol has been changed. It means the new Moleculer 0.14 nodes can't communicate with old <= 0.13 nodes.

## 1. Check your validation setting in broker options.
The `validation: true` broker options was removed to follow other module configuration. Use `validator` option, instead.

### Disable validator

**Old options**
```js
// moleculer.config.js
module.exports = {
    validation: false
};
```

**New options**
```js
// moleculer.config.js
module.exports = {
    validator: false
};
```

### Use custom validator

**Old options**
```js
// moleculer.config.js
module.exports = {
    validation: true
    validator: new MyCustomValidator()
};
```

**New options**
```js
// moleculer.config.js
module.exports = {
    validator: new MyCustomValidator()
};
```

## 2. Don't use `broker.use`, use `middleware` broker option instead
The `broker.use` has been deprecated in version 0.13 and now it is removed. Use `middleware: []` broker options to define middlewares. 

**Legacy middleware adding**
```js
const broker = new ServiceBroker({});

broker.use(myMiddleware);
```

**New middleware adding**
```js
// moleculer.config.js
module.exports = {
    middlewares: [
        myMiddleware1,
        myMiddleware2,
    ]
};
```

## 3. Don't use middleware shorthand functions
In previous versions you could define middleware which wraps the `localAction` hook with a simple `Function`.
In version 0.14 this legacy shorthand is dropped. When you define a middleware as a `Function`, the middleware handler will call it as an initialization and pass the ServiceBroker instance as a parameter.

**Legacy shorthand middleware definition as a `Function`**
```js
const MyMiddleware = function(next, action) {
    return ctx => next(ctx);
};
```

**Accepted middleware definition**
```js
const MyMiddleware = {
    localAction: function(next, action) {
        return ctx => {
            myLogger.info(`${action.name} has been called`);
            return next(ctx);
        }
    }
};
```

**Accepted middleware definition as a `Function`**

In this case, you have a pointer to the `broker`.
```js
const MyMiddleware = function(broker) {
    // Create a custom named logger
    const myLogger = broker.getLogger("MY-LOGGER");

    return {
        localAction: function(next, action) {
            return ctx => {
                myLogger.info(`${action.name} has been called`);
                return next(ctx);
            }
        }
    }
};
```

## 4. Use the new context-based event handler signature
Moleculer detects the signature if your event handler. If it finds that the signature is `"user.created(ctx) { ... }`, it will call it with Event Context. If not, it will call with old arguments & the 4th argument will be the Event Context, like `"user.created"(payload, sender, eventName, ctx) {...}`

**Legacy event handler signature**
```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(payload, sender, eventName) {
            ...
        }
    }
};
```

**Legacy event handler signature with context**
```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(payload, sender, eventName, ctx) {
            ...
        }
    }
};
```

**New context-based event handler signature**
```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(ctx) {
            // legacy `payload` is in `ctx.params`
            // legacy `sender` is in `ctx.nodeID`
            // legacy `eventName` is in `ctx.eventName`
        }
    }
};
```

### The `localEvent` handler signature in middlewares

Please check the `localEvent` handler signature in your custom middlewares, as well. It should follow the new context-based signature.

**New context-based signature in middleware `localEvent` hook**
```js
// my-middleware.js
module.exports = {
    // Wrap local event handlers
    localEvent(next, event) {
        return (ctx) => {
            return next(ctx);
        };
    },
};
```

## 5. The `node.health` response changed
The `$node.health` action's response has been changed. The `transit` property is removed. To get transit metrics, use the new `$node.metrics` internal action.

## 6. Use the new metrics & tracing features

**Old broker options**
```js
// moleculer.config.js
module.exports = {
    metrics: true,
    metricsRate: 1.0
};
```

**New broker options**
```js
// moleculer.config.js
module.exports = {
    metrics: {
        enabled: true,
    },
    tracing: {
        enabled: true,

        exporters: [
            {
                type: "Zipkin",
                options: {
                    baseURL: "http://zipkin-server:9411",
                }
            },
            {
                type: "Jaeger",
                options: {
                    host: "jaeger-server",
                    port: 6832
                }
            }
        ],

        sampling: {
            rate: 1.0, // 0.0 - Never, 1.0 > x > 0.0 - Fix, 1.0 - Always
            tracesPerSecond: null, // 1: 1 trace / sec, 5: 5 traces / sec, 0.1: 1 trace / 10 secs
            minPriority: null
        },

        actions: true,
        events: false,

        errorFields: ["name", "message", "code", "type", "data"],
        stackTrace: false,

        defaultTags: null,
    }
};
```

**Old way to add params & meta fields to tracing spans**
```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        get: {
            metrics: {
                params: ["id"],
                meta: ["loggedIn.username"],
            },
            async handler(ctx) {
                // ...
            }
        }
    }
});
```

**New way to add params, meta or response fields to tracing spans**
```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        get: {
            tracing: {
                tags: {
                    params: ["id"],
                    meta: ["loggedIn.username"],
                    response: ["id", "title"] // add data to tags from the action response.
            },
            async handler(ctx) {
                // ...
            }
        }
    }
});
```



**:tada: Well, you are done! :clap:**

Happy coding in your up-to-date Moleculer project. If you need help, join to [Discord chat](https://discord.gg/j5cJYdu) and don't hesitate to ask Moleculer community.
