import { WorkerRequest, WorkerResponse } from './slottingWorker';

class WorkerClient {
  private worker: Worker | null = null;
  private resolvers: Record<string, (result: any) => void> = {};
  private idCounter = 0;

  init() {
    if (this.worker) return;
    this.worker = new Worker(new URL('./slottingWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      // Basic event handling
      console.log('Worker Response:', e.data);
    };
  }

  // Very basic promisified wrapper, but since the worker only returns type directly, we can do this:
  async calculateABC(waves: any[]) {
    return this.runTask('CALCULATE_ABC', waves, 'ABC_RESULT');
  }

  async calculateJaccard(waves: any[]) {
    return this.runTask('CALCULATE_JACCARD', waves, 'JACCARD_RESULT');
  }

  async calculateDrift(data: any) {
    return this.runTask('CALCULATE_DRIFT', data, 'DRIFT_RESULT');
  }

  private runTask(type: WorkerRequest['type'], data: any, expectedResultType: WorkerResponse['type']): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) this.init();

      const listener = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === expectedResultType) {
          this.worker?.removeEventListener('message', listener);
          resolve((e.data as any).result);
        } else if (e.data.type === 'ERROR') {
          this.worker?.removeEventListener('message', listener);
          reject(e.data.error);
        }
      };

      this.worker?.addEventListener('message', listener);
      this.worker?.postMessage({ type, data } as WorkerRequest);
    });
  }
}

export const workerClient = new WorkerClient();
