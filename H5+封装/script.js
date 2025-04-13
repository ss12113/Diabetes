// ========== 国际化资源 ==========
const i18n = {
  zh: {
    title: "健康助手",
    menu_chat: "对话",
    menu_record: "档案",
    menu_science: "科普",
    menu_device: "设备",
    menu_about: "关于",
    header_title: "健康助手",
    header_subtitle: "健康 AI 对话 · 健康档案 · 健康科普",
    chat_placeholder: "输入您的问题...",
    send_btn: "发送",
    label_date: "测量日期：",
    label_height: "身高 (cm)：",
    label_weight: "体重 (kg)：",
    label_blood_sugar: "血糖值 (mmol/L)：",
    label_exercise: "运动情况：",
    label_sleep: "睡眠时间 (小时)：",
    save_btn: "保存记录",
    reset_btn: "重置",
    history_title: "历史记录",
    refresh_science: "刷新科普",
    loading_science: "科普内容正在获取中……",
    advice_loading: "正在获取健康建议...\n",
    alert_fill: "请填写所有记录项！",
    api_error: "调用接口出错",
    science_error: "科普内容格式有误，请稍后重试。",
    about_title: "关于",
    about_content: "这是一个健康助手应用程序，提供健康 AI 对话、健康档案管理以及健康科普等服务，帮助您更好地关注健康生活。",
    bt_connect: "查找",
    device_tip: "点按查找按钮以连接血糖仪，获取您的专属建议"
  },
  en: {
    title: "Health Assistant",
    menu_chat: "Chat",
    menu_record: "Records",
    menu_science: "Science",
    menu_device: "Device",
    menu_about: "About",
    header_title: "Health Assistant",
    header_subtitle: "AI Chat · Health Records · Science",
    chat_placeholder: "Type your question...",
    send_btn: "Send",
    label_date: "Date:",
    label_height: "Height (cm):",
    label_weight: "Weight (kg):",
    label_blood_sugar: "Blood Sugar (mmol/L):",
    label_exercise: "Exercise:",
    label_sleep: "Sleep (hrs):",
    save_btn: "Save",
    reset_btn: "Reset",
    history_title: "History",
    refresh_science: "Refresh Science",
    loading_science: "Loading science content…",
    advice_loading: "Fetching health advice...\n",
    alert_fill: "Please fill all fields!",
    api_error: "API error",
    science_error: "Science content format error, please try again later.",
    about_title: "About",
    about_content: "This is a health assistant app providing AI chat, health records management, and science content to help you stay informed about healthy living.",
    bt_connect: "Find",
    device_tip: "Tap the Find button to connect to your blood glucose meter and get personalized advice."
  }
};

let lang = 'zh';
let records = [];
let cachedScienceData = null;
let chart = null;

// 控制科普连续请求开关及计数
let scienceStreamActive = false;
let scienceRequestCount = 0;
const SCIENCE_REQUEST_LIMIT = 5;

// 新版 API 接口配置
const NEW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const NEW_MODEL_NAME = 'deepseek-ai/DeepSeek-V3';
const NEW_API_KEY = 'sk-drchipruirzifwonqwyazjxrvqailjdrahqgslmnlgcayzyk';

// 页面加载初始化
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage();
  loadScience();
  loadRecordsFromStorage();
});

// ========== 语言切换与菜单 ==========
function applyLanguage() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = i18n[lang].title;
  document.getElementById('app-title').innerText = i18n[lang].header_title;
  document.getElementById('app-subtitle').innerText = i18n[lang].header_subtitle;
  document.getElementById('menu-chat').innerText = i18n[lang].menu_chat;
  document.getElementById('menu-record').innerText = i18n[lang].menu_record;
  document.getElementById('menu-device').innerText = i18n[lang].menu_device;
  document.getElementById('menu-science').innerText = i18n[lang].menu_science;
  document.getElementById('menu-about').innerText = i18n[lang].menu_about;
  document.getElementById('user-input').placeholder = i18n[lang].chat_placeholder;
  document.getElementById('send-btn').innerText = i18n[lang].send_btn;
  document.getElementById('label-date').innerText = i18n[lang].label_date;
  document.getElementById('label-height').innerText = i18n[lang].label_height;
  document.getElementById('label-weight').innerText = i18n[lang].label_weight;
  document.getElementById('label-blood-sugar').innerText = i18n[lang].label_blood_sugar;
  document.getElementById('label-exercise').innerText = i18n[lang].label_exercise;
  document.getElementById('label-sleep').innerText = i18n[lang].label_sleep;
  document.getElementById('save-btn').innerText = i18n[lang].save_btn;
  document.getElementById('reset-btn').innerText = i18n[lang].reset_btn;
  document.getElementById('history-title').innerText = i18n[lang].history_title;
  document.getElementById('refresh-science').innerText = i18n[lang].refresh_science;
  const loadingEl = document.getElementById('science-loading');
  if (loadingEl) loadingEl.innerText = i18n[lang].loading_science;

  const aboutTitleEl = document.getElementById('about-title');
  const aboutContentEl = document.getElementById('about-content');
  if (aboutTitleEl) aboutTitleEl.innerText = i18n[lang].about_title;
  if (aboutContentEl) aboutContentEl.innerText = i18n[lang].about_content;

  const btBtn = document.getElementById('bt-find');
  if (btBtn) btBtn.innerText = i18n[lang].bt_connect;
  const deviceTip = document.getElementById('device-tip');
  if (deviceTip) deviceTip.innerText = i18n[lang].device_tip;

  document.getElementById('lang-toggle').innerText = lang === 'zh' ? 'EN' : '中';
}

function toggleLanguage() {
  lang = lang === 'zh' ? 'en' : 'zh';
  applyLanguage();

  // 重置科普内容区
  cachedScienceData = null;
  const scienceBox = document.getElementById('science-box');
  scienceBox.innerHTML = `<p id="science-loading">${i18n[lang].loading_science}</p>`;
  scienceStreamActive = false;
  scienceRequestCount = 0;
  loadScience();

  displayRecords();
  updateChart();
}

function toggleSideMenu() {
  document.getElementById('side-menu').classList.toggle('open');
}

function switchSection(sectionId) {
  document.getElementById('side-menu').classList.remove('open');
  document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
}

// ========== 流式请求 ==========
async function streamFetch(url, payload, onChunk, customHeaders) {
  try {
    const headers = customHeaders || {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NEW_API_KEY}`
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("网络响应异常");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.substring(5).trim();
            if (dataStr === "[DONE]") {
              done = true;
              break;
            }
            try {
              const jsonData = JSON.parse(dataStr);
              const content = jsonData.choices[0].delta.content || "";
              onChunk(content);
            } catch (e) {
              console.error("JSON 解析错误：", e);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Stream fetch error:", error);
    onChunk(i18n[lang].api_error);
  }
}

// ========== 对话 ==========
async function sendMessage() {
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;

  const chatBox = document.getElementById('chat-box');
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'message user-message';
  userMsgDiv.innerText = message;
  chatBox.appendChild(userMsgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
  input.value = "";

  const botMsgDiv = document.createElement('div');
  botMsgDiv.className = 'message bot-message';
  botMsgDiv.innerText = "";
  chatBox.appendChild(botMsgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // 对话调用新的 API 地址
  await streamFetch(
    NEW_API_URL,
    { model: NEW_MODEL_NAME, messages: [{ role: "user", content: message }], stream: true },
    chunk => {
      botMsgDiv.innerText += chunk.replace(/[#*]/g, "");
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  );
}

// ========== 健康档案及分析 ==========
function saveRecord() {
  const date = document.getElementById('record-date').value;
  const height = document.getElementById('height').value;
  const weight = document.getElementById('weight').value;
  const bloodSugar = document.getElementById('blood-sugar').value;
  const exercise = document.getElementById('exercise').value;
  const sleep = document.getElementById('sleep').value;

  if (!date || !height || !weight || !bloodSugar || !exercise || !sleep) {
    alert(i18n[lang].alert_fill);
    return;
  }
  records.push({
    date,
    height: +height,
    weight: +weight,
    bloodSugar: +bloodSugar,
    exercise,
    sleep: +sleep
  });
  localStorage.setItem('healthRecords', JSON.stringify(records));
  displayRecords();
  updateChart();
  analyzeRecords();
  resetRecordForm();
}

function resetRecordForm() {
  ['record-date', 'height', 'weight', 'blood-sugar', 'exercise', 'sleep']
    .forEach(id => document.getElementById(id).value = "");
}

function displayRecords() {
  const box = document.getElementById('record-box');
  box.innerHTML = `<h3>${i18n[lang].history_title}</h3>`;
  records.forEach(r => {
    const div = document.createElement('div');
    div.innerText = lang === 'zh'
      ? `${r.date} - 身高: ${r.height} cm, 体重: ${r.weight} kg, 血糖: ${r.bloodSugar} mmol/L, 运动: ${r.exercise}, 睡眠: ${r.sleep} 小时`
      : `${r.date} - Height: ${r.height} cm, Weight: ${r.weight} kg, Blood Sugar: ${r.bloodSugar} mmol/L, Exercise: ${r.exercise}, Sleep: ${r.sleep} hrs`;
    box.appendChild(div);
  });
}

function updateChart() {
  const ctx = document.getElementById('record-chart').getContext('2d');
  const sorted = records.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sorted.map(r => r.date);
  const wData = sorted.map(r => r.weight);
  const bsData = sorted.map(r => r.bloodSugar);

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = wData;
    chart.data.datasets[1].data = bsData;
    chart.data.datasets[0].label = lang === 'zh' ? '体重 (kg)' : 'Weight (kg)';
    chart.data.datasets[1].label = lang === 'zh' ? '血糖 (mmol/L)' : 'Blood Sugar (mmol/L)';
    chart.options.scales.x.title.text = lang === 'zh' ? '日期' : 'Date';
    chart.options.scales.y.title.text = lang === 'zh' ? '数值' : 'Value';
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: lang === 'zh' ? '体重 (kg)' : 'Weight (kg)',
            data: wData,
            borderColor: 'rgba(75,192,192,1)',
            fill: false
          },
          {
            label: lang === 'zh' ? '血糖 (mmol/L)' : 'Blood Sugar (mmol/L)',
            data: bsData,
            borderColor: 'rgba(255,99,132,1)',
            fill: false
          }
        ]
      },
      options: {
        scales: {
          x: { title: { display: true, text: lang === 'zh' ? '日期' : 'Date' } },
          y: { title: { display: true, text: lang === 'zh' ? '数值' : 'Value' } }
        }
      }
    });
  }
}

async function analyzeRecords() {
  let prompt = lang === 'zh'
    ? "根据以下健康记录数据趋势，给出饮食、运动、睡眠方面的健康建议：\n"
    : "Based on the following health records, give advice on diet, exercise, and sleep:\n";
  records.forEach(r => {
    prompt += lang === 'zh'
      ? `日期: ${r.date}, 身高: ${r.height} cm, 体重: ${r.weight} kg, 血糖: ${r.bloodSugar} mmol/L, 运动: ${r.exercise}, 睡眠: ${r.sleep} 小时\n`
      : `Date: ${r.date}, Height: ${r.height} cm, Weight: ${r.weight} kg, Blood Sugar: ${r.bloodSugar} mmol/L, Exercise: ${r.exercise}, Sleep: ${r.sleep} hrs\n`;
  });

  const advDiv = document.getElementById('health-advice');
  advDiv.innerText = i18n[lang].advice_loading;

  await streamFetch(
    NEW_API_URL,
    { model: NEW_MODEL_NAME, messages: [{ role: "user", content: prompt }], stream: true },
    chunk => {
      advDiv.innerText += chunk.replace(/[#*]/g, "");
      advDiv.scrollTop = advDiv.scrollHeight;
    }
  );
}

function loadRecordsFromStorage() {
  const stored = localStorage.getItem('healthRecords');
  if (stored) {
    try {
      records = JSON.parse(stored);
      displayRecords();
      updateChart();
    } catch (e) {
      console.error("解析存储数据错误", e);
    }
  }
}

// ========== 科普 ==========
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getScienceItem() {
  const prompt = lang === 'zh'
    ? '请生成5条较为简短但具深度的最新健康科普内容，要求内容真实、精炼，每条内容尽量涵盖不同角度，不要重复，且严格按照以下 JSON 数组格式输出（仅输出一个 JSON 数组，不要包含其他文字）：\n[{"title": "标题示例", "content": "科普内容示例。"}, {"title": "标题示例", "content": "科普内容示例。"}, {"title": "标题示例", "content": "科普内容示例。"}, {"title": "标题示例", "content": "科普内容示例。"}, {"title": "标题示例", "content": "科普内容示例。"}]'
    : 'Please generate 5 moderately brief yet insightful latest health science items. The content should be factual and concise, each item covering a different angle with minimal repetition. Strictly output a JSON array (output only one JSON array with no additional text) following the format below:\n[{"title": "Example Title", "content": "Science content example."}, {"title": "Example Title", "content": "Science content example."}, {"title": "Example Title", "content": "Science content example."}, {"title": "Example Title", "content": "Science content example."}, {"title": "Example Title", "content": "Science content example."}]';
  let txt = '';

  await streamFetch(
    NEW_API_URL,
    {
      model: NEW_MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.7
    },
    chunk => { txt += chunk.replace(/[#*]/g, ''); },
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NEW_API_KEY}`
    }
  );

  txt = txt.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    const data = JSON.parse(txt);
    if (Array.isArray(data)) {
      return data;
    } else {
      throw new Error("返回数据不是数组");
    }
  } catch (e) {
    throw new Error("返回数据格式错误：" + txt);
  }
}

async function getAndAppendScienceItem() {
  try {
    const items = await getScienceItem();
    const loadingEl = document.getElementById('science-loading');
    if (loadingEl) loadingEl.remove();
    items.forEach(item => {
      appendScienceItem(item);
    });
  } catch (e) {
    console.error(e);
  }
}

function appendScienceItem(item) {
  const box = document.getElementById('science-box');
  const container = document.createElement('div');
  container.className = 'science-item';
  const titleEl = document.createElement('div');
  titleEl.className = 'science-title';
  titleEl.innerText = item.title;
  const contentEl = document.createElement('div');
  contentEl.className = 'science-content';
  contentEl.innerText = item.content;
  titleEl.onclick = () => {
    container.classList.toggle("expanded");
  };
  container.appendChild(titleEl);
  container.appendChild(contentEl);
  box.appendChild(container);
}

async function continuousScience() {
  while (scienceStreamActive && scienceRequestCount < SCIENCE_REQUEST_LIMIT) {
    await delay(2000);
    await getAndAppendScienceItem();
    scienceRequestCount++;
  }
}

async function loadScience() {
  const box = document.getElementById('science-box');
  if (!box.innerHTML.trim()) {
    box.innerHTML = `<p id="science-loading">${i18n[lang].loading_science}</p>`;
  }
  scienceStreamActive = true;
  scienceRequestCount = 0;
  await getAndAppendScienceItem();
  continuousScience();
}

function refreshScience() {
  scienceStreamActive = false;
  scienceRequestCount = 0;
  const box = document.getElementById('science-box');
  box.innerHTML = `<p id="science-loading">${i18n[lang].loading_science}</p>`;
  setTimeout(() => {
    scienceStreamActive = true;
    getAndAppendScienceItem().then(() => continuousScience());
  }, 500);
}

// ========== 蓝牙血糖仪及建议 ==========
async function connectBloodGlucoseMonitor() {
  if (navigator.bluetooth && navigator.bluetooth.requestDevice) {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['00001808-0000-1000-8000-00805f9b34fb'] }]
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('00001808-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002a18-0000-1000-8000-00805f9b34fb');
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleGlucoseMeasurement);
      console.log('已连接到血糖仪');
    } catch (error) {
      console.error('蓝牙连接错误:', error);
      alert("蓝牙连接失败，请确保设备支持蓝牙且已开启相关权限！");
    }
  } else if (window.cordova && window.cordova.plugins && window.cordova.plugins.bluetoothle) {
    cordova.plugins.bluetoothle.initialize(success => {
      cordova.plugins.bluetoothle.discover(
        function(discoverResult){
          console.log('设备搜索结果：', discoverResult);
        }, 
        function(error){
          console.error("蓝牙搜索失败：", error);
        }
      );
    }, error => {
      console.error("蓝牙插件初始化失败：", error);
    });
  } else {
    console.error("蓝牙API不可用");
    alert("蓝牙不可用，请确认当前设备支持蓝牙功能并已配置相关插件。");
  }
}

function handleGlucoseMeasurement(event) {
  const value = event.target.value;
  const glucoseLevel = value.getUint16(1, true);
  console.log('测得血糖值:', glucoseLevel);
  const devAdvice = document.getElementById('device-advice');
  devAdvice.innerText = '血糖值: ' + glucoseLevel + ' mg/dL\n';
  analyzeBloodGlucose(glucoseLevel);
}

async function analyzeBloodGlucose(glucose) {
  const prompt = lang === 'zh'
    ? `我的血糖值为 ${glucose} mg/dL，请从糖尿病预测的角度给出健康建议。`
    : `My blood sugar level is ${glucose} mg/dL. Please provide health advice regarding diabetes prediction.`;

  const analysisDiv = document.getElementById('device-advice');
  analysisDiv.innerText += '\n正在分析血糖数据...';

  await streamFetch(
    NEW_API_URL,
    { model: NEW_MODEL_NAME, messages: [{ role: "user", content: prompt }], stream: true },
    chunk => {
      analysisDiv.innerText += chunk.replace(/[#*]/g, "");
    }
  );
}

async function searchDevice() {
  document.getElementById('device-advice').innerText = '';
  await connectBloodGlucoseMonitor();
}
