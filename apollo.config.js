const path = require('path')

module.exports = {
  client: {
    includes: ['./tests/**/*.graphql'],
    service: {
      name: 'schema-graphql',
      localSchemaFile: path.join(__dirname, './tests/fixtures/schema.gql'),
    },
  },
}
