import { Prompt } from "@modelcontextprotocol/sdk/types.js";
export declare const PROMPTS: Record<string, Prompt>;
export declare const availablePrompts: {
    [x: string]: unknown;
    name: string;
    description?: string | undefined;
    arguments?: {
        [x: string]: unknown;
        name: string;
        description?: string | undefined;
        required?: boolean | undefined;
    }[] | undefined;
}[];
export declare function getPromptMessages(promptName: string, args?: Record<string, string>): Promise<{
    role: string;
    content: {
        type: string;
        text: string;
    };
}[]>;
