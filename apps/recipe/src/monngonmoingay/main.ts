/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import readline from 'node:readline';
import { OUTPUT_FILE, getMenu } from '@/monngonmoingay/get-menu';
import { getRecipe } from '@/monngonmoingay/get-recipe';

(async () => {
  await getMenu();

  const rl = readline.createInterface({
    input: fs.createReadStream(OUTPUT_FILE),
    crlfDelay: Infinity,
  });

  // NOTE: Sequentially get recipe
  for await (const line of rl) {
    const url = line.toString();
    await getRecipe(url);
  }
})();
