// Type declarations for Node.js built-in sqlite module
declare module 'node:sqlite' {
  interface StatementResultingChanges {
    changes: number
    lastInsertRowid: number | bigint
  }

  class StatementSync {
    run(namedParameters?: Record<string, unknown>, ...anonymousParameters: unknown[]): StatementResultingChanges
    get(namedParameters?: Record<string, unknown>, ...anonymousParameters: unknown[]): unknown
    all(namedParameters?: Record<string, unknown>, ...anonymousParameters: unknown[]): unknown[]
    setReadBigInts(enabled: boolean): void
  }

  class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; enableForeignKeyConstraints?: boolean })
    open(): void
    close(): void
    exec(sql: string): void
    prepare(sql: string): StatementSync
  }
}
