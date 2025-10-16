 // backend/jest.config.cjs
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {},
  testMatch: ["**/*.test.js"],
  verbose: true,
};
