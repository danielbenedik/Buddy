export type StreamStatus = "idle" | "streaming" | "done" | "error";

export interface SummaryState {
  text: string;
  status: StreamStatus;
  error?: string;
}
