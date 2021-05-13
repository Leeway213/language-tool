const BREAK_CHAR = [
  '.',
  '!',
  '?',
]

export function breakSentence(text: string) {
  let result = '';
  for (const char of text.replace(/\n/g, ' ').replace(/\r/g, '')) {
    result += char;
    if (BREAK_CHAR.includes(char)) {
      result += '\n';
    }
  }
  return result.split('\n').map(v => v.trim());
}