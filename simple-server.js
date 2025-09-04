const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '0.0.0.0';

// 간단한 HTML 생성
function createHTML(currentPath, items) {
  const parentPath = path.dirname(currentPath) === '.' ? '/' : path.dirname(currentPath);
  
  let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>파일 탐색기 - ${currentPath}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .folder { color: blue; font-weight: bold; }
        .file { color: black; }
        a { text-decoration: none; }
        a:hover { text-decoration: underline; }
        .back { margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>📁 파일 탐색기</h1>
    <div class="back">
        <a href="/">🏠 홈</a>
        ${currentPath !== '/' ? ` | <a href="${parentPath}">⬆️ 상위 폴더</a>` : ''}
    </div>
    <hr>
    <ul>`;
  
  items.forEach(item => {
    if (item.isDirectory) {
      html += `<li><a href="${path.join(currentPath, item.name)}" class="folder">📁 ${item.name}</a></li>`;
    } else {
      html += `<li><span class="file">📄 ${item.name} (${item.size})</span></li>`;
    }
  });
  
  html += `
    </ul>
</body>
</html>`;
  
  return html;
}

// 파일 크기 포맷팅
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  let filePath = req.url === '/' ? '.' : req.url.substring(1);
  
  // 보안: 상위 디렉토리 접근 방지
  if (filePath.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('접근 거부');
    return;
  }
  
  try {
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 디렉토리 목록 표시
      const files = fs.readdirSync(filePath);
      const items = [];
      
      files.forEach(file => {
        try {
          const itemPath = path.join(filePath, file);
          const itemStat = fs.statSync(itemPath);
          items.push({
            name: file,
            isDirectory: itemStat.isDirectory(),
            size: itemStat.isDirectory() ? '폴더' : formatSize(itemStat.size)
          });
        } catch (err) {
          // 접근할 수 없는 파일은 무시
        }
      });
      
      // 폴더 먼저, 그 다음 파일 순으로 정렬
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      const html = createHTML(filePath === '.' ? '/' : '/' + filePath, items);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      
    } else {
      // 파일 다운로드
      const stream = fs.createReadStream(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`
      });
      stream.pipe(res);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <body>
          <h1>404 - 파일을 찾을 수 없습니다</h1>
          <p>경로: ${filePath}</p>
          <p><a href="/">홈으로 돌아가기</a></p>
        </body>
      </html>
    `);
  }
});

server.listen(PORT, HOST, () => {
  console.log('🚀 간단한 파일 서버가 시작되었습니다!');
  console.log(`📱 접속 주소: http://localhost:${PORT}`);
  console.log(`🌐 네트워크 접속: http://0.0.0.0:${PORT}`);
  console.log('\n📋 사용법:');
  console.log('1. 갤럭시 탭과 같은 Wi-Fi에 연결');
  console.log('2. 위 주소로 접속');
  console.log('3. 폴더를 클릭하여 탐색');
  console.log('\n⏹️  서버 중지: Ctrl+C');
});

// 에러 처리
server.on('error', (err) => {
  console.error('서버 에러:', err);
});