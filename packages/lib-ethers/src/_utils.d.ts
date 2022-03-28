import { BigNumber } from "@ethersproject/bignumber";
import { Decimal } from "@liquity/lib-base";
export declare const numberify: (bigNumber: BigNumber) => number;
export declare const decimalify: (bigNumber: BigNumber) => Decimal;
export declare const panic: <T>(e: unknown) => T;
export declare type Resolved<T> = T extends Promise<infer U> ? U : T;
export declare type ResolvedValues<T> = {
    [P in keyof T]: Resolved<T[P]>;
};
export declare const promiseAllValues: <T>(object: T) => Promise<ResolvedValues<T>>;
//# sourceMappingURL=_utils.d.ts.map