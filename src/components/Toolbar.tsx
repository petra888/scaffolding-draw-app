import React from 'react';
import { DrawingTool } from '../App';
import './Toolbar.css';

interface ToolbarProps {
  currentTool: DrawingTool;
  setCurrentTool: (tool: DrawingTool) => void;
  isGridVisible: boolean;
  setIsGridVisible: (visible: boolean) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  scaffoldWidth: number;
  setScaffoldWidth: (width: number) => void;
  setStrokes: (strokes: any[]) => void;
  setScaffoldStructures: (structures: any[]) => void;
  setSupportPosts: (posts: any[]) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setCurrentTool,
  isGridVisible,
  setIsGridVisible,
  zoom,
  setZoom,
  scaffoldWidth,
  setScaffoldWidth,
  setStrokes,
  setScaffoldStructures,
  setSupportPosts
}) => {
  const handleToolChange = (type: DrawingTool['type']) => {
    setCurrentTool({ ...currentTool, type });
  };

  const handleSizeChange = (size: number) => {
    setCurrentTool({ ...currentTool, size });
  };

  const handleColorChange = (color: string) => {
    setCurrentTool({ ...currentTool, color });
  };

  const toggleSnapToEndpoints = () => {
    setCurrentTool({ ...currentTool, snapToEndpoints: !currentTool.snapToEndpoints });
  };

  const toggleStraightLineMode = () => {
    setCurrentTool({ ...currentTool, straightLineMode: !currentTool.straightLineMode });
  };

  const toggleRightAngleMode = () => {
    setCurrentTool({ ...currentTool, rightAngleMode: !currentTool.rightAngleMode });
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.05, 5)); // 5%씩 증가, 최대 500%
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.05, 0.1)); // 5%씩 감소, 최소 10%
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const handleZoomInput = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 10 && numValue <= 500) {
      setZoom(numValue / 100); // 퍼센트를 소수로 변환
    }
  };

  const handleScaffoldWidthChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 293 && numValue <= 1817) {
      setScaffoldWidth(numValue);
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h1 className="app-title">시스템비계 드로잉</h1>
      </div>

      <div className="toolbar-section">
        {/* 도구 선택 */}
        <div className="tool-group">
          <button
            className={`tool-btn ${currentTool.type === 'pen' ? 'active' : ''}`}
            onClick={() => handleToolChange('pen')}
            title="자유 그리기"
          >
            ✏️
          </button>
          <button
            className={`tool-btn ${currentTool.type === 'scaffold-mode' ? 'active' : ''}`}
            onClick={() => handleToolChange('scaffold-mode')}
            title="시스템비계 모드 (표준 규격으로 자동 분할)"
          >
            🏗️
          </button>

          <button
            className={`tool-btn ${currentTool.type === 'line-eraser' ? 'active' : ''}`}
            onClick={() => handleToolChange('line-eraser')}
            title="선 삭제 (드래그해서 지나간 선들 모두 삭제)"
          >
            🗑️
          </button>
          <button
            className={`tool-btn ${currentTool.type === 'select' ? 'active' : ''}`}
            onClick={() => handleToolChange('select')}
            title="화면 이동 (드래그로 화면을 움직일 수 있습니다)"
          >
            👆
          </button>
        </div>

        {/* 비계 폭 설정 - 비계모드에서만 표시 */}
        {currentTool.type === 'scaffold-mode' && (
          <div className="tool-group scaffold-width-group">
            <label className="tool-label">비계폭</label>
            <select
              value={scaffoldWidth}
              onChange={(e) => handleScaffoldWidthChange(e.target.value)}
              className="scaffold-width-select"
              title="비계 폭 설정 (표준 규격)"
            >
              <option value={293}>293mm</option>
              <option value={598}>598mm</option>
              <option value={902}>902mm</option>
              <option value={1207}>1207mm</option>
              <option value={1512}>1512mm</option>
              <option value={1817}>1817mm</option>
            </select>
          </div>
        )}

        {/* 브러시 크기 */}
        <div className="tool-group">
          <label className="tool-label">크기</label>
          <input
            type="range"
            min="1"
            max="20"
            value={currentTool.size}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            className="size-slider"
          />
          <span className="size-value">{currentTool.size}</span>
        </div>

        {/* 색상 선택 */}
        <div className="tool-group">
          <label className="tool-label">색상</label>
          <input
            type="color"
            value={currentTool.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="color-picker"
          />
        </div>
      </div>

      <div className="toolbar-section">
        {/* 그리기 옵션들 */}
        <button
          className={`tool-btn ${currentTool.straightLineMode ? 'active' : ''}`}
          onClick={toggleStraightLineMode}
          title="직선 모드"
        >
          📏
        </button>
        <button
          className={`tool-btn ${currentTool.rightAngleMode ? 'active' : ''}`}
          onClick={toggleRightAngleMode}
          title="직각 모드"
        >
          📐
        </button>
        <button
          className={`tool-btn ${currentTool.snapToEndpoints ? 'active' : ''}`}
          onClick={toggleSnapToEndpoints}
          title="자석 기능 (선 끝점에 자동 연결)"
        >
          🧲
        </button>
        
        {/* 격자 토글 */}
        <button
          className={`tool-btn ${isGridVisible ? 'active' : ''}`}
          onClick={() => setIsGridVisible(!isGridVisible)}
          title="격자 보기/숨기기"
        >
          📏
        </button>

        {/* 전체 지우기 */}
        <button
          className="tool-btn clear-all-btn"
          onClick={() => {
            if (window.confirm('모든 그리기 내용을 지우시겠습니까?')) {
              setStrokes([]);
              setScaffoldStructures([]);
              setSupportPosts([]);
            }
          }}
          title="모든 그리기 내용 지우기"
        >
          🗑️ 전체지우기
        </button>

        {/* 줌 컨트롤 */}
        <div className="tool-group">
          <button onClick={handleZoomOut} className="zoom-btn" title="5% 축소">
            🔍-
          </button>
          <input
            type="number"
            min="10"
            max="500"
            step="5"
            value={Math.round(zoom * 100)}
            onChange={(e) => handleZoomInput(e.target.value)}
            className="zoom-input"
            title="줌 비율 직접 입력 (10-500%)"
          />
          <span className="zoom-percent">%</span>
          <button onClick={handleZoomIn} className="zoom-btn" title="5% 확대">
            🔍+
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar; 