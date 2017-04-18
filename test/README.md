## The `node-tap` framework

The tests use the `[node-tap](http://www.node-tap.org)` framework ('A Test-Anything-Protocol library for Node.js', written by Isaac Schlueter).

Reporting (`--report`):

- classic
- spec
- tap


### [API](http://www.node-tap.org/api/)

- tap = require(‘tap’)
- Class t.Test (tap.node)
- t.test([name], [options], [function])
- t.jobs
- t.tearDown(function)
- t.beforeEach(function (done) {})
- t.afterEach(function (done) {})
- t.plan(number)
- t.end()
- t.bailout([reason])
- t.passing()
- t.comment(message)
- t.fail(message, extra)
- t.pass(message)
- t.pragma(set)
- t.threw(error)

### [Assertions](http://www.node-tap.org/asserts/)

- t.ok(obj, message, extra)
- t.notOk(obj, message, extra)
- t.error(obj, message, extra)
- t.throws(fn, [expectedError], message, extra)
- t.doesNotThrow(fn, message, extra)
- t.equal(found, wanted, message, extra)
- t.notEqual(found, notWanted, message, extra)
- t.same(found, wanted, message, extra)
- t.notSame(found, notWanted, message, extra)
- t.strictSame(found, wanted, message, extra)
- t.strictNotSame(found, notWanted, message, extra)
- t.match(found, pattern, message, extra)
- t.notMatch(found, pattern, message, extra)
- t.type(object, type, message, extra)

### [Advanced](http://www.node-tap.org/advanced/)

- Class t.Spawn()
- Class t.Stdin()
- t.spawn(command, arguments, [options], [name])
- t.stdin()
- t.addAssert(name, length, fn)
- t.pass(message)
- t.endAll()

## The `should` module

The [`should`](https://github.com/shouldjs/should.js) module provides BDD ['should'-style assertions](https://shouldjs.github.io), which are a nice idea, but the current version of `tap` does not properly await for async functions, so it cannot be used. :-(

