import { SKIP, visit } from 'unist-util-visit';

const testExact = (a, b, exact = true) => {
  if (exact) {
    return a === b;
  }

  return a.includes(b);
};

/**
 * @typedef FilterClassOptions
 *   Configuration (required).
 * @property {string | Array<string>} className
 *   Class name to filter.
 * @property {boolean} [exact]
 *   Exact match.
 */

/** @type {import('unified').Plugin<[(FilterClassOptions | null | undefined)?]>} */
const rehypeFilterClassname = (options) => {
  if (!options || !options.className) {
    throw new Error('options.className is required');
  }

  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      const props = node.properties;

      if (
        props?.className &&
        props.className.some(
          (c) =>
            testExact(c, options.className, options?.exact) ||
            (Array.isArray(options.className) &&
              options.className.some((o) => testExact(c, o, options?.exact))),
        )
      ) {
        // Ref: https://unifiedjs.com/learn/recipe/remove-node/
        parent.children.splice(index, 1);
        return [SKIP, index];
      }

      return node;
    });
  };
};

/**
 * @typedef FilterTagOptions
 *   Configuration (required).
 * @property {string | Array<string>} tag
 *   Class name to filter.
 * @property {boolean} [exact]
 *   Exact match.
 */

/** @type {import('unified').Plugin<[(FilterTagOptions | null | undefined)?]>} */
const rehypeFilterTag = (options) => {
  if (!options || !options.tag) {
    throw new Error('options.tag is required');
  }

  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (
        node?.tagName &&
        (testExact(node.tagName, options.tag, options.exact) ||
          (Array.isArray(options.tag) &&
            options.tag.some((t) => testExact(t, node.tagName, options.exact))))
      ) {
        // Ref: https://unifiedjs.com/learn/recipe/remove-node/
        parent.children.splice(index, 1);
        return [SKIP, index];
      }

      return node;
    });
  };
};

export { rehypeFilterClassname, rehypeFilterTag };
