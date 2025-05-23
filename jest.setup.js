// Polyfill TextEncoder for Node.js before any other imports
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder } = require("util");
  global.TextEncoder = TextEncoder;
}

// Polyfill TextDecoder for Node.js before any other imports
if (typeof global.TextDecoder === "undefined") {
  const { TextDecoder } = require("util");
  global.TextDecoder = TextDecoder;
}

import "@testing-library/jest-dom";

// Mock HTMLMediaElement methods
Object.defineProperty(global.HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: jest.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(global.HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value: jest.fn(),
});

// Suppress React warnings about deprecated lifecycle methods during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    args[0].includes("componentWillReceiveProps has been renamed")
  ) {
    return;
  }
  originalWarn(...args);
};
