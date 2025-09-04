// jest.polyfills.js
// Polyfills for Jest environment

// TextEncoder/TextDecoder polyfill for Node.js environment
const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, { TextDecoder, TextEncoder });

// Polyfill for crypto.randomUUID
if (!global.crypto) {
  global.crypto = {};
}

if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Polyfill for crypto.getRandomValues
if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// Polyfill for URL if not available
if (!global.URL) {
  global.URL = require('url').URL;
}

// Polyfill for URLSearchParams if not available
if (!global.URLSearchParams) {
  global.URLSearchParams = require('url').URLSearchParams;
}

// Polyfill for AbortController
if (!global.AbortController) {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }
    
    abort() {
      this.signal.aborted = true;
    }
  };
}

// Polyfill for structuredClone
if (!global.structuredClone) {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfill for performance.now
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  };
}

// Polyfill for requestAnimationFrame
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16);
  };
}

if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Polyfill for requestIdleCallback
if (!global.requestIdleCallback) {
  global.requestIdleCallback = (callback) => {
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      });
    }, 1);
  };
}

if (!global.cancelIdleCallback) {
  global.cancelIdleCallback = (id) => {
    clearTimeout(id);
  };
}

// Mock for getComputedStyle
if (!global.getComputedStyle) {
  global.getComputedStyle = () => ({
    getPropertyValue: () => '',
    setProperty: jest.fn(),
    removeProperty: jest.fn(),
  });
}

// Mock for Element.prototype methods
if (typeof Element !== 'undefined') {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = jest.fn();
  }
  
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = jest.fn();
  }
  
  if (!Element.prototype.scroll) {
    Element.prototype.scroll = jest.fn();
  }
}

// Mock for HTMLElement.prototype methods
if (typeof HTMLElement !== 'undefined') {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = jest.fn();
  }
}