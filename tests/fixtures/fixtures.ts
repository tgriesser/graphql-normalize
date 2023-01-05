export interface BlogShape {
  __typename: 'Blog';
  id: number;
  name: string;
}

export const blogsFixtures: BlogShape[] = new Array(100).fill(1).map((o, idx) => ({
  __typename: 'Blog',
  id: idx + 1,
  name: `My Cool #${idx + 1}`,
}));

export function findBlog(id: number) {
  return blogsFixtures.find((o) => o.id === id);
}

export interface UserShape {
  __typename: 'User';
  id: number;
  name: string;
  email: string;
}

export const usersFixtures: UserShape[] = new Array(100).fill(1).map((o, idx) => ({
  __typename: 'User',
  id: idx + 1,
  name: `user ${idx + 1}`,
  email: `test+${idx}@example.com`,
}));

export function findUser(id: number) {
  return usersFixtures.find((o) => o.id === id);
}

export interface PostShape {
  __typename: 'Post';
  id: number;
  blogId: number;
  authorId: number;
  coordinates: number[];
}

export const postsFixtures: PostShape[] = new Array(100).fill(1).map((o, idx) => ({
  __typename: 'Post',
  id: idx + 1,
  blogId: (idx % 2) + 1,
  authorId: (idx % 2) + 1,
  coordinates: [90.0, 135.0],
}));

export function findPost(id: number) {
  return postsFixtures.find((post) => post.id === id);
}

export interface CommentShape {
  __typename: 'Comment';
  id: number;
  postId: number;
  authorId: number;
  comment: string;
  parent?: number;
}

export const commentsFixtures: CommentShape[] = new Array(100).fill(1).map((o, idx) => ({
  __typename: 'Comment',
  id: idx + 1,
  comment: 'Lorem ipsum....',
  postId: (idx % 2) + 1,
  authorId: (idx % 2) + 1,
}));

export const interleavedNodes: Array<CommentShape | BlogShape | PostShape | UserShape> = new Array(100)
  .fill(1)
  .flatMap((o, idx) => {
    return [commentsFixtures[idx], blogsFixtures[idx], postsFixtures[idx], usersFixtures[idx]].filter((i) => i);
  });
