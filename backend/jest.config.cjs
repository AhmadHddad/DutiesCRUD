module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@nexplore-duties/contracts$': '<rootDir>/../packages/contracts/src/index.ts'
  },
  clearMocks: true
};
