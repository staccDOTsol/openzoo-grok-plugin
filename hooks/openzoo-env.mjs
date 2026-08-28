/**
 * Where memory lives. LOCAL BY DEFAULT — nothing leaves the machine.
 *
 * This is the whole privacy posture of the plugin in one file. The ambient
 * hooks bind what you read and retrieve against it on every prompt, which is
 * only acceptable if the default destination is loopback. A plugin that quietly
 * POSTs a stranger's repo to a service they have not heard of deserves to be
 * uninstalled, and would rightly be rejected by any marketplace review.
 *
 * So: `endpoint` is 127.0.0.1:8787 unless the user sets OPENZOO_ENDPOINT
 * themselves. Setting it to the hosted gateway is an explicit, single-variable
 * opt-in to egress, and `isLocal` is exported so every hook can say which mode
 * it is in rather than leaving the user to guess.
 *
 * Inference is the one thing that always leaves, and only when a model is
 * actually asked something — that is a request the user made, not a background
 * effect of opening a file.
 */

const DEFAULT_LOCAL = 'http://127.0.0.1:8787';

export const env = {
  endpoint: (process.env.OPENZOO_ENDPOINT || DEFAULT_LOCAL).replace(/\/$/, ''),
  token: process.env.OPENZOO_LECORE_TOKEN || 'hrr-lab-token',
  tenant: process.env.OPENZOO_TENANT || 'grok-bot',
  // One context per tenant keeps ambient memory cumulative: everything this bot
  // has seen is one corpus, and recall ranks across all of it.
  contextFile: process.env.OPENZOO_CONTEXT_FILE
    || `${process.env.HOME || '/tmp'}/.openzoo-grok-context`,
  // Below this, binding is not worth a round trip — a short tool result is
  // already in the window and adds nothing but noise to retrieval.
  minBindChars: Number(process.env.OPENZOO_MIN_BIND_CHARS || 2000),
  topK: Number(process.env.OPENZOO_TOP_K || 8),
  // Ambient hooks off entirely, for anyone who wants the tools and not the
  // automatic behaviour.
  ambient: process.env.OPENZOO_AMBIENT !== '0',
};

export const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(env.endpoint);

/** The bind/recall path pair differs between a local daemon and the gateway. */
export const routes = isLocal
  ? { bind: '/internal/v1/hrr/bind', recall: '/internal/v1/hrr/recall' }
  : { bind: '/v1/hrr/bind', recall: '/v1/hrr/recall' };

export function headers() {
  const h = { 'content-type': 'application/json' };
  if (isLocal) h.authorization = `Bearer ${env.token}`;
  else h['x-openzoo-namespace'] = env.tenant;
  return h;
}
