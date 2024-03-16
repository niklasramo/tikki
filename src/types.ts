export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
