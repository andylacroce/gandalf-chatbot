// Shared type for chat messages
export interface Message {
  text: string;
  sender: string;
  audioFileUrl?: string;
}
