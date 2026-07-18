import { ScheduledTaskErrors } from '@cloud-code/contracts/modules/task/errors';
import { defineErrors } from '@/shared/errors/defineErrors';

export const ScheduledTaskError = defineErrors(ScheduledTaskErrors);
