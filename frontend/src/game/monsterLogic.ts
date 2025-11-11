// src/game/monsterLogic.ts

import type { CharacterStats, MonsterList } from './types';
import { getRandom } from '../game/utils';
import { monsterList } from '../game/constants';

/**
 * 레벨에 맞는 몬스터를 생성합니다.
 */
export const makeMonster = (playerLevel: number, monsterLevelOffset: number = 0): CharacterStats => {
  const baseTier = Math.floor((playerLevel - 1) / 10);
  let monsterTier = baseTier + monsterLevelOffset;
  if (monsterTier < 0) monsterTier = 0;
  const maxTier = Object.keys(monsterList).length - 1;
  if (monsterTier > maxTier) monsterTier = maxTier;

  const list: MonsterList[number] = monsterList[monsterTier as keyof typeof monsterList];
  const [name, level, hp, atk, def, luk] = list[getRandom(0, list.length - 1)];

  return {
    name: name as string,
    level: level as number,
    hp: hp as number,
    maxHp: hp as number,
    atk: atk as number,
    def: def as number,
    luk: luk as number,
  };
};