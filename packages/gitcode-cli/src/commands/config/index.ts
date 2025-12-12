import { Command } from 'commander';
import { getEditorConfig, setEditorConfig } from '../../utils/config.js';

export function configCommand(): Command {
  const configProgram = new Command('config').description('Manage configuration for gitcode');

  configProgram
    .command('set <key> <value>')
    .description('Update configuration with a value for the given key')
    .action((key: string, value: string) => {
      if (key === 'editor') {
        setEditorConfig(value);
        console.log(`Updated property 'editor' to '${value}'`);
      } else {
        console.error(`Unknown key: ${key}. Currently only 'editor' is supported.`);
        process.exit(1);
      }
    });

  configProgram
    .command('get <key>')
    .description('Print the value of a given configuration key')
    .action((key: string) => {
      if (key === 'editor') {
        const value = getEditorConfig();
        if (value) {
          console.log(value);
        }
      } else {
        console.error(`Unknown key: ${key}. Currently only 'editor' is supported.`);
        process.exit(1);
      }
    });

  configProgram
    .command('list')
    .description('Print a list of configuration keys and values')
    .action(() => {
      const editor = getEditorConfig();
      if (editor) {
        console.log(`editor=${editor}`);
      }
    });

  return configProgram;
}
