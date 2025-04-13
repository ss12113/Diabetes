// script.js

// 侧边菜单切换函数
function toggleSideMenu() {
  const sideMenu = document.getElementById('side-menu');
  sideMenu.classList.toggle('open');
}

// 统一用一个变量来记录当前 section
let currentSectionId = 'chat-section';

// 页面切换函数
function switchSection(sectionId) {
  // 1) 切换页面之前，先强制关闭侧边菜单，避免菜单导致布局问题
  const sideMenu = document.getElementById('side-menu');
  sideMenu.classList.remove('open');

  // 2) 隐藏所有 section
  const sections = document.querySelectorAll('.section');
  sections.forEach(sec => {
    sec.style.display = 'none';
  });

  // 3) 显示目标 section，用 block 即可
  const targetSection = document.getElementById(sectionId);
  targetSection.style.display = 'block';

  // 4) 如果是新闻页面，加载新闻
  if (sectionId === 'news-section') {
    loadNews();
  }

  // 5) 如果切换到对话页面，延迟滚动到底部
  if (sectionId === 'chat-section') {
    const chatBox = document.getElementById('chat-box');
    requestAnimationFrame(() => {
      chatBox.scrollTop = chatBox.scrollHeight;
    });
  }

  currentSectionId = sectionId;
}
