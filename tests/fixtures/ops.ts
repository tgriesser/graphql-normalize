import fs from 'fs';
import { parse } from 'graphql';
import path from 'path';

export const operation1Doc = parse(fs.readFileSync(path.join(__dirname, '/operation1.graphql'), 'utf8'), {
  noLocation: true,
});

export const mutation1Doc = parse(fs.readFileSync(path.join(__dirname, '/mutation1.graphql'), 'utf8'), {
  noLocation: true,
});

export const operation2Doc = parse(fs.readFileSync(path.join(__dirname, '/operation2.graphql'), 'utf8'), {
  noLocation: true,
});

export const operation3Doc = parse(fs.readFileSync(path.join(__dirname, '/operation3.graphql'), 'utf8'), {
  noLocation: true,
});

export const operationWithFrag = parse(fs.readFileSync(path.join(__dirname, '/operationWithFrag.graphql'), 'utf8'), {
  noLocation: true,
});
