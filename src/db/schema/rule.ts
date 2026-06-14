import * as s from "drizzle-orm/sqlite-core";

export const ruleTable = s.sqliteTable("rule", {
    title: s.text("title").primaryKey(),
    description: s.text("description").notNull(),
});