import { config } from '@/config';
import { AgentClient } from '@/tunnel/AgentClient';

console.log(`[agent] starting, control plane: ${config.url}`);
new AgentClient(config.url, config.token, config.dockerSocket).start();
