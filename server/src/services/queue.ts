/**
 * Minimal in-process job queue with retry + idempotency.
 *
 * This satisfies the "reliable job queue with retry and idempotency support"
 * requirement for the current (single-process) deployment. For horizontal scale
 * or crash-resistance across restarts, swap this for Redis/BullMQ behind the
 * same `enqueue` interface — the call service depends only on this contract.
 */

type JobHandler = (payload: unknown) => Promise<void>;

interface Job {
  id: string;
  queueName: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  idempotencyKey?: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
}

export class JobQueue {
  private jobs = new Map<string, Job>();
  private handlers = new Map<string, JobHandler>();
  private processedKeys = new Set<string>();

  register(queueName: string, handler: JobHandler) {
    this.handlers.set(queueName, handler);
  }

  /**
   * Enqueue a job. If an idempotencyKey was already processed (or queued),
   * the duplicate is ignored and the existing job id is returned.
   */
  enqueue(input: {
    id: string;
    queueName: string;
    payload: unknown;
    maxAttempts?: number;
    idempotencyKey?: string;
  }): { jobId: string; deduped: boolean } {
    if (input.idempotencyKey) {
      if (this.processedKeys.has(input.idempotencyKey)) {
        return { jobId: input.idempotencyKey, deduped: true };
      }
      const queued = [...this.jobs.values()].find(
        (j) => j.idempotencyKey === input.idempotencyKey,
      );
      if (queued) return { jobId: queued.id, deduped: true };
    }

    const job: Job = {
      id: input.id,
      queueName: input.queueName,
      payload: input.payload,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      idempotencyKey: input.idempotencyKey,
      status: 'pending',
    };
    this.jobs.set(job.id, job);
    // Fire-and-forget processing; errors are retried inside run().
    void this.run(job.id);
    return { jobId: job.id, deduped: false };
  }

  private async run(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'done' || job.status === 'processing') return;
    const handler = this.handlers.get(job.queueName);
    if (!handler) return;

    job.status = 'processing';
    try {
      await handler(job.payload);
      job.status = 'done';
      if (job.idempotencyKey) this.processedKeys.add(job.idempotencyKey);
    } catch (err) {
      job.attempts += 1;
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        console.error(`[queue] job ${job.id} failed after ${job.attempts} attempts`, err);
      } else {
        job.status = 'pending';
        // Retry with a short backoff.
        const delay = 100 * job.attempts;
        setTimeout(() => void this.run(job.id), delay);
      }
    }
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Enqueue and resolve once the job finishes (fails after max attempts). */
  async enqueueAndWait(input: {
    id: string;
    queueName: string;
    payload: unknown;
    maxAttempts?: number;
    idempotencyKey?: string;
  }): Promise<{ jobId: string; deduped: boolean; ok: boolean; error?: string }> {
    const { jobId, deduped } = this.enqueue(input);
    if (deduped) {
      const existing = this.jobs.get(jobId);
      return { jobId, deduped: true, ok: existing?.status !== 'failed' };
    }
    // Poll until the job settles (it runs in the background with retries).
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const job = this.jobs.get(jobId);
      if (job?.status === 'done') return { jobId, deduped: false, ok: true };
      if (job?.status === 'failed')
        return { jobId, deduped: false, ok: false, error: 'Job failed after retries' };
      await new Promise((r) => setTimeout(r, 25));
    }
    return { jobId, deduped: false, ok: false, error: 'Job timed out' };
  }

  stats() {
    const all = [...this.jobs.values()];
    return {
      total: all.length,
      pending: all.filter((j) => j.status === 'pending').length,
      processing: all.filter((j) => j.status === 'processing').length,
      done: all.filter((j) => j.status === 'done').length,
      failed: all.filter((j) => j.status === 'failed').length,
    };
  }
}
