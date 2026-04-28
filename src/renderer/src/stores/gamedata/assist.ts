// ============================================================================
// 助战干员模块
// ============================================================================

import { logger } from '@services/logger';
import type { AssistCharDetail, AssistCharStatus } from '@types/game';
import { getOperatorPortraitUrl, getOperatorAvatarUrl } from '@utils/image';

/**
 * 获取助战干员详情列表
 */
export const getAssistCharDetails = (
  assistChars: any[] | undefined,
  charInfoMap: Record<string, any> = {}
): AssistCharDetail[] => {
  try {
    if (!Array.isArray(assistChars) || assistChars.length === 0) {
      return [];
    }

    return assistChars.map((char: any): AssistCharDetail => {
      const charInfo = charInfoMap[char.charId];
      const charName = charInfo?.name || char.charId;

      let evolvePhaseText = '';
      if (char.evolvePhase === 1) {
        evolvePhaseText = '精一';
      } else if (char.evolvePhase === 2) {
        evolvePhaseText = '精二';
      }

      let skillText = '';
      let skillNumber = '1';
      if (char.skillId) {
        const skillMatch = char.skillId.match(/_(\d+)$/);
        skillNumber = skillMatch ? skillMatch[1] : '1';
        skillText = `${skillNumber}技能 ${char.mainSkillLvl || 1}级`;
      } else {
        skillText = `1技能 ${char.mainSkillLvl || 1}级`;
      }

      const potentialText = char.potentialRank > 0 ? `潜${char.potentialRank}` : '';

      let moduleText = '';
      if (char.specializeLevel > 0) {
        moduleText = `模组${char.specializeLevel}级`;
      }

      const portraitUrl = getOperatorPortraitUrl(char.charId, char.evolvePhase || 0);
      const avatarUrl = getOperatorAvatarUrl(char.charId);
      const subProfessionId = charInfo?.subProfessionId || '';
      const profession = charInfo?.profession || '';

      return {
        charId: char.charId,
        name: charName,
        level: char.level || 0,
        evolvePhase: char.evolvePhase || 0,
        evolvePhaseText,
        skillId: char.skillId || '',
        skillNumber,
        skillText,
        mainSkillLvl: char.mainSkillLvl || 1,
        potentialRank: char.potentialRank || 0,
        potentialText,
        specializeLevel: char.specializeLevel || 0,
        moduleText,
        skinId: char.skinId || '',
        subProfessionId,
        profession,
        portraitUrl,
        avatarUrl,
        originalData: char
      };
    });
  } catch (error) {
    logger.error('获取助战干员详情失败', error);
    return [];
  }
};

/**
 * 获取技能图标URL
 */
const getSkillIconUrl = (skillId: string): string => {
  if (!skillId) return '';
  return `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/skill/skill_icon_${skillId}.png`;
};

/**
 * 获取助战干员数组状态
 */
export const getAssistCharArrayStatus = (
  details: AssistCharDetail[]
): AssistCharStatus[] => {
  try {
    if (details.length === 0) return [{
      name: '无助战干员',
      level: '',
      skill: '',
      portraitUrl: '',
      avatarUrl: ''
    }];

    return details.map(char => {
      const levelText = char.evolvePhaseText ? `${char.level}级` : `${char.level}级`;
      const potentialText = char.potentialText ? ` ${char.potentialText}` : '';
      const moduleText = char.moduleText ? ` ${char.moduleText}` : '';

      return {
        name: char.name,
        level: char.level,
        skill: char.skillId,
        skillNumber: char.skillNumber,
        skillIconUrl: getSkillIconUrl(char.skillId),
        fullInfo: `${char.name} ${levelText}${potentialText} ${char.skillText}${moduleText}`,
        portraitUrl: char.portraitUrl,
        avatarUrl: char.avatarUrl,
        charId: char.charId,
        evolvePhase: char.evolvePhase,
        subProfessionId: char.subProfessionId,
        profession: char.profession,
        rawData: char,
        potentialRank: char.potentialRank,
        specializeLevel: char.specializeLevel,
        skinId: char.skinId,
        mainSkillLvl: char.mainSkillLvl
      };
    });
  } catch (error) {
    logger.error('获取助战干员数组状态失败', error);
    return [{ name: '获取失败', level: '', skill: '', portraitUrl: '', avatarUrl: '' }];
  }
};
