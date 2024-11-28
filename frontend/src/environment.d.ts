declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_API_URL: string;
      VITE_WS_URL: string;
      VITE_AUTH_PASSWORD: string;
    }
  }
}

export {}; 