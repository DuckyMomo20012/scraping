/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import retry from 'async-retry';
import { toHtml } from 'hast-util-to-html';
import { Locator, chromium, devices } from 'playwright';
import rehypeParse from 'rehype-parse';
import rehypeRemark, { type Options } from 'rehype-remark';
import rehypeSanitize from 'rehype-sanitize';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { logger } from '@/logger/logger';
import prisma from '@/prisma/prisma';
import { rehypeFilterClassname, rehypeFilterTag } from '@/rehype/rehypeFilter';

const parseToMarkdown = async (html: string) => {
  const file = await unified()
    .use(rehypeParse)
    .use(rehypeFilterTag, {
      tag: ['h4'],
      exact: false,
    })
    .use(rehypeFilterClassname, {
      className: ['hidden'],
      exact: false,
    })
    // NOTE: Sanitize HTML, remove class, id, style, script tag
    .use(rehypeSanitize)
    .use(rehypeRemark, {
      handlers: {
        table(state, node) {
          const result = { type: 'html', value: toHtml(node) };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state.patch(node, result as any);
          return result;
        },
      },
    } as Options)
    .use(remarkStringify)
    .process(html);

  return String(file);
};

const processSection = async (elList: Locator[]) => {
  const mdList = await Promise.all(
    elList.map(async (el) => {
      const html = await el.innerHTML();

      return parseToMarkdown(html);
    }),
  );

  return mdList.join('\n---\n');
};

const getRecipe = async (url: string) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  // NOTE: Ad-blocker
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
  await blocker.enableBlockingInPage(page);

  await retry(
    async () => {
      await page.goto(url);
    },
    {
      retries: 5,
    },
  );

  logger.info(`Go to page ${url}`);

  let name = await page.locator('h1').textContent();

  if (!name) return;

  name = name.trim();

  const descriptionHtml = await page
    .locator('ul[class*="section-tabs"] + div')
    .innerHTML();

  const descriptionMd = await parseToMarkdown(descriptionHtml);

  const [ingredientMd, pretreatmentMd, instructionMd, usageMd, tipMd] =
    await Promise.all(
      [
        '#section-nguyenlieu',
        '#section-soche',
        '#section-thuchien',
        '#section-howtouse',
        '#section-tips',
      ].map(async (section) => {
        const elList = await page.locator(section).all();

        return processSection(elList);
      }),
    );

  const recipe = await prisma.recipe.upsert({
    where: {
      name,
    },
    create: {
      name,
      description: descriptionMd,
      ingredients: ingredientMd || '',
      pretreatments: pretreatmentMd || '',
      instructions: instructionMd || '',
      usage: usageMd || '',
      tips: tipMd || '',
    },
    update: {
      name,
      description: descriptionMd,
      ingredients: ingredientMd || '',
      pretreatments: pretreatmentMd || '',
      instructions: instructionMd || '',
      usage: usageMd || '',
      tips: tipMd || '',
    },
  });

  logger.info(`Get recipe ${name}`);

  const [ration, duration, level, nutrient] = await page
    .getByText('Khẩu Phần:', { exact: true })
    .or(page.getByText('Thời gian thực hiện:', { exact: true }))
    .or(page.getByText('Độ khó:', { exact: true }))
    .or(page.getByText('Thông tin dinh dưỡng', { exact: true }))
    .locator(`xpath=/following-sibling::*[1]`)
    .allTextContents();

  await prisma.recipeMetadata.upsert({
    where: {
      ration: ration || '',
      duration: duration || '',
      level: level || '',
      recipeId: recipe.id,
    },
    create: {
      ration: ration || '',
      duration: duration || '',
      level: level || '',
      nutrient: nutrient || '',
      recipeId: recipe.id,
    },
    update: {
      ration: ration || '',
      duration: duration || '',
      level: level || '',
      nutrient: nutrient || '',
    },
  });

  logger.info(`Get recipe metadata ${name}`);

  const tags = await page.locator('ul[class="tags"] > li').all();

  for (const el of tags) {
    const linkEl = el.locator('a');

    const tagName = await linkEl.textContent();

    const linkHref = await linkEl.getAttribute('href');

    if (!tagName || !linkHref) return;

    const slug = linkHref.split('/').at(-2);

    if (!slug) return;

    const tag = await prisma.tag.upsert({
      where: {
        slug,
      },
      create: {
        slug,
        name: tagName,
      },
      update: {
        slug,
        name: tagName,
      },
    });

    logger.info(`Get tag ${tagName}`);

    await prisma.recipeTag.upsert({
      where: {
        recipeId_tagId: {
          recipeId: recipe.id,
          tagId: tag.id,
        },
      },
      create: {
        recipeId: recipe.id,
        tagId: tag.id,
      },
      update: {
        recipeId: recipe.id,
        tagId: tag.id,
      },
    });
  }

  await context.close();
  await browser.close();
};

export { getRecipe };
