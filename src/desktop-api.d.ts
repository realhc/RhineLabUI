interface RhineDocument {
  id: string;
  title: string;
  category: string;
  order: number;
  created: string;
  modified: string;
  body: string;
  revision: string;
}
interface Window {
  rhine: {
    list(): Promise<{
      documents: RhineDocument[];
      trash: RhineDocument[];
      issues: unknown[];
    }>;
    create(data: {
      title: string;
      category: string;
      body: string;
    }): Promise<RhineDocument>;
    save(data: {
      id: string;
      title: string;
      category: string;
      body: string;
      revision: string;
    }): Promise<RhineDocument>;
    trash(id: string, revision: string): Promise<unknown>;
    restore(id: string): Promise<unknown>;
    purge(id: string): Promise<unknown>;
    reorder(ids: string[]): Promise<unknown>;
    exportPreferences(text: string): Promise<boolean>;
    openFolder(): Promise<unknown>;
    openExternal(url: string): Promise<unknown>;
    fullscreen(): Promise<unknown>;
    setDirty(dirty: boolean): void;
    onChanged(callback: () => void): () => void;
  };
}
