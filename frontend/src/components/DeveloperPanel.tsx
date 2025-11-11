import { useEffect, useState, useRef } from 'react';

interface DeveloperPanelProps {
  onSave: (slot: number) => void;
  onLoad: (slot: number) => void;
  onDelete: (slot: number) => void;
  onLoadFromFile: (file: File, slot: number) => void;
  onLoadFromText: (text: string, slot: number) => void;
  getSaveSlotInfo: (slot: number) => Promise<{ exists: boolean; timestamp: number; playerName: string; playerLevel: number } | null>;
}

const SLOT_COUNT = 5;

const DeveloperPanel = ({ onSave, onLoad, onDelete, onLoadFromFile, onLoadFromText, getSaveSlotInfo }: DeveloperPanelProps) => {
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [slotInfos, setSlotInfos] = useState<Array<{ exists: boolean; timestamp: number; playerName: string; playerLevel: number } | null>>([]);
  const [showLoadOptions, setShowLoadOptions] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateSlotInfos = async () => {
      const infos = [];
      for (let i = 1; i <= SLOT_COUNT; i++) {
        const info = await getSaveSlotInfo(i);
        infos.push(info);
      }
      setSlotInfos(infos);
    };

    updateSlotInfos();
    // 저장 시 업데이트를 위해 주기적으로 체크
    const interval = setInterval(updateSlotInfos, 1000);
    return () => clearInterval(interval);
  }, [getSaveSlotInfo]);

  const handleSave = () => {
    if (confirm(`슬롯 ${selectedSlot}에 저장하시겠습니까?`)) {
      onSave(selectedSlot);
    }
  };

  const handleLoad = () => {
    if (!slotInfos[selectedSlot - 1]) {
      alert(`슬롯 ${selectedSlot}에 저장된 데이터가 없습니다.\n파일을 업로드하거나 텍스트를 붙여넣어주세요.`);
      setShowLoadOptions(true);
      return;
    }
    if (confirm(`슬롯 ${selectedSlot}에서 로드하시겠습니까?\n현재 진행사항은 저장되지 않습니다.`)) {
      onLoad(selectedSlot);
    }
  };

  const handleDelete = () => {
    if (!slotInfos[selectedSlot - 1]) {
      alert(`슬롯 ${selectedSlot}에 저장된 데이터가 없습니다.`);
      return;
    }
    onDelete(selectedSlot);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFromFile(file, selectedSlot);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasteText = () => {
    if (pasteText.trim()) {
      onLoadFromText(pasteText, selectedSlot);
      setPasteText('');
      setShowLoadOptions(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg bg-gray-800 p-4 shadow-lg max-h-[90vh] overflow-y-auto">
      <div className="mb-3 text-sm font-bold text-yellow-400">🔧 개발자 모드</div>
      
      {/* 슬롯 선택 */}
      <div className="mb-3">
        <div className="mb-1 text-xs text-gray-300">저장 슬롯 선택:</div>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map((slot) => {
            const info = slotInfos[slot - 1];
            const isSelected = selectedSlot === slot;
            return (
              <button
                key={slot}
                onClick={() => {
                  setSelectedSlot(slot);
                  setShowLoadOptions(false);
                }}
                className={`rounded px-2 py-1 text-xs ${
                  isSelected
                    ? 'bg-yellow-600 text-white'
                    : info
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-700 text-gray-500 hover:bg-gray-600'
                }`}
                title={
                  info
                    ? `${info.playerName} (Lv.${info.playerLevel})\n${new Date(info.timestamp).toLocaleString('ko-KR')}`
                    : '빈 슬롯'
                }
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 슬롯 정보 */}
      {slotInfos[selectedSlot - 1] && (
        <div className="mb-3 rounded bg-gray-700 p-2 text-xs text-gray-300">
          <div>캐릭터: {slotInfos[selectedSlot - 1]!.playerName}</div>
          <div>레벨: {slotInfos[selectedSlot - 1]!.playerLevel}</div>
          <div>저장 시간: {new Date(slotInfos[selectedSlot - 1]!.timestamp).toLocaleString('ko-KR')}</div>
        </div>
      )}

      {/* 로드 옵션 */}
      {showLoadOptions && (
        <div className="mb-3 rounded bg-gray-700 p-3 text-xs">
          <div className="mb-2 text-gray-300">파일 또는 텍스트로 로드:</div>
          <div className="mb-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="w-full text-xs text-gray-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
          </div>
          <div className="mb-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="JSON 텍스트를 붙여넣으세요..."
              className="w-full rounded bg-gray-600 p-2 text-xs text-white placeholder-gray-400"
              rows={4}
            />
            <button
              onClick={handlePasteText}
              className="mt-1 w-full rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
            >
              텍스트 로드
            </button>
          </div>
          <button
            onClick={() => setShowLoadOptions(false)}
            className="w-full rounded bg-gray-600 px-2 py-1 text-xs text-gray-300 hover:bg-gray-500"
          >
            취소
          </button>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
        >
          💾 저장
        </button>
        <button
          onClick={handleLoad}
          className="flex-1 rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
        >
          📂 로드
        </button>
        <button
          onClick={() => setShowLoadOptions(!showLoadOptions)}
          className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700"
          title="파일 업로드 또는 텍스트 붙여넣기"
        >
          📥 가져오기
        </button>
        <button
          onClick={handleDelete}
          disabled={!slotInfos[selectedSlot - 1]}
          className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🗑️ 삭제
        </button>
      </div>
    </div>
  );
};

export default DeveloperPanel;

