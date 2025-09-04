import React, { useState } from 'react';
import DrawingCanvas from './components/DrawingCanvas';
import Toolbar from './components/Toolbar';
import ComponentPalette from './components/ComponentPalette';
import './App.css';

export interface DrawingTool {
  type: 'pen' | 'scaffold-mode' | 'line-eraser' | 'select';
  size: number;
  color: string;
  // 드로잉 옵션들
  straightLineMode: boolean;
  rightAngleMode: boolean;
  snapToEndpoints: boolean;
}

function App() {
  const [currentTool, setCurrentTool] = useState<DrawingTool>({
    type: 'pen',
    size: 2,
    color: '#2563eb',
    straightLineMode: false,
    rightAngleMode: false,
    snapToEndpoints: false
  });
  
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [pixelToMmRatio, setPixelToMmRatio] = useState(0.353);
  const [scaffoldWidth, setScaffoldWidth] = useState(902);
  
  // 전체 지우기 기능을 위한 상태들
  const [strokes, setStrokes] = useState<any[]>([]);
  const [scaffoldStructures, setScaffoldStructures] = useState<any[]>([]);
  const [supportPosts, setSupportPosts] = useState<any[]>([]);

  return (
    <div className="app">
              <Toolbar 
          currentTool={currentTool}
          setCurrentTool={setCurrentTool}
          isGridVisible={isGridVisible}
          setIsGridVisible={setIsGridVisible}
          zoom={zoom}
          setZoom={setZoom}
          scaffoldWidth={scaffoldWidth}
          setScaffoldWidth={setScaffoldWidth}
          strokes={strokes}
          setStrokes={setStrokes}
          scaffoldStructures={scaffoldStructures}
          setScaffoldStructures={setScaffoldStructures}
          supportPosts={supportPosts}
          setSupportPosts={setSupportPosts}
          canvasOffset={canvasOffset}
          setCanvasOffset={setCanvasOffset}
        />
      
      <main className="main-content">
        <DrawingCanvas 
          tool={currentTool}
          isGridVisible={isGridVisible}
          zoom={zoom}
          setZoom={setZoom}
          canvasOffset={canvasOffset}
          setCanvasOffset={setCanvasOffset}
          scaffoldWidth={scaffoldWidth}
          strokes={strokes}
          setStrokes={setStrokes}
          scaffoldStructures={scaffoldStructures}
          setScaffoldStructures={setScaffoldStructures}
          supportPosts={supportPosts}
          setSupportPosts={setSupportPosts}
        />
      </main>
      
      <ComponentPalette />
    </div>
  );
}

export default App; 