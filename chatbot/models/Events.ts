export interface ChatMessageEvent {
  ChatterName: string;
  ChatterID: string;
  ChatMessage: string;
  IsChatterMod: boolean;
  IsChatterBroadcaster: boolean;
}

export interface ChatMessageToken {
  UserID: string;
  AccessToken: string;
}
