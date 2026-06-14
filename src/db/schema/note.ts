import * as s from "drizzle-orm/sqlite-core";

export const noteTable = s.sqliteTable("note", {
    content: s.text("content").primaryKey(),
});