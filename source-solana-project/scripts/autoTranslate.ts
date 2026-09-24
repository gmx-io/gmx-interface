import { promises as fs } from 'node:fs';
import { translate } from '@vitalets/google-translate-api';
import * as path from 'node:path';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function translatePoFile(locale: string) {
  const poFile = path.join(process.cwd(), `src/locales/${locale}/messages.po`);
  const content = await fs.readFile(poFile, 'utf-8');

  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('msgid "') && lines[i + 1].startsWith('msgstr ""')) {
      const text = line.slice(7, -1);
      if (text) {
        try {
          await delay(1000);
          const { text: translated } = await translate(text, { to: locale });
          console.log(`Translated: ${text} -> ${translated}`);
          newLines.push(line);
          newLines.push(`msgstr "${translated}"`);
          i++;
        } catch (error) {
          console.error(`Failed to translate: ${text}`, error);
          newLines.push(line);
          newLines.push(lines[i + 1]);
          i++;
        }
      } else {
        newLines.push(line);
        newLines.push(lines[i + 1]);
        i++;
      }
    } else {
      newLines.push(line);
    }
  }

  await fs.writeFile(poFile, newLines.join('\n'));
}

async function main() {
  const locales = [
    'en',
    'es',
    'ko',
    'ja',
    'zh',
    'zh_TW',
    'ru',
    'fr',
    'de',
    'pt',
  ];
  for (const locale of locales) {
    console.log(`Translating ${locale}...`);
    await translatePoFile(locale);
    await delay(5000);
  }
}

main().catch(console.error);
