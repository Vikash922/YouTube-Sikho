/**
 * In-Memory Firestore Mock for Cloud Functions Testing (Phase 4 Extended)
 */

export class MockFirestore {
  private data: Map<string, any> = new Map();

  batch() {
    const operations: Array<() => Promise<void>> = [];

    return {
      set: (ref: any, data: any) => {
        operations.push(async () => {
          await ref.set(data);
        });
        return this;
      },
      update: (ref: any, updates: any) => {
        operations.push(async () => {
          await ref.update(updates);
        });
        return this;
      },
      delete: (ref: any) => {
        operations.push(async () => {
          await ref.delete();
        });
        return this;
      },
      commit: async () => {
        for (const op of operations) {
          await op();
        }
      },
    };
  }

  doc(docPath: string) {
    const self = this;
    return {
      id: docPath.split('/').pop(),
      path: docPath,
      get: async () => {
        const val = self.data.get(docPath);
        return {
          exists: val !== undefined,
          id: docPath.split('/').pop(),
          data: () => (val !== undefined ? { ...val } : undefined),
          ref: self.doc(docPath),
        };
      },
      set: async (val: any, options?: { merge?: boolean }) => {
        if (options?.merge && self.data.has(docPath)) {
          self.data.set(docPath, { ...self.data.get(docPath), ...val });
        } else {
          self.data.set(docPath, { ...val });
        }
      },
      update: async (updates: any) => self.update(docPath, updates),
      delete: async () => self.delete(docPath),
      collection: (subCol: string) => self.collection(`${docPath}/${subCol}`),
    };
  }

  collection(collectionPath: string) {
    const self = this;
    return {
      doc: (id?: string) => {
        const docId = id || `mock_id_${Math.random().toString(36).substring(2, 9)}`;
        return self.doc(`${collectionPath}/${docId}`);
      },
      add: async (val: any) => {
        const docId = `mock_add_${Math.random().toString(36).substring(2, 9)}`;
        const p = `${collectionPath}/${docId}`;
        self.data.set(p, { ...val, id: docId });
        return { id: docId, path: p, get: async () => self.doc(p).get() };
      },
      orderBy: (field: string, direction?: string) => self.createQuery(collectionPath, []),
      limit: (n: number) => self.createQuery(collectionPath, []),
      get: async () => self.query(collectionPath, []),
      where: (field: string, op: string, value: any) => self.createQuery(collectionPath, [[field, op, value]]),
    };
  }

  private createQuery(collectionPath: string, conditions: [string, string, any][] = []) {
    const self = this;
    const queryObj: any = {
      where: (f: string, op: string, v: any) => self.createQuery(collectionPath, [...conditions, [f, op, v]]),
      limit: (_n: number) => queryObj,
      orderBy: (_f: string, _dir?: string) => queryObj,
      startAfter: (_doc: any) => queryObj,
      get: async () => self.query(collectionPath, conditions),
    };
    return queryObj;
  }

  private async query(collectionPath: string, conditions: [string, string, any][]) {
    const docs: any[] = [];
    for (const [key, val] of this.data.entries()) {
      if (key.startsWith(collectionPath + '/') && key.split('/').length === collectionPath.split('/').length + 1) {
        let match = true;
        for (const [field, op, expected] of conditions) {
          if (op === '==' && val[field] !== expected) match = false;
          if (op === '>=' && val[field] < expected) match = false;
        }
        if (match) {
          docs.push({
            id: key.split('/').pop(),
            exists: true,
            data: () => ({ ...val }),
            ref: this.doc(key),
          });
        }
      }
    }
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: (cb: (doc: any) => void) => docs.forEach(cb),
    };
  }

  async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
    const transaction = {
      get: async (ref: any) => ref.get(),
      set: (ref: any, data: any, options?: any) => {
        const p = ref.path || (ref.id ? ref.id : '');
        if (options?.merge && this.data.has(p)) {
          this.data.set(p, { ...this.data.get(p), ...data });
        } else {
          this.data.set(p, { ...data });
        }
      },
      update: (ref: any, updates: any) => {
        const p = ref.path || (ref.id ? ref.id : '');
        this.update(p, updates);
      },
      delete: (ref: any) => {
        const p = ref.path || (ref.id ? ref.id : '');
        this.delete(p);
      },
    };
    return await updateFunction(transaction);
  }

  private update(path: string, updates: any) {
    const current = this.data.get(path) || {};
    const updated = { ...current };
    for (const [k, v] of Object.entries(updates)) {
      if (v && typeof v === 'object' && (v as any).constructor?.name === 'NumericIncrementTransform') {
        updated[k] = (updated[k] || 0) + 1;
      } else {
        updated[k] = v;
      }
    }
    this.data.set(path, updated);
  }

  private delete(path: string) {
    this.data.delete(path);
  }

  // Test Helper: Directly populate mock data
  seed(path: string, data: any) {
    this.data.set(path, { ...data });
  }

  has(path: string): boolean {
    return this.data.has(path);
  }

  getData(path: string): any {
    return this.data.get(path);
  }
}
