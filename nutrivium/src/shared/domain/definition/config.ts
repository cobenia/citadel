export interface Config {
  notion: {
    apiKey: string;
    databaseId: string;
  };
  openai: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  logging: {
    level: string;
  };
  app: {
    name: string;
    version: string;
  };
}
