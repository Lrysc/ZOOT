/**
 * 获取职业图标URL
 */
export function getProfessionIconUrl(profession: string): string {
  if (!profession) return ''

  const professionMap: Record<string, string> = {
    'CASTER': 'caster',
    'MEDIC': 'medic',
    'PIONEER': 'pioneer',
    'SNIPER': 'sniper',
    'SPECIAL': 'special',
    'SUPPORT': 'support',
    'TANK': 'tank',
    'WARRIOR': 'warrior'
  }

  const fileName = professionMap[profession] || profession.toLowerCase()
  return new URL(`../assets/subProfession/${fileName}.svg`, import.meta.url).href
}
