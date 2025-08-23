export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/'],
    testMatch: ['**/__test__/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/**/index.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};