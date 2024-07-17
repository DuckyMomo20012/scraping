/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from 'node:fs/promises';
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
import { chromium, devices } from 'playwright';
import { logger } from '@/logger/logger';

const OUTPUT_FILE = './urls.log';

const getMenu = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto('https://monngonmoingay.com/tim-kiem-mon-ngon/');
    },
    {
      retries: 5,
    },
  );

  const maxPage = await page
    .locator('nav[aria-label="Pagination"] > ul > li')
    .nth(-2)
    .textContent();

  if (!maxPage) return;

  let fd;

  try {
    fd = await fs.open(OUTPUT_FILE, 'w');

    logger.info(`Truncate file ${OUTPUT_FILE} successfully`);
  } catch (err) {
    console.log('err', err);
  }

  for (let i = 1; i < +maxPage + 1; i += 1) {
    await retry(
      async () => {
        await page.goto(
          `https://monngonmoingay.com/tim-kiem-mon-ngon/page/${i}/`,
        );
      },
      {
        retries: 5,
      },
    );

    logger.info(`Page: ${i}`);

    const linkList = await page.locator('h3 > a').all();

    for (const el of linkList) {
      const href = await el.getAttribute('href');

      if (!href) return;

      try {
        await fs.writeFile(OUTPUT_FILE, `${href}\n`, {
          flag: 'a',
        });

        logger.debug(`Write ${href} to file ${OUTPUT_FILE}`);
      } catch (err) {
        console.log('err', err);
      }
    }
  }

  await fd?.close();

  await context.close();
  await browser.close();
};

export { getMenu, OUTPUT_FILE };
