/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^controllers/(.*)$': '<rootDir>/src/controllers/$1',
        '^models/(.*)$': '<rootDir>/src/models/$1',
        '^middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
        '^config/(.*)$': '<rootDir>/src/config/$1'
    },
    testPathIgnorePatterns: [
        '<rootDir>/frontend/'  //  Ignore frontend tests when running backend tests
    ]
};
