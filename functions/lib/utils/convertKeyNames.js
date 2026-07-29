"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertKeyNames = void 0;
const convertKeyNames = (obj) => {
    const keys = Object.keys(obj[0]);
    return obj.map((item) => {
        const newItem = keys.reduce((acc, key) => {
            const transformedKey = key.charAt(0).toLowerCase() + key.slice(1);
            return Object.assign(Object.assign({}, acc), { [transformedKey]: item[key] });
        }, {});
        return Object.assign({}, newItem);
    });
};
exports.convertKeyNames = convertKeyNames;
//# sourceMappingURL=convertKeyNames.js.map