// --- Settings Definitions ---

export type ResponseLengthSetting = "brief" | "detailed";
export type ToneSetting = "formal" | "casual";
export type FocusModeSetting = "balanced" | "creative" | "analytical";
export type ExplanationStyleSetting = "direct" | "step-by-step" | "examples";

export interface ChatSettings {
  responseLength: ResponseLengthSetting;
  tone: ToneSetting;
  focusMode: FocusModeSetting;
  explanationStyle: ExplanationStyleSetting;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  responseLength: "brief",
  tone: "formal",
  focusMode: "balanced",
  explanationStyle: "direct",
};

// Legacy exports for backward compatibility
export const DEFAULT_RESPONSE_LENGTH_SETTING: ResponseLengthSetting = "brief";
export const DEFAULT_TEMPERATURE = 0.9;
