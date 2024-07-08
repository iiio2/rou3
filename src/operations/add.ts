import type { RouterContext, Params } from "../types";
import { splitPath } from "./_utils";

/**
 * Add a route to the router context.
 */
export function addRoute<T>(
  ctx: RouterContext<T>,
  method: string = "",
  path: string,
  data?: T,
) {
  const segments = splitPath(path);

  let node = ctx.root;

  let _unnamedParamIndex = 0;

  const params: Params = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Wildcard
    if (segment.startsWith("**")) {
      if (!node.wildcard) {
        node.wildcard = { key: "**" };
      }
      node = node.wildcard;
      params.push([-i, segment.split(":")[1] || "_"]);
      break;
    }

    // Param
    if (segment === "*" || segment.includes(":")) {
      if (!node.param) {
        node.param = { key: "*" };
      }
      node = node.param;
      params.push([
        i,
        segment === "*"
          ? `_${_unnamedParamIndex++}`
          : (_getParamMatcher(segment) as string),
      ]);
      continue;
    }

    // Static
    const child = node.static?.[segment];
    if (child) {
      node = child;
    } else {
      const staticNode = { key: segment };
      if (!node.static) {
        node.static = Object.create(null);
      }
      node.static![segment] = staticNode;
      node = staticNode;
    }
  }

  // Assign index, params and data to the node
  const hasParams = params.length > 0;
  if (!node.methods) {
    node.methods = Object.create(null);
  }
  node.methods![method] = [data || (null as T), hasParams ? params : undefined];
  node.index = segments.length - 1;

  // Static
  if (!hasParams) {
    ctx.static[path] = node;
  }
}

function _getParamMatcher(segment: string): string | RegExp {
  if (!segment.includes(":", 1)) {
    // Single param
    return segment.slice(1);
  }
  const regex = segment.replace(/:(\w+)/g, (_, id) => `(?<${id}>\\w+)`);
  return new RegExp(`^${regex}$`);
}
