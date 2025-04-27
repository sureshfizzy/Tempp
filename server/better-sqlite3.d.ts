declare module 'better-sqlite3' {
  interface Database {
    exec(sql: string): void;
    prepare<T = any>(sql: string): Statement<T>;
    transaction<T extends Function>(fn: T): T;
    pragma(pragma: string, simplify?: boolean): any;
    checkpoint(databaseName?: string): void;
    function(name: string, options: any, fn: Function): void;
    aggregate(name: string, options: any): void;
    backup(destinationFile: string, options?: any): Promise<void>;
    loadExtension(path: string): void;
    close(): void;
    readonly open: boolean;
    readonly inTransaction: boolean;
    readonly name: string;
    readonly memory: boolean;
    readonly readonly: boolean;
  }

  interface Statement<T = any> {
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: any[]): T;
    all(...params: any[]): T[];
    iterate(...params: any[]): IterableIterator<T>;
    bind(...params: any[]): this;
    pluck(toggleState?: boolean): this;
    expand(toggleState?: boolean): this;
    raw(toggleState?: boolean): this;
    safeIntegers(toggleState?: boolean): this;
    columns(): { name: string; column: string | null; table: string | null; database: string | null; type: string | null }[];
    readonly source: string;
  }

  interface Options {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: Function;
  }

  function Database(filename: string, options?: Options): Database;
  
  export = Database;
}