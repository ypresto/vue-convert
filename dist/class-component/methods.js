"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const t = require("@babel/types");
const utils_1 = require("../nodes/utils");
const asis_1 = require("./asis");
function convertMethods(objectAst) {
    return objectAst.properties.map(p => {
        if (t.isSpreadElement(p)) {
            console.warn('Spread property is found in methods object. Automatic conversion of object spread is not supported.');
            return utils_1.spreadTodoMethod(p);
        }
        const method = asis_1.maybeConvertMethod(p);
        if (method)
            return method;
        console.warn(`Non-function property ${p.type} is found in methods object.`);
        return utils_1.todoMethod(p, 'method');
    });
}
exports.convertMethods = convertMethods;
