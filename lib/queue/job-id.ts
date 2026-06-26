// BullMQ reserves ":" as a Redis key separator and rejects custom job IDs that contain it.
export function normalizeBullMQJobId(jobId: string): string {
  return jobId.replace(/:/g, '_')
}
