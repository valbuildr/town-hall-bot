import * as s from "drizzle-orm/sqlite-core";

export const commandTable = s.sqliteTable("command", {
    name: s.text("name").primaryKey(),
    id: s.text("id").notNull().unique(),
    data: s.blob({ mode: 'json' }).notNull(),
});