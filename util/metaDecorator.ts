import 'reflect-metadata';

export interface IMethodMetaDecoratorAccessor<T> {
  (target: any, propertyName: string): T;
}

export interface IMethodMetaDecorator<T> {
  (target: any, propertyName: string): void;
  getValue: IMethodMetaDecoratorAccessor<T>
}

export interface IMethodMetaDecoratorFactory<T> {
  for: IMethodMetaDecorator<T>;
  getValue: IMethodMetaDecoratorAccessor<T>;
}

export function methodDecorator<T>(metaKey: Symbol, value: T | ((currentValue: T) => T)): IMethodMetaDecorator<T> {
  const result: IMethodMetaDecorator<T> = (() => {
    const _r: any = (target: any, propertyName: string): void => {
      const val = typeof value === 'function' ? value(result.getValue(target, propertyName)) : value;
      Reflect.defineMetadata(metaKey, val, target, propertyName);
    };
    _r.getValue = (t: any, p: string): T => {
      return <T>Reflect.getMetadata(metaKey, t, p);
    };
    return _r;
  })();

  return result;
}
