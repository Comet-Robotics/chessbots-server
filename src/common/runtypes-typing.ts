import { Number as NumberType, type Static } from "runtypes";

export const Float = NumberType.withConstraint((n) =>
    Number.isFinite(n),
).withBrand("float");
export type Float = Static<typeof Float>;
export const Int32 = Float.withConstraint((n) =>
    Number.isSafeInteger(n),
).withBrand("int32");
export type Int32 = Static<typeof Int32>;
export const Uint32 = Int32.withConstraint((n) => n >= 0).withBrand("uint32");
export type Uint32 = Static<typeof Uint32>;
