import * as objPath from 'object-path';

export function prop(object: any, name: string): any | undefined {
  const desc = Object.getOwnPropertyDescriptor(object, name);
  return desc && desc.value;
}

export function path(object: any, path: string): any | undefined {
  return objPath.get(object, path);
}