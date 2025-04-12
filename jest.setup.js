import '@testing-library/jest-dom';

// Mock HTMLMediaElement methods
Object.defineProperty(global.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: jest.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(global.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: jest.fn(),
});