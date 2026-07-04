/** Mock for firebase-admin used during unit testing. */
const admin = {
  initializeApp: jest.fn(),
  firestore: jest.fn(),
};
export default admin;
module.exports = admin;
