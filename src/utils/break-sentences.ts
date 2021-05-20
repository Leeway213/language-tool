const BREAK_CHAR = [
  '.',
  '!',
  '?',
]

export function breakSentence(text: string) {
  let result = '';
  let br = false;
  text = text.replace(/\n/g, ' ').replace(/\r/g, '');
  for (const char of text) {
    if (br) {
      br = false;
      if (char === '"' || char === '»' || char === '\'') {
        result += char;
        result += '\n';
        continue;
      }
      result += '\n';
    }
    result += char;
    if (BREAK_CHAR.includes(char)) {
      br = true;
    }
  }
  return result.split('\n').map(v => v.trim());
}