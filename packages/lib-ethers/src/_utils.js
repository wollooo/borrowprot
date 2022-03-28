"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promiseAllValues = exports.panic = exports.decimalify = exports.numberify = void 0;
const lib_base_1 = require("@liquity/lib-base");
const numberify = (bigNumber) => bigNumber.toNumber();
exports.numberify = numberify;
const decimalify = (bigNumber) => lib_base_1.Decimal.fromBigNumberString(bigNumber.toHexString());
exports.decimalify = decimalify;
const panic = (e) => {
    throw e;
};
exports.panic = panic;
const promiseAllValues = (object) => {
    const keys = Object.keys(object);
    return Promise.all(Object.values(object)).then(values => Object.fromEntries(values.map((value, i) => [keys[i], value])));
};
exports.promiseAllValues = promiseAllValues;
//# sourceMappingURL=_utils.js.map