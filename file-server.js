const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const HOST = '0.0.0.0';

// MIME 타입 매핑
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.md': 'text/markdown'
};

// HTML 템플릿 생성
function generateHTML(currentPath, files, dirs) {
  const parentPath = path.dirname(currentPath) === '.' ? '/' : path.dirname(currentPath);
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>파일 탐색기 - ${currentPath}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: #007bff;
            color: white;
            padding: 20px;
            margin: 0;
        }
        .breadcrumb {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #dee2e6;
        }
        .breadcrumb a {
            color: #007bff;
            text-decoration: none;
        }
        .breadcrumb a:hover {
            text-decoration: underline;
        }
        .content {
            padding: 20px;
        }
        .folder, .file {
            display: flex;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #eee;
            text-decoration: none;
            color: inherit;
        }
        .folder:hover, .file:hover {
            background-color: #f8f9fa;
        }
        .folder {
            background-color: #e3f2fd;
            color: #1976d2;
        }
        .file {
            background-color: #fafafa;
            color: #333;
        }
        .icon {
            margin-right: 10px;
            font-size: 20px;
        }
        .folder .icon::before {
            content: "📁";
        }
        .file .icon::before {
            content: "📄";
        }
        .name {
            flex: 1;
        }
        .size {
            color: #666;
            font-size: 0.9em;
        }
        .empty {
            text-align: center;
            color: #666;
            padding: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="header">📁 파일 탐색기</h1>
        <div class="breadcrumb">
            <a href="/">🏠 홈</a>
            ${currentPath !== '/' ? ` / <a href="${parentPath}">⬆️ 상위 폴더</a>` : ''}
        </div>
        <div class="content">
            ${dirs.length === 0 && files.length === 0 ? 
                '<div class="empty">이 폴더는 비어있습니다.</div>' : 
                ''
            }
            ${dirs.map(dir => `
                <a href="${path.join(currentPath, dir)}" class="folder">
                    <span class="icon"></span>
                    <span class="name">${dir}</span>
                    <span class="size">폴더</span>
                </a>
            `).join('')}
            ${files.map(file => `
                <div class="file">
                    <span class="icon"></span>
                    <span class="name">${file.name}</span>
                    <span class="size">${file.size}</span>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 서버 생성
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  
  // 기본 경로를 현재 디렉토리로 설정
  if (pathname === '/') {
    pathname = '.';
  } else {
    pathname = pathname.substring(1); // 앞의 '/' 제거
  }
  
  // 보안: 상위 디렉토리로 이동하는 것을 방지
  if (pathname.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('접근이 거부되었습니다.');
    return;
  }
  
  try {
    const stat = fs.statSync(pathname);
    
    if (stat.isDirectory()) {
      // 디렉토리인 경우
      const items = fs.readdirSync(pathname);
      const dirs = [];
      const files = [];
      
      for (const item of items) {
        const itemPath = path.join(pathname, item);
        try {
          const itemStat = fs.statSync(itemPath);
          if (itemStat.isDirectory()) {
            dirs.push(item);
          } else {
            files.push({
              name: item,
              size: formatFileSize(itemStat.size)
            });
          }
        } catch (err) {
          // 접근할 수 없는 파일/폴더는 무시
        }
      }
      
      // 정렬: 폴더 먼저, 그 다음 파일
      dirs.sort();
      files.sort((a, b) => a.name.localeCompare(b.name));
      
      const html = generateHTML(pathname === '.' ? '/' : '/' + pathname, files, dirs);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      
    } else {
      // 파일인 경우 다운로드 또는 표시
      const ext = path.extname(pathname).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      if (contentType.startsWith('text/') || contentType === 'application/json') {
        // 텍스트 파일은 내용 표시
        try {
          const content = fs.readFileSync(pathname, 'utf8');
          res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
          res.end(content);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('파일을 읽을 수 없습니다.');
        }
      } else {
        // 바이너리 파일은 다운로드
        try {
          const content = fs.readFileSync(pathname);
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${path.basename(pathname)}"`
          });
          res.end(content);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('파일을 읽을 수 없습니다.');
        }
      }
    }
    
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <head><title>404 - 파일을 찾을 수 없습니다</title></head>
        <body>
          <h1>404 - 파일을 찾을 수 없습니다</h1>
          <p>요청한 경로: ${pathname}</p>
          <p><a href="/">홈으로 돌아가기</a></p>
        </body>
      </html>
    `);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 파일 서버가 시작되었습니다!`);
  console.log(`📱 갤럭시 탭에서 접속: http://${getLocalIP()}:${PORT}`);
  console.log(`💻 로컬에서 접속: http://localhost:${PORT}`);
  console.log(`🌐 네트워크 접속: http://0.0.0.0:${PORT}`);
  console.log(`\n📋 사용법:`);
  console.log(`1. 갤럭시 탭과 같은 Wi-Fi 네트워크에 연결`);
  console.log(`2. 갤럭시 탭 브라우저에서 위 주소 중 하나로 접속`);
  console.log(`3. 폴더를 클릭하여 탐색`);
  console.log(`\n⏹️  서버 중지: Ctrl+C`);
});

// 로컬 IP 주소 가져오기
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}