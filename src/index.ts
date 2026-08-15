/**
 * dsh-chat-toc — node half. Pure UI plugin: the empty apply exists so the
 * plugin appears in the host cordis.yml / Loader; the browser half ships via
 * exports["./client"], discovered through the package.json dsh.client
 * declaration.
 * @module dsh-chat-toc
 */

/** Required services: none (pure UI surface plugin). */
export const inject: string[] = []

/** Host plugin body — no host-side behavior for this surface plugin. */
export function apply(): void {}

/** Cordis plugin entry — named + default export so the loader always resolves it. */
export default { apply, inject }
