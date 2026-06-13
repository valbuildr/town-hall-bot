import { GuildMemberRoleManager } from "discord.js"

export function isMod(roles: GuildMemberRoleManager | string[]) {
    if (Array.isArray(roles)) {
        return roles.includes(process.env.MOD_ROLE_ID!);
    }

    return roles.cache.has(process.env.MOD_ROLE_ID!);
}