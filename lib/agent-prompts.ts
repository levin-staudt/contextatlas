import { siteUrl } from "./atlas";

export const llmsUrl = `${siteUrl}/llms.txt`;

export const prompts = {
  existing: `Read ${llmsUrl} and follow its instructions for an existing project: detect the stack of this repository, tell me what you found, then load the matching sources and follow their best practices.`,
  new: (idea: string) =>
    `Read ${llmsUrl} and follow its instructions for a new project: suggest a tech stack for what I describe below, explain the trade-offs, and once I agree, use the matching sources to set it up.\n\nMy project: ${idea.trim() || "<describe what you want to build>"}`,
};
