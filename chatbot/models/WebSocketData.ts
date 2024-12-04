export interface Metadata {
  message_type: string;
}

export interface Payload {
  session?: { id?: string; reconnect_url?: string }; // Make 'id' optional here
  event?: {
    chatter_user_name: string;
    chatter_user_id: string;
    message: { text: string };
    badges: { set_id: string }[];
  };
}

export interface WebSocketData {
  metadata: Metadata;
  payload: Payload;
}

export interface SessionWelcomeData extends WebSocketData {
  metadata: { message_type: "session_welcome" };
  payload: { session: { id: string } };
}

export interface SessionReconnectData extends WebSocketData {
  metadata: { message_type: "session_reconnect" };
  payload: { session: { id?: string; reconnect_url: string } }; // id is now optional
}

export interface SessionKeepAliveData extends WebSocketData {
  metadata: { message_type: "session_keepalive" };
}

export interface NotificationData extends WebSocketData {
  metadata: { message_type: "notification"; subscription_type: string };
  payload: {
    event: {
      chatter_user_name: string;
      chatter_user_id: string;
      message: { text: string };
      badges: { set_id: string }[];
    };
  };
}
