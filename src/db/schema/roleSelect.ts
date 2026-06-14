import * as s from "drizzle-orm/sqlite-core";
import snowflake from "../../snowflake";

export const roleSelectTable = s.sqliteTable("role_select", {
    id: s.text("id").primaryKey().$defaultFn(() => snowflake.nextId().toString()),
    name: s.text("name").notNull(),
    roles: s.text("roles").notNull().default("[]"), // {roleId: string; title: string; emoji?: string; description?: string;}[] - stringified
    maxRoles: s.integer("max_roles").notNull().default(1), 
});