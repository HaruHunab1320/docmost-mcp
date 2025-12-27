import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueJob, QueueName } from '../../../integrations/queue/constants';
import { ResearchJobService } from '../research-job.service';

@Processor(QueueName.GENERAL_QUEUE)
export class ResearchJobProcessor extends WorkerHost {
  constructor(private readonly researchService: ResearchJobService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== QueueJob.RESEARCH_JOB) {
      return;
    }
    const jobId = job.data?.jobId as string | undefined;
    if (!jobId) {
      return;
    }
    await this.researchService.runJob(jobId);
  }
}
