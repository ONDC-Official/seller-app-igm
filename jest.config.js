module.exports = {
  verbose: true,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: ['*.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsConfig: 'tsconfig-tests.json',
    },
  },
}
