/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";


/**
 * ServiceProxy
 * 
 * NOTE: ServiceProxy could be many more things. This code basically is syntactic sugar.
 * 
 * Example:
 * broker.call("math.add", {a:1, b:2})
 * 
 * let proxy_math=ServiceProxy(broker, "math")
 * proxy_math.add({a:1, b:2}))
 * 
 * @param {ServiceBroker | Context}  provider 
 * @param {string} service 
 * @returns {ServiceProxy}
 * 
 */

 function ServiceProxy(provider, service) {
    // TODO: check provider.call(...) available
    var sprefix = '' + service + '.';

    return new Proxy({}, {

        get: function (target, property, receiver) {
            //target??? receiver???

            return function (args, opts) {
                return provider.call(sprefix + property, args, opts)
            }

        }

    });
}

module.exports = ServiceProxy;
