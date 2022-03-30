// @ts-nocheck
import { subscriberIdSymbol } from '../utils';

export type Subscriber<G = any> = {
  (data: G): void;
  [subscriberIdSymbol]: string;
};

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? ObjectType[Key] extends Array<any>
    //@ts-ignore
      ? `${Key}` | `${Key}[${number}]`
      : `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : Key;
}[keyof ObjectType & (string | number)];
