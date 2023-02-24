import { describe, expect, it } from 'vitest'
import graphqlNormalize, { NormalizeMetaShape } from '../src'

describe('null values', () => {
  it('caches correctly', () => {
    const meta = {
      operation: 'query',
      variables: [],
      fields: [
        {
          name: 'viewer',
          fields: [
            {
              name: 'lastUsedOrganization',
              fields: [{ name: 'organization', cacheKey: 'Organization:id', fields: ['__typename', 'id', 'uuid'] }],
            },
            {
              name: 'organizations',
              args: '{"first":"100"}',
              fields: [
                {
                  name: 'nodes',
                  list: 1,
                  cacheKey: 'Organization:id',
                  fields: [
                    '__typename',
                    'id',
                    'name',
                    {
                      name: 'projects',
                      args: '{"first":"100"}',
                      fields: [
                        {
                          name: 'nodes',
                          list: 1,
                          cacheKey: 'Project:id',
                          fields: ['__typename', 'id', 'name', 'uuid'],
                        },
                        { name: 'pageInfo', fields: ['endCursor', 'hasNextPage'] },
                      ],
                    },
                    'uuid',
                  ],
                },
                { name: 'pageInfo', fields: ['endCursor', 'hasNextPage'] },
              ],
            },
          ],
        },
      ],
    } satisfies NormalizeMetaShape
    const operationResult = {
      data: {
        viewer: {
          lastUsedOrganization: null,
          organizations: {
            nodes: [
              {
                __typename: 'Organization',
                id: 'T3JnYW5pemF0aW9uOmVjNzYzZmVjLTBiZTctNGJiMS04ODQyLWI0ZmIzMDcxNjAyYw==',
                name: 'Some Form',
                projects: {
                  nodes: [
                    {
                      __typename: 'Project',
                      id: 'UHJvamVjdDo4ODFjNDNjZS1hN2FjLTQzNzEtOTI5MS1kYWFhMmViNmQyYTc=',
                      name: 'My New Proj',
                      uuid: '881c43ce-a7ac-4371-9291-daaa2eb6d2a7',
                    },
                  ],
                  pageInfo: {
                    endCursor: 'T2Zmc2V0Q29ubmVjdGlvbjow',
                    hasNextPage: false,
                    __typename: 'PageInfo',
                  },
                  __typename: 'OrganizationProjectsConnection',
                },
                uuid: 'ec763fec-0be7-4bb1-8842-b4fb3071602c',
              },
            ],
            pageInfo: {
              endCursor: 'T2Zmc2V0Q29ubmVjdGlvbjox',
              hasNextPage: false,
              __typename: 'PageInfo',
            },
            __typename: 'ViewerOrganizationsConnection',
          },
          __typename: 'Viewer',
        },
      },
    }

    const result = graphqlNormalize({
      action: 'write',
      operationResult,
      meta,
      currentResult: undefined,
      cache: {},
      variableValues: {},
    })

    expect(result.cache).toMatchSnapshot()
  })
})
