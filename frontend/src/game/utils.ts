// 난수 생성
export const getRandom = (min: number, max: number): number => {
  min = Math.ceil(min) || 0;
  max = Math.floor(max) || 100;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 등급 타입
export type ItemGrade = '일반' | '희귀' | '영웅' | '전설';

// 가격에 따른 등급 결정
export const getItemGrade = (price: number): ItemGrade => {
  if (price <= 500) return '일반';
  if (price <= 1500) return '희귀';
  if (price <= 3000) return '영웅';
  return '전설';
};

// 등급별 색상 클래스
export const getGradeColorClass = (grade: ItemGrade): string => {
  switch (grade) {
    case '일반':
      return 'text-gray-600'; // 회색
    case '희귀':
      return 'text-blue-600'; // 파란색
    case '영웅':
      return 'text-purple-600'; // 보라색
    case '전설':
      return 'text-orange-600'; // 주황색
    default:
      return 'text-gray-600';
  }
};

// 등급별 테두리 색상 클래스
export const getGradeBorderClass = (grade: ItemGrade): string => {
  switch (grade) {
    case '일반':
      return 'border-gray-300';
    case '희귀':
      return 'border-blue-400';
    case '영웅':
      return 'border-purple-400';
    case '전설':
      return 'border-orange-400';
    default:
      return 'border-gray-300';
  }
};