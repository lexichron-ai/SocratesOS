/** Mock for firebase-functions used during unit testing. */
const logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

const https = {
  onRequest: jest.fn(
    (handler: unknown) => handler
  ),
};

module.exports = { https, logger };
