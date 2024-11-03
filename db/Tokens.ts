export class Token {
  constructor(
    username: string,
    token: string,
    refreshToken: string,
    expirationDate: Date
  ) {
    this.username = username;
    this.accessToken = token;
    this.refreshToken = refreshToken;
    this.expirationDate = expirationDate;
  }

  username: string;
  accessToken: string;
  refreshToken: string;
  expirationDate: Date;
  static fromObject(obj: Partial<Token>): Token {
    return new Token(
      obj.username!,
      obj.accessToken!,
      obj.refreshToken!,
      obj.expirationDate!
    );
  }
}

export class TokenWrapper {
  userID: string;
  token: Token;
  constructor(userID: string, token: Token) {
    this.userID = userID;
    this.token = token;
  }
}

export interface BotToken {
  accessToken: string;
  expirationDate: Date;
}
