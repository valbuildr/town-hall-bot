import { REST, Routes } from "discord.js";
import cmds from "./ext";
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DB_FILE_NAME!, { schema });

let commands: any[] = []
Object.values(cmds).forEach((c) => {
    if (c.slashCommands) {
        c.slashCommands.forEach((ccmd) => commands.push(ccmd.data.toJSON()));
    }
    if (c.contextMenus) {
        c.contextMenus.forEach((ccmd) => commands.push(ccmd.data.toJSON()));
    }
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const resp = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands }) as any[];

    for (const item of resp) {
        const q = await db.query.commandTable.findFirst({ where: eq(schema.commandTable.name, item.name) });

        if (q) {
            await db.update(schema.commandTable).set({ name: item.name, id: item.id, data: item }).where(eq(schema.commandTable.name, item.name));
        } else {
            await db.insert(schema.commandTable).values({ name: item.name, id: item.id, data: item });
        }
    }

    console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
} catch (error) {
    console.error(error);
}