"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableRow = void 0;
const extension_table_row_1 = require("@tiptap/extension-table-row");
exports.TableRow = extension_table_row_1.default.extend({
    allowGapCursor: false,
    content: "(tableCell | tableHeader)*",
});
//# sourceMappingURL=row.js.map