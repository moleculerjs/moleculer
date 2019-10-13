![Moleculer logo](docs/assets/logo.png)

[![Build Status](https://travis-ci.org/moleculerjs/moleculer.svg?branch=master)](https://travis-ci.org/moleculerjs/moleculer)
[![Coverage Status](https://coveralls.io/repos/github/moleculerjs/moleculer/badge.svg?branch=master)](https://coveralls.io/github/moleculerjs/moleculer?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/ec4dab24e4ea4c1eb0d1590f12c81a46)](https://www.codacy.com/app/mereg-norbert/moleculer?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=moleculerjs/moleculer&amp;utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/05ef990fe1ccb3e56067/maintainability)](https://codeclimate.com/github/moleculerjs/moleculer/maintainability)
[![David](https://img.shields.io/david/moleculerjs/moleculer.svg)](https://david-dm.org/moleculerjs/moleculer)
[![Known Vulnerabilities](https://snyk.io/test/github/moleculerjs/moleculer/badge.svg)](https://snyk.io/test/github/moleculerjs/moleculer)
[![Join the chat at https://gitter.im/moleculerjs/moleculer](https://badges.gitter.im/moleculerjs/moleculer.svg)](https://gitter.im/moleculerjs/moleculer?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Downloads](https://img.shields.io/npm/dm/moleculer.svg)](https://www.npmjs.com/package/moleculer)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmoleculerjs%2Fmoleculer.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmoleculerjs%2Fmoleculer?ref=badge_shield)
[![Patreon](docs/assets/patreon.svg)][patreon] [![PayPal](docs/assets/paypal_donate.svg)][paypal]

# Moleculer [![NPM version](https://img.shields.io/npm/v/moleculer.svg)](https://www.npmjs.com/package/moleculer) [![Twitter URL](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&logo=twitter)](https://twitter.com/intent/tweet?text=Moleculer%20is%20a%20modern%20microservices%20framework%20for%20Node.js&url=https://github.com/moleculerjs/moleculer&via=MoleculerJS&hashtags=nodejs,javascript,microservices)


Moleculer is a progressive microservices framework for Node.js.
<!--
![](https://img.shields.io/badge/performance-%2B50%25-brightgreen.svg)
![](https://img.shields.io/badge/performance-%2B5%25-green.svg)
![](https://img.shields.io/badge/performance---10%25-yellow.svg)
![](https://img.shields.io/badge/performance---42%25-red.svg)
-->

**Website**: [https://moleculer.services](https://moleculer.services)

**Documentation**: [https://moleculer.services/docs](https://moleculer.services/docs)

# What's included

- Promise-based solution
- request-reply concept
- support streams
- support event driven architecture with balancing
- built-in service registry & dynamic service discovery
- load balanced requests & events (round-robin, random, cpu-usage, latency)
- many fault tolerance features (Circuit Breaker, Bulkhead, Retry, Timeout, Fallback)
- supports middlewares
- supports versioned services
- service mixins
- built-in caching solution (memory, Redis)
- pluggable transporters (TCP, NATS, MQTT, Redis, NATS Streaming, Kafka)
- pluggable serializers (JSON, Avro, MsgPack, Protocol Buffer, Thrift)
- pluggable validator
- multiple services on a node/server
- master-less architecture, all nodes are equal
- parameter validation with [fastest-validator](https://github.com/icebob/fastest-validator)
- built-in health monitoring & metrics
- official [API gateway module](https://github.com/moleculerjs/moleculer-web) and many other modules...

# Installation
```
$ npm install moleculer --save
```
or
```
$ yarn add moleculer
```

# Create your first microservice
This example shows you how to create a small service with an `add` action which can add two numbers and how to call it.
```js
const { ServiceBroker } = require("moleculer");

// Create a broker
let broker = new ServiceBroker({ logger: console });

// Create a service
broker.createService({
    name: "math",
    actions: {
        add(ctx) {
            return Number(ctx.params.a) + Number(ctx.params.b);
        }
    }
});

// Start broker
broker.start()
    // Call service
    .then(() => broker.call("math.add", { a: 5, b: 3 }))
    .then(res => console.log("5 + 3 =", res))
    .catch(err => console.error(`Error occurred! ${err.message}`));
```
[Try it in your browser](https://codesandbox.io/s/ky5lj09jv?fontsize=14)

# Create a Moleculer project
Use the Moleculer CLI tool to create a new Moleculer based microservices project.

1. Create a new project (named `moleculer-demo`)
    ```bash
    $ npx moleculer init project moleculer-demo
    ```
    > Press Y on API Gateway & `npm install`
    
2. Open project folder
    ```bash
    $ cd moleculer-demo
    ```
    
3. Start project
    ```bash
    $ npm run dev
    ```

4. Open the [http://localhost:3000/](http://localhost:3000/) link in your browser. It shows a start page which contains two links to call the `greeter` service via [API gateway](https://github.com/moleculerjs/moleculer-web).

:tada:**Congratulations! Your first Moleculer based microservices project is created. Read our [documentation](https://moleculer.services/docs) to learn more about Moleculer.**

# Official modules
We have many official modules for Moleculer. [Check our list!](https://moleculer.services/modules.html)

# Supporting
Moleculer is an open source project. It is free to use for your personal or commercial projects. However, developing it takes up all our free time to make it better and better on a daily basis. If you like Moleculer framework, **[please support it](https://moleculer.services/support.html)**.

Thank you very much!

# Documentation
You can find here [the documentation](https://moleculer.services/docs).

# Changelog
See [CHANGELOG.md](CHANGELOG.md).

# Contributions
We welcome you to join to the development of Moleculer. Please read our [contribution guide](http://moleculer.services/docs/contributing.html).
<a href="https://github.com/moleculerjs/moleculer/graphs/contributors"><img src="https://opencollective.com/moleculer/contributors.svg?width=890&button=false" /></a>

# License
Moleculer is available under the [MIT license](https://tldrlegal.com/license/mit-license).

[3rd party licenses](https://app.fossa.io/reports/09fc5b4f-d321-4f68-b859-8c61fe3eb6dc)

# Contact
Copyright (c) 2016-2019 MoleculerJS

[![@moleculerjs](https://img.shields.io/badge/github-moleculerjs-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)

[paypal]: https://paypal.me/meregnorbert/50usd
[patreon]: https://www.patreon.com/bePatron?u=6245171
