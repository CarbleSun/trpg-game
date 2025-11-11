import { useState } from 'react';
import type { PlayerStats } from '../game/types';

interface ScarecrowScreenProps {
  player: PlayerStats;
  onClose: () => void;
  onStartBattle: (config: { atk: number; def: number; luk: number }) => void;
}

interface DamageRecord {
  id: number;
  type: 'dealt' | 'received';
  damage: number;
  timestamp: number;
}

interface ScarecrowStats {
  atk: number;
  def: number;
  luk: number;
}

const ScarecrowScreen = ({ player, onClose, onStartBattle }: ScarecrowScreenProps) => {
  const [scarecrowStats, setScarecrowStats] = useState<ScarecrowStats>({
    atk: 50,
    def: 30,
    luk: 10,
  });

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm"
        onClick={onClose} 
      ></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl font-stat max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">🎯 허수아비 훈련장</h2>
            <button
              onClick={onClose}
              className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            >
              닫기 (Q)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 허수아비 설정 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-700 border-b pb-2">허수아비 설정</h3>
              
              <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-yellow-700">체력: ∞ (무한)</span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">허수아비는 체력이 무한입니다.</p>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    공격력: {scarecrowStats.atk}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5000"
                    step="1"
                    value={scarecrowStats.atk}
                    onChange={(e) => setScarecrowStats(prev => ({
                      ...prev,
                      atk: parseInt(e.target.value),
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    방어력: {scarecrowStats.def}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="1"
                    value={scarecrowStats.def}
                    onChange={(e) => setScarecrowStats(prev => ({
                      ...prev,
                      def: parseInt(e.target.value),
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    운: {scarecrowStats.luk}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="1"
                    value={scarecrowStats.luk}
                    onChange={(e) => setScarecrowStats(prev => ({
                      ...prev,
                      luk: parseInt(e.target.value),
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* 전투 시작 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-700 border-b pb-2">전투 시작</h3>
              
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-gray-700 mb-3">
                  설정한 허수아비와 실제 전투를 진행할 수 있습니다.
                </p>
                <ul className="text-xs text-gray-600 space-y-1 mb-4">
                  <li>• 공격, 방어, 회복, 스킬 모두 사용 가능</li>
                  <li>• 허수아비 체력은 무한입니다 (쓰러뜨려도 즉시 회복)</li>
                  <li>• 언제든 나가기 버튼(Q)으로 퇴장 가능</li>
                  <li>• 나갈 때 플레이어 HP 자동 회복</li>
                </ul>
              </div>

              <div className="pt-4 border-t space-y-2">
                <button
                  onClick={() => onStartBattle(scarecrowStats)}
                  className="w-full py-3 bg-green-600 text-white rounded hover:bg-green-700 font-bold text-lg"
                >
                  🎯 전투 시작
                </button>
                <div className="text-xs text-gray-500 text-center">
                  전투 중 언제든 나갈 수 있습니다 (Q 키)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScarecrowScreen;

