import React, { useState } from 'react';
import './ComponentPalette.css';

interface ScaffoldComponent {
  id: string;
  name: string;
  type: 'horizontal' | 'vertical' | 'diagonal' | 'joint' | 'platform';
  icon: string;
  description: string;
}

const scaffoldComponents: ScaffoldComponent[] = [
  {
    id: 'h-beam-1',
    name: '수평재 1m',
    type: 'horizontal',
    icon: '━',
    description: '1미터 수평 비계재'
  },
  {
    id: 'h-beam-2',
    name: '수평재 2m',
    type: 'horizontal',
    icon: '━━',
    description: '2미터 수평 비계재'
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
    id: 'joint',
    name: '조인트',
    type: 'joint',
    icon: '╋',
    description: '연결 조인트'
  },
  {
    id: 'platform',
    name: '발판',
    type: 'platform',
    icon: '▬',
    description: '작업 발판'
  }
];

const ComponentPalette: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  const handleComponentSelect = (componentId: string) => {
    setSelectedComponent(componentId);
    // TODO: 선택된 부품을 캔버스에 적용하는 로직 추가
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
              부품을 선택한 후 캔버스에서 선을 그리면 해당 부품으로 자동 변환됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentPalette; 