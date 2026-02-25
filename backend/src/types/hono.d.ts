declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    role: 'ADMIN' | 'USER';
  }
}
