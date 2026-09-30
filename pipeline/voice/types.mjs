/* Video types, so a script is compared with (and modelled on) the host's own videos of the same kind.
 * Order matters: the first rule that matches wins. A manual `type` in voice/<id>/index.json always wins.
 *   short      a YouTube Short
 *   qa         answering viewer questions
 *   ranked     ranking / tier list / "best and worst"
 *   personal   the host's own story
 *   react      reacting to clips or another creator (the default for long-form on a react channel)
 *   explainer  one question answered (titles phrased as a question, "the truth about", "does X work")
 *   segment    a show segment (cooking, how-to) on a reference channel
 */
export const TYPES = ['short', 'qa', 'ranked', 'personal', 'react', 'explainer', 'segment'];

const RULES = [
  ['qa', /\b(answer(ing)?|your (most )?\w* ?questions|q ?& ?a|asked)\b/i],
  ['ranked', /\b(rank(ed|ing)?|tier ?list|top \d+|best (and|&) worst)\b/i],
  ['personal', /\b(i became|my (story|journey|life|first)|why i\b|day in the life|vlog)\b/i],
  ['react', /\b(react(s|ing)?|tiktoks?|videos|internet|compilation|clips?|fails?|satisfying|worst|they did|gone too far|out of hand|she really|he really|isn't normal)\b|^\d+\s/i],
  ['explainer', /\?|\b(can you|should you|does|do .* work|is it|why|how|what happens|truth about|actually|explained|the science)\b/i],
];

export function classifyType(v, channel = {}) {
  if (v?.type && TYPES.includes(v.type)) return v.type;
  if (v?.format === 'short') return 'short';
  if (channel.role === 'voice-reference') return channel.default_type || (channel.id === 'altonbrown' ? 'segment' : 'explainer');
  const t = v?.title || '';
  for (const [type, re] of RULES) if (re.test(t)) return type;
  return channel.default_type || 'react';
}
