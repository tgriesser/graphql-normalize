import fs from 'fs';
import { parse } from 'graphql';
import path from 'path';

export const operation1Doc = parse(fs.readFileSync(path.join(__dirname, '/operation1.graphql'), 'utf8'), {
  noLocation: true,
});

// fs.writeFileSync(path.join(__dirname, '/operation1.json'), JSON.stringify(operation1Doc, null, 2));

export const operation2Doc = parse(fs.readFileSync(path.join(__dirname, '/operation2.graphql'), 'utf8'), {
  noLocation: true,
});

export const operationWithFrag = parse(fs.readFileSync(path.join(__dirname, '/operationWithFrag.graphql'), 'utf8'), {
  noLocation: true,
});
