/*
 * This file is part of the xPack distribution
 *   (http://xpack.github.io).
 * Copyright (c) 2017 Liviu Ionescu.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict'
/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

var asy = {}
module.exports = asy

// run (async) a generator to completion
// Note: simplified approach: no error handling here
asy.runGenerator = function (g) {
  var it = g()
  var ret

  // asynchronously iterate over generator
  (function iterate (val) {
    ret = it.next(val)

    if (!ret.done) {
      // poor man's "is it a promise?" test
      if ('then' in ret.value) {
        // wait on the promise
        ret.value.then(iterate)
      } else {
        // immediate value: just send right back in
        // Use timer to avoid synchronous recursion
        setTimeout(function () {
          iterate(ret.value)
        }, 0)
      }
    }
  })()
}

asy.nfcall = function (f, ...args) {
  return new Promise(function (resolve, reject) {
    f(null, ...args, function (err, ...args) {
      if (err) {
        reject(err)
      } else {
        resolve(args.length < 2 ? args[0] : args)
      }
    })
  })
}

// Inspired by:
// https://github.com/digitaldesignlabs/es6-promisify/blob/master/lib/promisify.js

// Another possible implementations:
// - https://github.com/kriskowal/q (a bit oldish)
// - https://github.com/jeandesravines/promisify/blob/master/lib/helper/promisify.js
// - https://github.com/urban/promisify/blob/master/src/index.js

/**
 * Scope: local
 * thatLooksLikeAPromiseToMe()
 *
 * Duck-types a promise.
 *
 * @param {Object} o Reference to object to check.
 * @returns {bool} True if this resembles a promise
 */
function thatLooksLikeAPromiseToMe (o) {
  return o && typeof o.then === 'function' && typeof o.catch === 'function'
}

/**
 * promisify()
 *
 * Transform a callback-based function
 * -- func(arg1, arg2 .. argN, callback) -- into
 * an ES6-compatible Promise. Promisify provides a default callback
 * of the form (error, result)
 * and rejects when `error` is truthy. You can also supply settings
 * object as the second argument.
 *
 * @param {function} original - The function to promisify
 * @param {Object} settings - Settings object
 * @param {Object} settings.thisArg - A `this` context to use.
 *  If not set, assume `settings` _is_ `thisArg`
 * @param {bool} settings.multiArgs - Should multiple arguments
 *  be returned as an array?
 * @returns {function} A promisified version of `original`
 */
asy.promisify = function (original, settings) {
  return function (...args) {
    const returnMultipleArguments = settings && settings.multiArgs

    let target
    if (settings && settings.thisArg) {
      target = settings.thisArg
    } else if (settings) {
      target = settings
    }

    // Return the promisified function
    return new Promise(function (resolve, reject) {
      // Append the callback bound to the context
      args.push(function callback (err, ...values) {
        if (err) {
          return reject(err)
        }

        if (!!returnMultipleArguments === false) {
          return resolve(values[0])
        }

        resolve(values)
      })

      // Call the function
      const response = original.apply(target, args)

      // If it looks like original already returns a promise,
      // then just resolve with that promise. Hopefully, the callback
      // function we added will just be ignored.
      if (thatLooksLikeAPromiseToMe(response)) {
        resolve(response)
      }
    })
  }
}
