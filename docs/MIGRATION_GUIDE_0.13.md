# Migration guide to v0.13.x
This documentation leads you how you can migrate your project to be compatible with the Moleculer v0.13.x versions.

> Please note! The previous version of `moleculer-web` doesn't work with Moleculer 0.13. You need to upgrade it to 0.8.x version too.

## 1. Always start the broker before call services
> If you are using [Moleculer Runner](http://moleculer.services/docs/0.12/runner.html) with `moleculer.config.js`, skip this part.

The ServiceBroker & Service lifecycle handler logic has been changed.

**It works in the previous version**
```js
const { ServiceBroker } = require("moleculer");

const broker = new ServiceBroker();

broker.loadService("./math.service.js");

broker.call("math.add", { a: 5, b: 3 }).then(res => console.log);
// Prints: 8
```
Since v0.13 it will throw a `ServiceNotFoundError` exception because the service is only loaded but not started yet.

**Correct logic**
```js
const { ServiceBroker } = require("moleculer");

const broker = new ServiceBroker();

broker.loadService("./math.service.js");

broker.start().then(() => {
    broker.call("math.add", { a: 5, b: 3 }).then(res => console.log);
    // Prints: 8
});
```

It can cause problems in your tests as well. Make sure you use `broker.start()` and `broker.stop()` in all test cases.

**Good test case**
```js
describe("Test 'posts.find' action", () => {
    let broker = new ServiceBroker({ logger: false });
    let actionHandler = jest.fn(ctx => ctx);
    broker.createService({
        name: "posts",
        actions: {
            find: actionHandler
        }
    });

    /* The important part! */
    beforeAll(() => broker.start());
    afterAll(() => broker.stop());

    it("should call action handler", () => {
        return broker.call("posts.find", { id: 5 }).then(ctx => {
            expect(ctx.params).toEqual({ id: 5 });

            expect(actionHandler).toHaveBeenCalledTimes(1);
            expect(actionHandler).toHaveBeenCalledWith(ctx);
        });
    });
});
```


## 2. `console` is the new default logger
No more need to set `logger: console` in broker options because ServiceBroker uses `console` as default logger.

**Side effect:** broker instances in your tests will print log messages. 

To disable logging (default behavior in previous version) set `logger: false` in broker options.


**Disable loggging**
```js
const broker = new ServiceBroker({ logger: false });
```

## 3. Internal event sending logic is changed
If you use `$` prefixed custom events in your project, be careful because now these events will be transferred to remote nodes too if you emit them with `broker.emit` or `broker.broadcast` methods. To previous behavior emit them with `broker.broadcastLocal` method.

**By the way, we don't recommend to use `$` custom events because the prefix is reserved for core modules & features.**

## 4. Circuit Breaker logic & options have been changed

**Old options**
```js
const broker = new ServiceBroker({
    circuitBreaker: {
        enabled: true,
        maxFailures: 5,
        halfOpenTime: 10 * 1000,
        failureOnTimeout: true,
        failureOnReject: true
    }
});
```

**New options**
```js
const broker = new ServiceBroker({
    nodeID: "node-1",
    circuitBreaker: {
        enabled: true,
        threshold: 0.5,
        minRequestCount: 20,
        windowTime: 60, // in seconds
        halfOpenTime: 5 * 1000,
        check: err => err && err.code >= 500
    }
});
```

**Steps:**
1. Change `maxFailures` (count) to `threshold` (percent from 0.0 to 1.0)
2. Change `failureOnTimeout` & `failureOnReject` to a `check` function.

> **Tips**
>
> All options can be overwritten in action:
>    ```js
>    module.export = {
>        name: "users",
>        actions: {
>            create: {
>                circuitBreaker: {
>                    threshold: 0.3,
>                    windowTime: 30
>                },
>                handler(ctx) {}
>            }
>        }
>    };
>    ```

## 6. Retry options has been changed
Now it uses exponential backoff for retries. 

**Old options**
```js
const broker = new ServiceBroker({
    requestRetry: 5
});
```

**New options**
```js
const broker = new ServiceBroker({
    nodeID: "node-1",
    retryPolicy: {
        enabled: true,
        retries: 5,
        delay: 100,
        maxDelay: 2000,
        factor: 2,
        check: err => err && !!err.retryable
    }
});
```

Overwrite the retries value in calling option The `retryCount` calling options has been renamed to `retries`.
```js
broker.call("posts.find", {}, { retries: 3 });
```

> **Tips**
>
> All options can be overwritten in action:
>    ```js
>    module.export = {
>        name: "users",
>        actions: {
>            find: {
>                retryPolicy: {
>                    // All Retry policy options can be overwritten from broker options.
>                    retries: 3,
>                    delay: 500
>                },
>                handler(ctx) {}
>            },
>            create: {
>                retryPolicy: {
>                    // Disable retries for this action
>                    enabled: false
>                },
>                handler(ctx) {}
>            }
>        }
>    };
>    ```

## 7. Context tracking changes

**Old options**
```js
const broker = new ServiceBroker({
    trackContext: true
});
```

**New options**
```js
const broker = new ServiceBroker({
    nodeID: "node-1",
    tracking: {
        enabled: true,
        shutdownTimeout: 5000
    }
});
```

Disable tracking in calling option at calling
```js
broker.call("posts.find", {}, { tracking: false });
```

> The shutdown timeout can be overwritten by $shutdownTimeout property in service settings.

## 8. Internal statistics module has been removed
If you need it, download from [here](https://gist.github.com/icebob/99dc388ee29ae165f879233c2a9faf63), load as a service and call the `stat.snapshot` to receive the collected statistics.

## 9. Renamed errors
Some errors have been renamed in order to follow name conventions.
- `ServiceNotAvailable` -> `ServiceNotAvailableError`
- `RequestRejected` -> `RequestRejectedError`
- `QueueIsFull` -> `QueueIsFullError`
- `InvalidPacketData` -> `InvalidPacketDataError`

If you check the `err.name` or `instanceof` in your code, you should check these parts and update to the new error names.

## 10. Context nodeID changes
The `ctx.callerNodeID` has been removed. The `ctx.nodeID` always contains the target or caller nodeID. 

**Steps:**
1. Search `callerNodeID` in your project and change them to `ctx.nodeID`.

## 11. Enhanced ping method
It returns `Promise` with results of ping responses. Moreover, the method is renamed to `broker.ping`.

**Ping all known nodes**
```js
broker.ping().then(res => broker.logger.info(res));
```

**Output:**
```js
{ 
    server: { 
        nodeID: 'server', 
        elapsedTime: 10, 
        timeDiff: -2 
    } 
}
```

**Steps:**
1. If you uses `broker.sendPing` in your project, rename it to `broker.ping` and handle the returned `Promise`. 

## 12. Cacher changes

### Cacher key generation logic has been changed
The cacher key generation has been changed. If you uses Redis cacher, the old <=0.12 cacher won't find the new 0.13 cache entries.

### Cacher matcher has been changed
The cacher matcher code is changed in `cacher.clean` method. The previous (wrong) matcher didn't handle dots (.) properly in patterns. E.g the `posts.*` pattern cleaned the `posts.find.something` keys too. Now it has been fixed, but it means that you should use `posts.**` pattern because the `params` and `meta` values can contain dots.

## 13. Moleculer errors signature has been changed
Some Moleculer Error class constructor signature has been changed. 

**Steps:**
1. If you create Moleculer errors in your projects, please check the constructor signature of these errors.

## 13 + 1. Migrate your middleware to Middleware v2 (optional)
> It's not a breaking change because old middleware works with Moleculer v0.13, but it's recommended to do.

The new middleware is an `Object` with hooks instead of a simple `Function`.

**Legacy old middleware**

```js
const broker = new ServiceBroker({
    middlewares: [
        function(handler, action) {
            // Wrap the handler if neccessary
        }
    ]
});
```

**Migrated new middleware**

```js
const broker = new ServiceBroker({
    middlewares: [
        {
            localAction: function(handler, action) {
                // Wrap the handler if neccessary
            }
        }
    ]
});
```

> The `broker.use` method to register middlewares has been deprecated. Please use `middlewares:[]` in broker options instead.


**List of all available hooks in new middlewares:**
```js
const MyCustomMiddleware = {
    // Wrap local action handlers (legacy middleware handler)
    localAction(next, action) {

    },

    // Wrap remote action handlers
    remoteAction(next, action) {

    },

    // Wrap local event handlers
    localEvent(next, event) {

    }

    // Wrap broker.createService method
    createService(next) {

    }

    // Wrap broker.destroyService method
    destroyService(next) {

    }

    // Wrap broker.call method
    call(next) {

    }

    // Wrap broker.mcall method
    mcall(next) {

    }

    // Wrap broker.emit method
    emit(next) {

    },

    // Wrap broker.broadcast method
    broadcast(next) {

    },

    // Wrap broker.broadcastLocal method
    broadcastLocal(next) {

    },

    // After a new local service created (sync)
    serviceCreated(service) {

    },

    // Before a local service started (async)
    serviceStarting(service) {

    },

    // After a local service started (async)
    serviceStarted(service) {

    },

    // Before a local service stopping (async)
    serviceStopping(service) {

    },

    // After a local service stopped (async)
    serviceStopped(service) {

    },

    // After broker is created (async)
    created(broker) {

    },

    // Before broker starting (async)
    starting(broker) {

    },

    // After broker started (async)
    started(broker) {

    },

    // Before broker stopping (async)
    stopping(broker) {

    },

    // After broker stopped (async)
    stopped(broker) {

    }
}
```
-----------

**:tada: Well, you are done! :clap:**

Happy coding in your brand new Moleculer project. If you need help, join to [Gitter chat](https://gitter.im/moleculerjs/moleculer) and don't hesitate to ask Moleculer community.
