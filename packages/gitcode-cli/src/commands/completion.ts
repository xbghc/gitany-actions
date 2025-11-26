import { Command } from 'commander';
import { bashCompletion, zshCompletion, fishCompletion } from '../completions/index.js';

export function completionCommand(): Command {
  const completionProgram = new Command('completion').description(
    'Generate shell completion scripts',
  );

  completionProgram
    .command('bash')
    .description('Generate bash completion script')
    .action(() => {
      console.log(bashCompletion);
      console.log('\n# To install, run one of the following:');
      console.log('#   gitcode completion bash >> ~/.bashrc');
      console.log('#   gitcode completion bash > /etc/bash_completion.d/gitcode');
      console.log('# Then restart your shell or run: source ~/.bashrc');
    });

  completionProgram
    .command('zsh')
    .description('Generate zsh completion script')
    .action(() => {
      console.log(zshCompletion);
      console.log('\n# To install:');
      console.log('#   mkdir -p ~/.zsh/completions');
      console.log('#   gitcode completion zsh > ~/.zsh/completions/_gitcode');
      console.log('#');
      console.log('# Then add to your ~/.zshrc:');
      console.log('#   fpath=(~/.zsh/completions $fpath)');
      console.log('#   autoload -Uz compinit && compinit');
      console.log('#');
      console.log('# Restart your shell or run: source ~/.zshrc');
    });

  completionProgram
    .command('fish')
    .description('Generate fish completion script')
    .action(() => {
      console.log(fishCompletion);
      console.log('\n# To install:');
      console.log('#   gitcode completion fish > ~/.config/fish/completions/gitcode.fish');
      console.log('# Completions will be available in new fish sessions');
    });

  return completionProgram;
}
