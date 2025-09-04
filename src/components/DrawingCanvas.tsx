import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingTool } from '../App';
import './DrawingCanvas.css';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  timestamp: number;
}

interface ScaffoldSegment {
  start: Point;
  end: Point;
  length: number; // mm 단위
}

interface ScaffoldStructure {
  id: string;
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
  width: number; // mm 단위
  height: number; // mm 단위
  horizontalSegments: ScaffoldSegment[];
  verticalSegments: ScaffoldSegment[];
}

interface SupportPost {
  id: string;
  center: Point;
  radius: number; // 65mm (지름 130mm의 반지름)
}

interface DrawingCanvasProps {
  tool: DrawingTool;
  isGridVisible: boolean;
  zoom: number;
  canvasOffset: { x: number; y: number };
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  scaffoldWidth: number;
  selectedComponent: string | null;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  scaffoldStructures: ScaffoldStructure[];
  setScaffoldStructures: React.Dispatch<React.SetStateAction<ScaffoldStructure[]>>;
  supportPosts: SupportPost[];
  setSupportPosts: React.Dispatch<React.SetStateAction<SupportPost[]>>;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  tool, 
  isGridVisible, 
  zoom,
  canvasOffset,
  setCanvasOffset,
  setZoom,
  scaffoldWidth,
  selectedComponent,
  strokes,
  setStrokes,
  scaffoldStructures,
  setScaffoldStructures,
  supportPosts,
  setSupportPosts
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPoint, setPanStartPoint] = useState<Point | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  
  // 핀치 줌을 위한 상태
  const [touches, setTouches] = useState<React.TouchList | null>(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState<number>(1);
  
  // 시스템비계 수평재 표준 규격 (mm)
  const SCAFFOLD_LENGTHS = [293, 598, 902, 1207, 1512, 1817];
  const MAX_SCAFFOLD_LENGTH = 1817;
  
  // 선택된 부품의 길이 가져오기
  const getComponentLength = useCallback((): number | null => {
    if (!selectedComponent) return null;
    
    // 부품 ID에서 길이 추출 (예: 'h-beam-902' → 902)
    const match = selectedComponent.match(/h-beam-(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    
    // 수직재의 경우 scaffoldWidth 사용
    if (selectedComponent === 'v-beam') {
      return scaffoldWidth;
    }
    
    return null;
  }, [selectedComponent, scaffoldWidth]);

  // 비계 길이별 선명한 색상 매핑
  const getScaffoldColor = useCallback((length: number): string => {
    switch (length) {
      case 293: return '#FF0000'; // 빨간색
      case 598: return '#FF8C00'; // 주황색
      case 902: return '#32CD32'; // 라임그린
      case 1207: return '#0080FF'; // 파란색
      case 1512: return '#8A2BE2'; // 보라색
      case 1817: return '#FF1493'; // 핑크색
      default: return '#000000'; // 검은색
    }
  }, []);

  // 캔버스 크기 설정
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width * window.devicePixelRatio,
          height: rect.height * window.devicePixelRatio
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // 격자 그리기
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isGridVisible) return;

    // 100% 줌에서 화면에 20칸이 보이도록 계산
    // 일반적인 화면 너비 1920px 기준: 1920px ÷ 20칸 = 96px/칸
    const baseGridSize = 96; // 100% 줌에서 격자 1칸 크기
    const gridSize = baseGridSize * zoom;
    const { width, height } = canvasSize;

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;

    // 캔버스 변환 상태 저장
    ctx.save();
    
    // 격자는 캔버스 좌표계에 고정되어야 함
    // canvasOffset은 이미 drawLine과 다른 그리기 함수에서 적용되므로
    // 격자는 (0,0)부터 시작
    const startX = 0;
    const startY = 0;

    // 세로선
    for (let x = startX; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 가로선
    for (let y = startY; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }, [isGridVisible, zoom, canvasSize]);

  // 시스템비계 세그먼트 계산 (드래그 길이를 표준 규격으로 분할)
  const calculateScaffoldSegments = useCallback((start: Point, end: Point): ScaffoldSegment[] => {
    const totalDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    
    // 방향 벡터 계산
    const dirX = (end.x - start.x) / totalDistance;
    const dirY = (end.y - start.y) / totalDistance;
    
    // 선택된 부품의 고정 길이가 있으면 사용
    const componentLength = getComponentLength();
    if (componentLength && selectedComponent) {
      // 수평재의 경우 고정 길이로 하나의 세그먼트만 생성
      if (selectedComponent.startsWith('h-beam-')) {
        const segmentPixelLength = componentLength / (300 / 96);
        const segmentEnd: Point = {
          x: start.x + dirX * segmentPixelLength,
          y: start.y + dirY * segmentPixelLength
        };
        
        return [{
          start,
          end: segmentEnd,
          length: componentLength
        }];
      }
      // 수직재의 경우 수직선으로 고정
      else if (selectedComponent === 'v-beam') {
        const segmentPixelLength = componentLength / (300 / 96);
        const segmentEnd: Point = {
          x: start.x,
          y: start.y + segmentPixelLength
        };
        
        return [{
          start,
          end: segmentEnd,
          length: componentLength
        }];
      }
    }
    
    // 기존 로직: 실제 픽셀 거리를 mm로 변환 (96px = 300mm 기준)
    const totalDistanceMM = totalDistance * (300 / 96);
    
    const segments: ScaffoldSegment[] = [];
    let remainingDistanceMM = totalDistanceMM;
    let currentStart = start;
    
    while (remainingDistanceMM >= 293) { // 293mm 미만은 무시
      // 정확한 매칭 우선 처리 (1817mm → 1817mm, 1512+293 아님)
      let selectedLength = 293; // 기본값
      let bestMatch = 293;
      let minDifference = Math.abs(remainingDistanceMM - 293);
      
      // 정확한 매칭 또는 가장 가까운 값 찾기
      for (let i = 0; i < SCAFFOLD_LENGTHS.length; i++) {
        const length = SCAFFOLD_LENGTHS[i];
        if (length <= remainingDistanceMM) {
          const difference = Math.abs(remainingDistanceMM - length);
          if (difference < minDifference) {
            bestMatch = length;
            minDifference = difference;
          }
        }
      }
      
      // 정확한 매칭이 있으면 사용, 아니면 가장 큰 것부터 사용
      if (minDifference < 50) { // 50mm 이내 차이면 정확한 매칭으로 간주
        selectedLength = bestMatch;
      } else {
        for (let i = SCAFFOLD_LENGTHS.length - 1; i >= 0; i--) {
          if (remainingDistanceMM >= SCAFFOLD_LENGTHS[i]) {
            selectedLength = SCAFFOLD_LENGTHS[i];
            break;
          }
        }
      }
      
      // 세그먼트의 실제 픽셀 길이 계산 (96px = 300mm 기준)
      const segmentPixelLength = selectedLength / (300 / 96);
      const segmentEnd: Point = {
        x: currentStart.x + dirX * segmentPixelLength,
        y: currentStart.y + dirY * segmentPixelLength
      };
      
      // 실제 생성된 세그먼트의 거리 계산
      const actualSegmentDistance = Math.sqrt(
        Math.pow(segmentEnd.x - currentStart.x, 2) + 
        Math.pow(segmentEnd.y - currentStart.y, 2)
      );
      const actualLengthMM = Math.round(actualSegmentDistance * (300 / 96));
      
      segments.push({
        start: currentStart,
        end: segmentEnd,
        length: actualLengthMM
      });
      
      remainingDistanceMM -= actualLengthMM;
      currentStart = segmentEnd;
    }
    
    return segments;
  }, [SCAFFOLD_LENGTHS, getComponentLength, selectedComponent]);

  // 세로 세그먼트를 정확한 비계폭으로 계산
  const calculateVerticalScaffoldSegments = useCallback((start: Point, end: Point, targetHeightMM: number): ScaffoldSegment[] => {
    const actualDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const actualHeightMM = actualDistance * (300 / 96);
    
    // 목표 높이와 실제 높이가 일치하는지 확인
    if (Math.abs(actualHeightMM - targetHeightMM) < 10) { // 10mm 이내 차이면 정확한 것으로 간주
      // 정확한 비계폭이면 하나의 세그먼트로 반환
      return [{
        start,
        end,
        length: Math.round(targetHeightMM)
      }];
    } else {
      // 부정확한 경우 표준 규격으로 분할
      return calculateScaffoldSegments(start, end);
    }
  }, [calculateScaffoldSegments]);

  // 비계 사각형 구조 계산
  const calculateScaffoldStructure = useCallback((start: Point, end: Point): ScaffoldStructure => {
    // 드래그한 거리를 가로 길이로 사용
    const dragDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const widthMM = dragDistance * (300 / 96);
    
    // 사용자 설정 폭 사용 (정확한 픽셀 계산)
    const heightMM = scaffoldWidth;
    const heightPx = heightMM / (300 / 96);
    
    // 방향 벡터 (가로 방향)
    const dirX = (end.x - start.x) / dragDistance;
    const dirY = (end.y - start.y) / dragDistance;
    
    // 수직 방향 벡터 계산 (시계방향으로 90도 회전)
    const perpX = -dirY;
    const perpY = dirX;
    
    // 사각형의 네 모서리 계산
    const topLeft = start;
    const topRight = end;
    const bottomLeft: Point = {
      x: start.x + perpX * heightPx,
      y: start.y + perpY * heightPx
    };
    const bottomRight: Point = {
      x: end.x + perpX * heightPx,
      y: end.y + perpY * heightPx
    };
    
    // 가로 세그먼트 계산 (상단, 하단)
    const topSegments = calculateScaffoldSegments(topLeft, topRight);
    const bottomSegments = calculateScaffoldSegments(bottomLeft, bottomRight);
    
    // 세로 세그먼트 계산 (좌측, 우측) - 정확한 비계폭으로
    const leftSegments = calculateVerticalScaffoldSegments(topLeft, bottomLeft, heightMM);
    const rightSegments = calculateVerticalScaffoldSegments(topRight, bottomRight, heightMM);
    
    // 중간 가로 세그먼트의 교차점에만 세로 선분 추가 생성 (모서리 제외 + 규격 검증 강화)
    const allHorizontalSegments = [...topSegments, ...bottomSegments];
    const additionalVerticalSegments: ScaffoldSegment[] = [];
    
    // 각 가로 세그먼트의 시작점과 끝점에 세로 선분 생성 (모서리 제외 + 규격 검증)
    allHorizontalSegments.forEach(segment => {
      // 시작점이 모서리가 아닌 경우에만 세로 선분 생성
      const isStartCorner = (
        (Math.abs(segment.start.x - topLeft.x) < 1 && Math.abs(segment.start.y - topLeft.y) < 1) ||
        (Math.abs(segment.start.x - topRight.x) < 1 && Math.abs(segment.start.y - topRight.y) < 1) ||
        (Math.abs(segment.start.x - bottomLeft.x) < 1 && Math.abs(segment.start.y - bottomLeft.y) < 1) ||
        (Math.abs(segment.start.x - bottomRight.x) < 1 && Math.abs(segment.start.y - bottomRight.y) < 1)
      );
      
      // 시작점이 수평재 규격에 맞는지 확인 (293mm 이상 + 실제 드래그 거리와 일치)
      // 추가로: 시작점이 실제로 수평재가 연결되는 유효한 지점인지 확인
      const isStartValid = segment.length >= 293 && 
        Math.abs(segment.length - Math.round(segment.length)) < 50; // 50mm 이내 차이
      
      // 시작점이 실제로 수평재가 연결되는 유효한 지점인지 확인
      const isStartConnected = allHorizontalSegments.some(otherSegment => {
        if (otherSegment === segment) return false;
        // 다른 세그먼트의 시작점이나 끝점과 연결되어 있는지 확인
        const isConnectedToStart = Math.abs(otherSegment.start.x - segment.start.x) < 1 && 
                                  Math.abs(otherSegment.start.y - segment.start.y) < 1;
        const isConnectedToEnd = Math.abs(otherSegment.end.x - segment.start.x) < 1 && 
                                Math.abs(otherSegment.end.y - segment.start.y) < 1;
        return isConnectedToStart || isConnectedToEnd;
      });
      
      if (!isStartCorner && isStartValid && isStartConnected) {
        const startVerticalEnd: Point = {
          x: segment.start.x + perpX * heightPx,
          y: segment.start.y + perpY * heightPx
        };
        additionalVerticalSegments.push({
          start: segment.start,
          end: startVerticalEnd,
          length: Math.round(heightMM)
        });
      }
      
      // 끝점이 모서리가 아닌 경우에만 세로 선분 생성
      const isEndCorner = (
        (Math.abs(segment.end.x - topLeft.x) < 1 && Math.abs(segment.end.y - topLeft.y) < 1) ||
        (Math.abs(segment.end.x - topRight.x) < 1 && Math.abs(segment.end.y - topRight.y) < 1) ||
        (Math.abs(segment.end.x - bottomLeft.x) < 1 && Math.abs(segment.end.y - bottomLeft.y) < 1) ||
        (Math.abs(segment.end.x - bottomRight.x) < 1 && Math.abs(segment.end.y - bottomRight.y) < 1)
      );
      
      // 끝점이 수평재 규격에 맞는지 확인 (293mm 이상 + 실제 드래그 거리와 일치)
      // 추가로: 끝점이 실제로 수평재가 연결되는 유효한 지점인지 확인
      const isEndValid = segment.length >= 293 && 
        Math.abs(segment.length - Math.round(segment.length)) < 50; // 50mm 이내 차이
      
      // 끝점이 실제로 수평재가 연결되는 유효한 지점인지 확인
      const isEndConnected = allHorizontalSegments.some(otherSegment => {
        if (otherSegment === segment) return false;
        // 다른 세그먼트의 시작점이나 끝점과 연결되어 있는지 확인
        const isConnectedToStart = Math.abs(otherSegment.start.x - segment.end.x) < 1 && 
                                  Math.abs(otherSegment.start.y - segment.end.y) < 1;
        const isConnectedToEnd = Math.abs(otherSegment.end.x - segment.end.x) < 1 && 
                                Math.abs(otherSegment.end.y - segment.end.y) < 1;
        return isConnectedToStart || isConnectedToEnd;
      });
      
      if (!isEndCorner && isEndValid && isEndConnected) {
        const endVerticalEnd: Point = {
          x: segment.end.x + perpX * heightPx,
          y: segment.end.y + perpY * heightPx
        };
        additionalVerticalSegments.push({
          start: segment.end,
          end: endVerticalEnd,
          length: Math.round(heightMM)
        });
      }
    });
    
    // 모든 세로 세그먼트 통합
    const allVerticalSegments = [...leftSegments, ...rightSegments, ...additionalVerticalSegments];
    
    return {
      id: Date.now().toString(),
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
      width: widthMM,
      height: heightMM,
      horizontalSegments: [...topSegments, ...bottomSegments],
      verticalSegments: allVerticalSegments
    };
  }, [scaffoldWidth, calculateScaffoldSegments, calculateVerticalScaffoldSegments]);

  // 하부자키(수직재) 생성 및 중복 제거
  const createSupportPosts = useCallback((structure: ScaffoldStructure): SupportPost[] => {
    const postRadius = 130 / 2 / (300 / 96); // 130mm 지름 → 65mm 반지름을 픽셀로 변환
    const newPosts: SupportPost[] = [];
    
    // 네 모서리에 하부자키 생성
    const corners = [
      { point: structure.topLeft, id: `${structure.id}-tl` },
      { point: structure.topRight, id: `${structure.id}-tr` },
      { point: structure.bottomLeft, id: `${structure.id}-bl` },
      { point: structure.bottomRight, id: `${structure.id}-br` }
    ];
    
    corners.forEach(corner => {
      // 기존 하부자키와 겹치는지 확인 (반지름의 2배 거리 내)
      const isOverlapping = supportPosts.some(existingPost => {
        const distance = Math.sqrt(
          Math.pow(corner.point.x - existingPost.center.x, 2) + 
          Math.pow(corner.point.y - existingPost.center.y, 2)
        );
        return distance < postRadius * 2;
      });
      
      if (!isOverlapping) {
        newPosts.push({
          id: corner.id,
          center: corner.point,
          radius: postRadius
        });
      }
    });
    
    return newPosts;
  }, [supportPosts]);

  // 모든 교차점에 하부자키 생성 (중간 교차점 포함 + 규격 검증 강화)
  const createAllSupportPosts = useCallback((structure: ScaffoldStructure): SupportPost[] => {
    const postRadius = 130 / 2 / (300 / 96); // 130mm 지름 → 65mm 반지름
    const newPosts: SupportPost[] = [];
    const postPositions: Point[] = [];
    
    // 모든 세그먼트의 시작점과 끝점 수집
    const allSegments = [...structure.horizontalSegments, ...structure.verticalSegments];
    allSegments.forEach(segment => {
      postPositions.push(segment.start, segment.end);
    });
    
    // 중복 제거 및 하부자키 생성
    const uniquePositions: Point[] = [];
    postPositions.forEach(pos => {
      const isDuplicate = uniquePositions.some(existing => {
        const distance = Math.sqrt(
          Math.pow(pos.x - existing.x, 2) + Math.pow(pos.y - existing.y, 2)
        );
        return distance < postRadius;
      });
      
      if (!isDuplicate) {
        uniquePositions.push(pos);
      }
    });
    
    // 기존 하부자키와 기존 세로 선분 모두와 중복 체크 후 새 하부자키 생성
    uniquePositions.forEach((pos, index) => {
      // 기존 하부자키와 중복 체크
      const isOverlappingWithPosts = supportPosts.some(existingPost => {
        const distance = Math.sqrt(
          Math.pow(pos.x - existingPost.center.x, 2) + 
          Math.pow(pos.y - existingPost.center.y, 2)
        );
        return distance < postRadius * 1.5; // 약간 여유 있게
      });
      
      // 기존 세로 선분과 중복 체크 (같은 위치와 방향에 세로 선분이 이미 있는지 확인)
      const isOverlappingWithVerticalSegments = strokes.some(stroke => {
        if (stroke.points.length !== 2) return false; // 세로 선분만 체크
        
        // 현재 위치에서 비계폭만큼 위/아래로 세로 선분을 그릴 예정인 위치들
        const targetHeightPx = scaffoldWidth / (300 / 96);
        const perpX = -1; // 세로 방향 (가로 방향과 수직)
        const perpY = 0;
        
        const expectedStart = pos;
        const expectedEnd = {
          x: pos.x + perpX * targetHeightPx,
          y: pos.y + perpY * targetHeightPx
        };
        
        // 기존 세로 선분과 같은 방향으로 같은 위치에 있는지 확인
        const isSameDirection = Math.abs(stroke.points[1].x - stroke.points[0].x) < 1; // 세로 선분인지 확인
        
        if (isSameDirection) {
          // 시작점이나 끝점이 현재 위치와 일치하는지 확인
          const isStartMatch = Math.abs(stroke.points[0].x - pos.x) < 1 && Math.abs(stroke.points[0].y - pos.y) < 1;
          const isEndMatch = Math.abs(stroke.points[1].x - pos.x) < 1 && Math.abs(stroke.points[1].y - pos.y) < 1;
          
          return isStartMatch || isEndMatch;
        }
        
        return false;
      });
      
      // 추가 검증: 해당 위치가 실제로 수평재 규격에 맞는 연결점인지 확인
      const isValidConnectionPoint = allSegments.some(segment => {
        // 시작점이나 끝점이 현재 위치와 일치하는지 확인
        const isStartMatch = Math.abs(segment.start.x - pos.x) < 1 && Math.abs(segment.start.y - pos.y) < 1;
        const isEndMatch = Math.abs(segment.end.x - pos.x) < 1 && Math.abs(segment.end.y - pos.y) < 1;
        
        if (isStartMatch || isEndMatch) {
          // 해당 세그먼트가 수평재 규격에 맞는지 확인 (293mm 이상)
          return segment.length >= 293;
        }
        
        return false;
      });
      
      // 모든 조건을 만족하는 경우에만 새 하부자키 생성
      if (!isOverlappingWithPosts && !isOverlappingWithVerticalSegments && isValidConnectionPoint) {
        newPosts.push({
          id: `${structure.id}-post-${index}`,
          center: pos,
          radius: postRadius
        });
      }
    });
    
    return newPosts;
  }, [supportPosts, strokes, scaffoldWidth]);

  // 캔버스 초기화 및 격자 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // 고해상도 대응
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // 배경 클리어
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 캔버스 변환 적용 (격자와 그림이 함께 움직이도록)
    ctx.save();
    ctx.translate(canvasOffset.x / window.devicePixelRatio, canvasOffset.y / window.devicePixelRatio);
    ctx.scale(zoom, zoom);

    // 격자 그리기 (변환된 좌표계에서)
    if (isGridVisible) {
      const baseGridSize = 96; // 100% 줌에서 격자 1칸 크기
      const gridSize = baseGridSize; // zoom은 이미 적용됨
      
      // 표시할 격자 범위 계산
      const startX = Math.floor(-canvasOffset.x / zoom / gridSize) * gridSize;
      const endX = Math.ceil((canvasSize.width / window.devicePixelRatio - canvasOffset.x) / zoom / gridSize) * gridSize;
      const startY = Math.floor(-canvasOffset.y / zoom / gridSize) * gridSize;
      const endY = Math.ceil((canvasSize.height / window.devicePixelRatio - canvasOffset.y) / zoom / gridSize) * gridSize;

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1 / zoom; // 줌에 관계없이 일정한 선 두께
      ctx.globalAlpha = 0.8;

      // 세로선
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }

      // 가로선
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
    
    // 모든 선 다시 그리기 (변환된 좌표계에서)
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(stroke.size, 2 / zoom); // 최소 2px로 선명하게
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      
      // 비계 선분 길이 표시
      if (stroke.points.length === 2) {
        const distance = Math.sqrt(
          Math.pow(stroke.points[1].x - stroke.points[0].x, 2) + 
          Math.pow(stroke.points[1].y - stroke.points[0].y, 2)
        );
        const lengthMM = Math.round(distance * (300 / 96));
        
        // 선분 중앙에 길이 표시
        const midX = (stroke.points[0].x + stroke.points[1].x) / 2;
        const midY = (stroke.points[0].y + stroke.points[1].y) / 2;
        
        ctx.font = `${Math.max(10 / zoom, 8)}px Arial`;
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / zoom;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 텍스트 배경 (가독성 향상)
        ctx.strokeText(`${lengthMM}mm`, midX, midY - 8);
        ctx.fillText(`${lengthMM}mm`, midX, midY - 8);
      }
    });
    
    // 하부자키 그리기 (변환된 좌표계에서)
    supportPosts.forEach(post => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'transparent'; // 투명 배경
      ctx.strokeStyle = '#000000'; // 검정색 선
      ctx.lineWidth = 2 / zoom;
      
      ctx.beginPath();
      ctx.arc(post.center.x, post.center.y, post.radius, 0, 2 * Math.PI);
      ctx.stroke(); // 선만 그리기 (채우기 없음)
    });
    
    // 미리보기 선 그리기 (변환된 좌표계에서)
    if (startPoint && previewPoint) {
      if (tool.type === 'scaffold-mode') {
        // 시스템비계 모드: 사각형 구조 미리보기
        const structure = calculateScaffoldStructure(startPoint, previewPoint);
        const allSegments = [...structure.horizontalSegments, ...structure.verticalSegments];
        
        // 비계 선분들 그리기
        allSegments.forEach((segment, index) => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = getScaffoldColor(segment.length);
          ctx.lineWidth = Math.max(tool.size, 2 / zoom);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.7;
          
          ctx.beginPath();
          ctx.moveTo(segment.start.x, segment.start.y);
          ctx.lineTo(segment.end.x, segment.end.y);
          ctx.stroke();
        });
        
        // 하부자키 미리보기 (모든 교차점)
        const previewPosts = createAllSupportPosts(structure);
        previewPosts.forEach(post => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'transparent'; // 투명 배경
          ctx.strokeStyle = '#000000'; // 검정색 선
          ctx.lineWidth = 2 / zoom;
          
          ctx.beginPath();
          ctx.arc(post.center.x, post.center.y, post.radius, 0, 2 * Math.PI);
          ctx.stroke(); // 선만 그리기 (채우기 없음)
        });
        
        ctx.globalAlpha = 1;
      } else if (tool.straightLineMode || tool.rightAngleMode) {
        // 직선/직각 모드: 세그먼트별로 그리기
        const segments = calculateScaffoldSegments(startPoint, previewPoint);
        
        segments.forEach((segment, index) => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = getScaffoldColor(segment.length);
          ctx.lineWidth = Math.max(tool.size, 2 / zoom);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.8;
          
          ctx.beginPath();
          ctx.moveTo(segment.start.x, segment.start.y);
          ctx.lineTo(segment.end.x, segment.end.y);
          ctx.stroke();
          
          // 길이 표시
          const midX = (segment.start.x + segment.end.x) / 2;
          const midY = (segment.start.y + segment.end.y) / 2;
          const actualDistance = Math.sqrt(
            Math.pow(segment.end.x - segment.start.x, 2) + 
            Math.pow(segment.end.y - segment.start.y, 2)
          );
          const actualLengthMM = Math.round(actualDistance * (300 / 96));
          
          ctx.font = `${Math.max(10 / zoom, 8)}px Arial`;
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 / zoom;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.strokeText(`${actualLengthMM}mm`, midX, midY - 8);
          ctx.fillText(`${actualLengthMM}mm`, midX, midY - 8);
        });
        
        ctx.globalAlpha = 1;
      } else if (selectedComponent === 'platform') {
        // 발판 미리보기 (600x300mm 사각형)
        const platformWidthMM = 600;
        const platformHeightMM = 300;
        const platformWidthPx = platformWidthMM / (300 / 96);
        const platformHeightPx = platformHeightMM / (300 / 96);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#6b7280';
        ctx.fillStyle = 'rgba(107, 114, 128, 0.2)';
        ctx.lineWidth = Math.max(tool.size, 2 / zoom);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.7;
        
        // 사각형 그리기
        ctx.beginPath();
        ctx.rect(startPoint.x, startPoint.y, platformWidthPx, platformHeightPx);
        ctx.fill();
        ctx.stroke();
        
        // 크기 표시
        ctx.font = `${Math.max(10 / zoom, 8)}px Arial`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          '발판 600x300mm', 
          startPoint.x + platformWidthPx / 2, 
          startPoint.y + platformHeightPx / 2
        );
        
        ctx.globalAlpha = 1;
      } else {
        // 기본 미리보기
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = tool.color;
        ctx.lineWidth = tool.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(previewPoint.x, previewPoint.y);
        ctx.stroke();
        
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }, [canvasSize, isGridVisible, canvasOffset, zoom, strokes, supportPosts, 
      startPoint, previewPoint, tool, calculateScaffoldStructure, 
      createAllSupportPosts, calculateScaffoldSegments, getScaffoldColor, selectedComponent]);

  // 좌표 변환 (화면 좌표 → 캔버스 좌표)
  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // 캔버스의 실제 크기와 CSS 크기 비율 계산
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 화면 좌표를 캔버스 좌표로 변환
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    // 캔버스 변환(오프셋과 줌) 역계산
    return {
      x: (x - canvasOffset.x) / zoom,
      y: (y - canvasOffset.y) / zoom
    };
  }, [canvasOffset, zoom]);

  // 선 그리기
  const drawLine = useCallback((from: Point, to: Point, ctx: CanvasRenderingContext2D) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = tool.color;
    ctx.lineWidth = tool.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, [tool]);

  // 두 터치 포인트 사이의 거리 계산
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 가장 가까운 선의 끝점 찾기 (자석 기능)
  const findNearestEndpoint = useCallback((point: Point): Point | null => {
    if (!tool.snapToEndpoints) return null;
    
    const threshold = 5 / zoom; // zoom을 고려한 반경 (더 정밀하게)
    let nearestEndpoint: Point | null = null;
    let minDistance = threshold;
    
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      // 시작점과 끝점 확인
      const endpoints = [stroke.points[0], stroke.points[stroke.points.length - 1]];
      
      endpoints.forEach(endpoint => {
        const distance = Math.sqrt(
          Math.pow(point.x - endpoint.x, 2) + Math.pow(point.y - endpoint.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestEndpoint = endpoint;
        }
      });
    });
    
    return nearestEndpoint;
  }, [strokes, tool.snapToEndpoints, zoom]);

  // 점이 선 근처에 있는지 확인
  const findStrokeAtPoint = useCallback((point: Point): Stroke | null => {
    const threshold = 3 / zoom; // zoom을 고려한 반경 (더 정밀하게)
    
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i];
      for (let j = 0; j < stroke.points.length - 1; j++) {
        const p1 = stroke.points[j];
        const p2 = stroke.points[j + 1];
        
        // 선분과 점 사이의 거리 계산
        const distance = distanceToLineSegment(point, p1, p2);
        if (distance <= threshold) {
          return stroke;
        }
      }
    }
    return null;
  }, [strokes, zoom]);

  // 점이 하부자키 근처에 있는지 확인
  const findSupportPostAtPoint = useCallback((point: Point): SupportPost | null => {
    const threshold = 5 / zoom; // zoom을 고려한 반경
    
    for (let i = supportPosts.length - 1; i >= 0; i--) {
      const post = supportPosts[i];
      const distance = Math.sqrt(
        Math.pow(point.x - post.center.x, 2) + Math.pow(point.y - post.center.y, 2)
      );
      
      if (distance <= threshold) {
        return post;
      }
    }
    return null;
  }, [supportPosts, zoom]);

  // 직각 그리기를 위한 점 계산
  const calculateRightAnglePoint = useCallback((start: Point, current: Point): Point => {
    const dx = Math.abs(current.x - start.x);
    const dy = Math.abs(current.y - start.y);
    
    // 더 긴 축을 따라 직각으로 조정
    if (dx > dy) {
      return { x: current.x, y: start.y }; // 수평선
    } else {
      return { x: start.x, y: current.y }; // 수직선
    }
  }, []);

  // 점과 선분 사이의 거리 계산
  const distanceToLineSegment = (point: Point, lineStart: Point, lineEnd: Point): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let t = Math.max(0, Math.min(1, dot / lenSq));
    const projection = {
      x: lineStart.x + t * C,
      y: lineStart.y + t * D
    };
    
    const dx = point.x - projection.x;
    const dy = point.y - projection.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 마우스/터치 이벤트 핸들러
  const handleStart = useCallback((clientX: number, clientY: number) => {
    const screenPoint = {
      x: clientX,
      y: clientY
    };

    if (tool.type === 'select') {
      // 선택 도구는 팬 모드로 사용
      setIsPanning(true);
      setPanStartPoint(screenPoint);
      return;
    }
    
    let point = getCanvasPoint(clientX, clientY);
    
    if (tool.type === 'line-eraser') {
      // 드래그 방식 선 삭제 모드 시작
      setIsErasing(true);
      
      // 선 삭제
      const strokeToDelete = findStrokeAtPoint(point);
      if (strokeToDelete) {
        setStrokes((prev: Stroke[]) => prev.filter((s: Stroke) => s.id !== strokeToDelete.id));
      }
      
      // 하부자키 삭제
      const postToDelete = findSupportPostAtPoint(point);
      if (postToDelete) {
        setSupportPosts((prev: SupportPost[]) => prev.filter((p: SupportPost) => p.id !== postToDelete.id));
      }
      
      setIsDrawing(true);
      setLastPoint(point);
      return;
    }

    // 자석 기능: 가까운 끝점에 스냅
    const nearestEndpoint = findNearestEndpoint(point);
    if (nearestEndpoint) {
      point = nearestEndpoint;
    }

    if (tool.type === 'pen') {
      // 새로운 선 시작 (자유 그리기)
      const newStroke: Stroke = {
        id: Date.now().toString(),
        points: [point],
        color: tool.color,
        size: tool.size,
        timestamp: Date.now()
      };
      setCurrentStroke(newStroke);
    } else if (tool.type === 'scaffold-mode' || tool.straightLineMode || tool.rightAngleMode) {
      // 시스템비계/직선/직각 그리기 시작
      setStartPoint(point);
      setPreviewPoint(point);
    }

    setIsDrawing(true);
    setLastPoint(point);
  }, [tool, getCanvasPoint, findStrokeAtPoint, findSupportPostAtPoint, findNearestEndpoint]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const screenPoint = { x: clientX, y: clientY };

    // 팬 모드 처리
    if (isPanning && panStartPoint) {
      const deltaX = screenPoint.x - panStartPoint.x;
      const deltaY = screenPoint.y - panStartPoint.y;
      
      setCanvasOffset({
        x: canvasOffset.x + deltaX,
        y: canvasOffset.y + deltaY
      });
      
      setPanStartPoint(screenPoint);
      return;
    }

    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let currentPoint = getCanvasPoint(clientX, clientY);
    
    // 자석 기능
    const nearestEndpoint = findNearestEndpoint(currentPoint);
    if (nearestEndpoint) {
      currentPoint = nearestEndpoint;
    }
    
    if (tool.type === 'pen' && currentStroke && lastPoint) {
      // 자유 그리기: 현재 선에 점 추가
      setCurrentStroke(prev => prev ? {
        ...prev,
        points: [...prev.points, currentPoint]
      } : null);
      
      // 실시간 그리기를 위해 변환 적용
      ctx.save();
      ctx.translate(canvasOffset.x / window.devicePixelRatio, canvasOffset.y / window.devicePixelRatio);
      ctx.scale(zoom, zoom);
      
      drawLine(lastPoint, currentPoint, ctx);
      
      ctx.restore();
      
      setLastPoint(currentPoint);
    } else if (tool.type === 'line-eraser' && lastPoint) {
      // 드래그 중 지나간 선들과 하부자키 삭제
      const strokeToDelete = findStrokeAtPoint(currentPoint);
      if (strokeToDelete) {
        setStrokes((prev: Stroke[]) => prev.filter((s: Stroke) => s.id !== strokeToDelete.id));
      }
      
      const postToDelete = findSupportPostAtPoint(currentPoint);
      if (postToDelete) {
        setSupportPosts((prev: SupportPost[]) => prev.filter((p: SupportPost) => p.id !== postToDelete.id));
      }
      
      setLastPoint(currentPoint);
    } else if (tool.rightAngleMode && startPoint) {
      // 직각 미리보기 (우선순위 높음)
      const rightAnglePoint = calculateRightAnglePoint(startPoint, currentPoint);
      setPreviewPoint(rightAnglePoint);
    } else if (selectedComponent === 'platform' && startPoint) {
      // 발판은 사각형으로 미리보기
      setPreviewPoint(currentPoint);
    } else if (tool.type === 'scaffold-mode' || tool.straightLineMode) {
      // 시스템비계/직선 미리보기
      setPreviewPoint(currentPoint);
    }
      }, [isDrawing, lastPoint, tool, getCanvasPoint, drawLine, currentStroke, 
        findNearestEndpoint, findStrokeAtPoint, findSupportPostAtPoint, startPoint, calculateRightAnglePoint, isPanning, 
        panStartPoint, setCanvasOffset, selectedComponent]);

  const handleEnd = useCallback(() => {
    // 팬 모드 종료
    if (isPanning) {
      setIsPanning(false);
      setPanStartPoint(null);
      return;
    }

    if (tool.type === 'pen' && currentStroke) {
      // 자유 그리기: 완성된 선을 저장
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke(null);
    } else if (selectedComponent === 'platform' && startPoint && previewPoint) {
      // 발판: 사각형 영역 생성 (600x300mm 표준 크기)
      const platformWidthMM = 600;
      const platformHeightMM = 300;
      const platformWidthPx = platformWidthMM / (300 / 96);
      const platformHeightPx = platformHeightMM / (300 / 96);
      
      // 발판 사각형의 네 모서리
      const topLeft = startPoint;
      const topRight: Point = { x: startPoint.x + platformWidthPx, y: startPoint.y };
      const bottomLeft: Point = { x: startPoint.x, y: startPoint.y + platformHeightPx };
      const bottomRight: Point = { x: startPoint.x + platformWidthPx, y: startPoint.y + platformHeightPx };
      
      // 발판을 선으로 표현 (사각형)
      const platformStrokes: Stroke[] = [
        {
          id: `${Date.now()}-platform-top`,
          points: [topLeft, topRight],
          color: '#6b7280',
          size: tool.size,
          timestamp: Date.now()
        },
        {
          id: `${Date.now()}-platform-right`,
          points: [topRight, bottomRight],
          color: '#6b7280',
          size: tool.size,
          timestamp: Date.now()
        },
        {
          id: `${Date.now()}-platform-bottom`,
          points: [bottomRight, bottomLeft],
          color: '#6b7280',
          size: tool.size,
          timestamp: Date.now()
        },
        {
          id: `${Date.now()}-platform-left`,
          points: [bottomLeft, topLeft],
          color: '#6b7280',
          size: tool.size,
          timestamp: Date.now()
        }
      ];
      
      setStrokes((prev: Stroke[]) => [...prev, ...platformStrokes]);
      setStartPoint(null);
      setPreviewPoint(null);
    } else if (tool.type === 'scaffold-mode' && startPoint && previewPoint) {
      // 시스템비계 모드: 사각형 구조 생성 (최우선)
      const structure = calculateScaffoldStructure(startPoint, previewPoint);
      
      // 모든 세그먼트를 선으로 변환
      const allSegments = [...structure.horizontalSegments, ...structure.verticalSegments];
      const newStrokes: Stroke[] = allSegments.map((segment, index) => ({
        id: `${Date.now()}-${index}`,
        points: [segment.start, segment.end],
        color: getScaffoldColor(segment.length),
        size: tool.size,
        timestamp: Date.now()
      }));
      
      // 하부자키 생성 (모든 교차점에)
      const newPosts = createAllSupportPosts(structure);
      
      setScaffoldStructures((prev: ScaffoldStructure[]) => [...prev, structure]);
      setStrokes((prev: Stroke[]) => [...prev, ...newStrokes]);
      setSupportPosts((prev: SupportPost[]) => [...prev, ...newPosts]);
      setStartPoint(null);
      setPreviewPoint(null);
    } else if ((tool.straightLineMode || tool.rightAngleMode) && 
               startPoint && previewPoint) {
      // 직선/직각 그리기: 비계 규격으로 세그먼트 분할
      const segments = calculateScaffoldSegments(startPoint, previewPoint);
      const newStrokes: Stroke[] = segments.map((segment, index) => ({
        id: `${Date.now()}-${index}`,
        points: [segment.start, segment.end],
        color: getScaffoldColor(segment.length),
        size: tool.size,
        timestamp: Date.now()
      }));
      
      setStrokes((prev: Stroke[]) => [...prev, ...newStrokes]);
      setStartPoint(null);
      setPreviewPoint(null);
    }
    
    setIsDrawing(false);
    setLastPoint(null);
    setIsErasing(false);
  }, [currentStroke, tool, startPoint, previewPoint, isPanning, calculateScaffoldStructure, 
      createAllSupportPosts, calculateScaffoldSegments, getScaffoldColor]);

  // 마우스 이벤트
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleEnd();
  }, [handleEnd]);

  // 터치 이벤트
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // 두 손가락 터치: 핀치 줌 시작
      setTouches(e.touches);
      setInitialPinchDistance(getTouchDistance(e.touches));
      setInitialZoom(zoom);
      setIsPanning(false); // 핀치 중에는 패닝 비활성화
    } else if (e.touches.length === 1) {
      // 한 손가락 터치: 그리기 또는 패닝
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }
  }, [handleStart, zoom, getTouchDistance]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      // 핀치 줌 처리
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.1, Math.min(5, initialZoom * scale));
      setZoom(newZoom);
    } else if (e.touches.length === 1) {
      // 한 손가락 이동: 그리기 또는 패닝
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }
  }, [handleMove, initialPinchDistance, initialZoom, getTouchDistance, setZoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 0) {
      // 모든 터치 종료
      handleEnd();
      setTouches(null);
      setInitialPinchDistance(null);
    } else if (e.touches.length === 1) {
      // 하나의 터치만 남음: 그리기/패닝으로 전환
      setTouches(null);
      setInitialPinchDistance(null);
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }
  }, [handleEnd, handleStart]);

  return (
    <div className="drawing-canvas-container">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleEnd}
      />
    </div>
  );
};

export default DrawingCanvas; 