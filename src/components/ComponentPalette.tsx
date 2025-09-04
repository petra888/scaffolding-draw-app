import React, { useState } from 'react';
import { DrawingTool } from '../App';
import './ComponentPalette.css';

interface ScaffoldComponent {
  id: string;
  name: string;
  type: 'horizontal' | 'vertical' | 'diagonal' | 'joint' | 'platform';
  icon: string;
  description: string;
  length?: number; // mm 단위
}

interface ComponentPaletteProps {
  selectedComponent: string | null;
  setSelectedComponent: (id: string | null) => void;
  currentTool: DrawingTool;
  setCurrentTool: (tool: DrawingTool) => void;
}

const scaffoldComponents: ScaffoldComponent[] = [
  {
    id: 'h-beam-293',
    name: '수평재 293mm',
    type: 'horizontal',
    icon: '━',
    description: '293mm 수평 비계재',
    length: 293
  },
  {
    id: 'h-beam-598',
    name: '수평재 598mm',
    type: 'horizontal',
    icon: '━━',
    description: '598mm 수평 비계재',
    length: 598
  },
  {
    id: 'h-beam-902',
    name: '수평재 902mm',
    type: 'horizontal',
    icon: '━━━',
    description: '902mm 수평 비계재',
    length: 902
  },
  {
    id: 'h-beam-1207',
    name: '수평재 1.2m',
    type: 'horizontal',
    icon: '━━━━',
    description: '1207mm 수평 비계재',
    length: 1207
  },
  {
    id: 'v-beam',
    name: '수직재',
    type: 'vertical',
    icon: '┃',
    description: '표준 수직 비계재'
  },
  {
    id: 'diagonal',
    name: '사재',
    type: 'diagonal',
    icon: '╱',
    description: '대각선 보강재'
  },
  {
    id: 'platform',
    name: '발판',
    type: 'platform',
    icon: '▬',
    description: '작업 발판'
  }
];

const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  selectedComponent,
  setSelectedComponent,
  currentTool,
  setCurrentTool
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleComponentSelect = (componentId: string) => {
    if (selectedComponent === componentId) {
      // 같은 부품을 다시 클릭하면 선택 해제
      setSelectedComponent(null);
      setCurrentTool({ ...currentTool, type: 'pen' });
    } else {
      // 새로운 부품 선택
      setSelectedComponent(componentId);
      const component = scaffoldComponents.find(c => c.id === componentId);
      
      if (component) {
        // 부품 타입에 따라 도구 설정 변경
        const newTool: DrawingTool = {
          ...currentTool,
          type: 'scaffold-mode',
          color: '#2563eb',
          size: 3
        };

        // 부품별 특성 설정
        switch (component.type) {
          case 'horizontal':
            newTool.straightLineMode = true;
            newTool.rightAngleMode = false;
            break;
          case 'vertical':
            newTool.straightLineMode = true;
            newTool.rightAngleMode = true; // 수직선 우선
            break;
          case 'diagonal':
            newTool.straightLineMode = true;
            newTool.rightAngleMode = false;
            break;
          case 'platform':
            newTool.type = 'scaffold-mode'; // 사각형 모드
            break;
        }

        setCurrentTool(newTool);
      }
    }
  };

  const togglePalette = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`component-palette ${isExpanded ? 'expanded' : ''}`}>
      <div className="palette-header" onClick={togglePalette}>
        <h3 className="palette-title">시스템비계 부품</h3>
        <button className="toggle-btn">
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="palette-content">
          <div className="component-grid">
            {scaffoldComponents.map((component) => (
              <div
                key={component.id}
                className={`component-item ${
                  selectedComponent === component.id ? 'selected' : ''
                }`}
                onClick={() => handleComponentSelect(component.id)}
                title={component.description}
              >
                <div className="component-icon">{component.icon}</div>
                <div className="component-name">{component.name}</div>
              </div>
            ))}
          </div>
          
          <div className="palette-info">
            <p className="info-text">
              {selectedComponent 
                ? `선택된 부품: ${scaffoldComponents.find(c => c.id === selectedComponent)?.name}`
                : '부품을 선택하여 표준 규격으로 그리기'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentPalette; 