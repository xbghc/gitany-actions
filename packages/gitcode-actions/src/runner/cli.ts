#!/usr/bin/env node
import { Command } from 'commander';
import { RunnerClient } from './runner-client.js';
import { JobExecutor } from './executor/job-executor.js';
import chalk from 'chalk';

const program = new Command();

program.name('gitcode-runner').description('GitCode Actions Runner').version('0.0.1');

program
  .command('register')
  .description('Register a new runner')
  .requiredOption('--url <url>', 'GitCode Server URL')
  .requiredOption('--name <name>', 'Runner Name')
  .action(async (options) => {
    const client = new RunnerClient(options.url);
    try {
      const res = await client.register(options.name);
      console.log(chalk.green('Registered successfully!'));
      console.log(`ID: ${res.id}`);
      console.log(`Token: ${res.token}`);
      console.log('Use these credentials to start the runner.');
    } catch (e) {
      console.error(chalk.red('Registration failed:'), e instanceof Error ? e.message : e);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the runner')
  .requiredOption('--url <url>', 'GitCode Server URL')
  .requiredOption('--id <id>', 'Runner ID')
  .requiredOption('--token <token>', 'Runner Token')
  .action(async (options) => {
    const client = new RunnerClient(options.url);
    client.setCredentials(options.id, options.token);

    const executor = new JobExecutor(client);

    console.log(chalk.blue(`Starting runner ${options.id} connected to ${options.url}...`));

    // Polling loop
    let isRunning = true;
    const shutdown = () => {
      console.log(chalk.yellow('\nShutting down...'));
      isRunning = false;
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    while (isRunning) {
      try {
        const job = await client.poll();
        if (job) {
          await executor.execute(job);
        } else {
          // Wait before next poll
          if (isRunning) await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch (e) {
        console.error(chalk.red('Error in poll loop:'), e instanceof Error ? e.message : e);
        if (isRunning) await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  });

program.parse();
