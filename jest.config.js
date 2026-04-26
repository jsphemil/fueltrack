const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
}

module.exports = createJestConfig(config)
