import { Prompt } from "@modelcontextprotocol/sdk/types.js";
interface ExtendedPrompt extends Prompt {
    developerOnly?: boolean;
}
export declare const PROMPTS: Record<string, ExtendedPrompt>;
export declare const availablePrompts: ExtendedPrompt[];
/**
 * Filter prompts to only include those available in standard mode (non-developer mode)
 * @param prompts List of prompts to filter
 * @returns Filtered prompts that are available in standard mode
 */
export declare function filterPromptsForStandardMode(prompts: ExtendedPrompt[]): ExtendedPrompt[];
export declare function getPromptMessages(promptName: string, args?: Record<string, string>): Promise<{
    role: string;
    content: {
        type: string;
        text: string;
    };
}[]>;
export {};
