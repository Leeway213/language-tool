import logSymbols from 'log-symbols';
import chalk from 'chalk';

export function log(message: string, type: 'error' | 'warning' | 'success' | 'info' = 'info') {
  switch (type) {
    case 'error':
      console.log(logSymbols.error, chalk.red(message));
      break;

    case 'warning':
      console.log(logSymbols.warning, chalk.yellow(message));
      break;

    case 'success':
      console.log(logSymbols.success, chalk.green(message));
      break;

    case 'info':
    default:
      console.log(logSymbols.info, chalk.white(message));
      break;
  }
}
