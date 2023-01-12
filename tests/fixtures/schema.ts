import SchemaBuilder from '@pothos/core';
import pluginRelay, { resolveArrayConnection } from '@pothos/plugin-relay';
import pluginSimpleObjects from '@pothos/plugin-simple-objects';
import { lexicographicSortSchema, printSchema } from 'graphql';
import fs from 'fs';
import path from 'path';

import {
  BlogShape,
  CommentShape,
  PostShape,
  UserShape,
  commentsFixtures,
  findBlog,
  findPost,
  findUser,
  interleavedNodes,
  postsFixtures,
  usersFixtures,
} from './fixtures';

const builder = new SchemaBuilder<{
  Context: {};
  Objects: {
    Post: PostShape;
    User: UserShape;
    Comment: CommentShape;
    Blog: BlogShape;
  };
}>({
  plugins: [pluginRelay, pluginSimpleObjects],
  relayOptions: {
    // These will become the defaults in the next major version
    clientMutationId: 'omit',
    cursorType: 'String',
    nodesOnConnection: true,
  },
});

builder.queryType({});

builder.queryFields((t) => ({
  num: t.int({
    resolve: () => 1,
  }),
  nestedString: t.field({
    type: t.listRef(t.listRef('String')),
    resolve: () => [['a', 'b'], ['foo']],
  }),
  nestedUserList: t.field({
    type: t.listRef(t.listRef('User')),
    resolve: () => [[usersFixtures[0]], [usersFixtures[1]]],
  }),
  posts: t.connection({
    type: Post,
    resolve: (source, args) => {
      return resolveArrayConnection({ args }, postsFixtures);
    },
  }),
  homeItems: t.connection({
    type: HomeFeedItem,
    resolve: (source, args) => resolveArrayConnection({ args }, interleavedNodes),
  }),
}));

const Post = builder.node('Post', {
  id: {
    resolve: (o) => o.id,
  },
  loadMany(ids) {
    return ids.map((id) => findPost(Number(id)));
  },
  fields: (t) => ({
    title: t.exposeString('title'),
    blog: t.field({
      type: Blog,
      nullable: true,
      resolve: (o) => findBlog(o.blogId),
    }),
    author: t.field({
      type: 'User',
      nullable: true,
      resolve: (o) => findUser(o.authorId),
    }),
    comments: t.field({
      type: t.listRef(Comment),
      args: {
        first: t.arg.int({ required: true, defaultValue: 10 }),
        offset: t.arg.int(),
      },
      resolve: (source, args) => {
        return commentsFixtures.slice(args.offset ?? 0, args.first);
      },
    }),
  }),
});

const User = builder.node('User', {
  id: {
    resolve: (o) => o.id,
  },
  loadMany(ids) {
    return ids.map((id) => findUser(Number(id)));
  },
  fields: (t) => ({
    name: t.exposeString('name'),
    email: t.exposeString('name'),
  }),
});

const Comment = builder.node('Comment', {
  id: {
    resolve: (o) => o.id,
  },
  fields: (t) => ({
    author: t.field({
      type: User,
      nullable: true,
      resolve: (source) => findUser(source.authorId),
    }),
  }),
});

const Blog = builder.node('Blog', {
  id: {
    resolve: (o) => o.id,
  },
  loadMany(ids) {
    return ids.map((id) => findBlog(Number(id)));
  },
  fields: (t) => ({
    name: t.exposeString('name'),
    posts: t.connection({
      type: 'Post',
      resolve: (source, args) =>
        resolveArrayConnection(
          { args },
          postsFixtures.filter((p) => p.blogId === source.id)
        ),
    }),
  }),
});

const HomeFeedItem = builder.unionType('HomeFeedItem', {
  types: ['Blog', 'Comment', 'Post', 'User'],
});

export const schema = builder.toSchema();
const printedSchema = printSchema(lexicographicSortSchema(schema));

fs.writeFileSync(path.join(__dirname, 'schema.gql'), printedSchema);
