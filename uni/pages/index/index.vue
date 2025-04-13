<template>
  <view class="app-container">
    <!-- 自定义头部（左右贴边 & 顶部贴边） -->
    <view class="header">
      <button class="btn-hamburger" @click="toggleSideMenu">☰</button>
      <view class="header-info">
        <text class="header-title">{{ L.header_title }}</text>
        <text class="header-subtitle">{{ L.header_subtitle }}</text>
      </view>
      <button class="btn-lang" @click="toggleLanguage">{{ langBtnText }}</button>
    </view>

    <!-- 侧边菜单 -->
    <view class="sidebar" :class="{ show: sidebarVisible }">
      <button class="btn-close" @click="toggleSideMenu">×</button>
      <view class="menu">
        <view class="menu-item" @click="switchSection('chat')">{{ L.menu_chat }}</view>
        <view class="menu-item" @click="switchSection('record')">{{ L.menu_record }}</view>
        <view class="menu-item" @click="switchSection('device')">{{ L.menu_device }}</view>
        <view class="menu-item" @click="switchSection('science')">{{ L.menu_science }}</view>
        <view class="menu-item" @click="switchSection('about')">{{ L.menu_about }}</view>
      </view>
    </view>

    <!-- 主体区域 -->
    <view class="main">
      <!-- 对话 -->
      <view v-if="currentSection==='chat'" class="section chat-section">
        <view class="chat-box">
          <scroll-view scroll-y class="chat-messages" :scroll-top="scrollTop">
            <view v-for="(msg, idx) in messages" :key="idx" class="message" :class="msg.role">
              <text>{{ msg.content }}</text>
            </view>
          </scroll-view>
          <view class="chat-input">
            <input type="text" v-model="userInput" :placeholder="L.chat_placeholder" @confirm="sendMessage" />
            <button @click="sendMessage">{{ L.send_btn }}</button>
          </view>
        </view>
      </view>

      <!-- 档案部分 -->
      <view v-else-if="currentSection==='record'" class="section record-section">
        <view class="record-form">
          <view class="form-item">
            <text>{{ L.record_date }}</text>
            <picker mode="date" :value="recordDate" start="2000-01-01" end="2100-12-31" @change="onRecordDateChange">
              <view class="picker">{{ recordDate ? recordDate : L.record_date }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text>{{ L.height }}</text>
            <input type="number" v-model="height" placeholder="cm" />
          </view>
          <view class="form-item">
            <text>{{ L.weight }}</text>
            <input type="number" v-model="weight" placeholder="kg" />
          </view>
          <view class="form-item">
            <text>{{ L.blood_sugar }}</text>
            <input type="number" v-model="bloodSugar" step="0.1" placeholder="mmol/L" />
          </view>
          <view class="form-item">
            <text>{{ L.exercise }}</text>
            <input type="text" v-model="exercise" :placeholder="L.exercise_placeholder" />
          </view>
          <view class="form-item">
            <text>{{ L.sleep }}</text>
            <input type="number" v-model="sleep" :placeholder="L.sleep_placeholder" />
          </view>
          <view class="btn-group">
            <button class="form-btn" @click="submitRecord">{{ L.submit_record }}</button>
            <button class="form-btn" type="button" @click="resetRecordForm">{{ L.reset }}</button>
          </view>
        </view>
        <view class="records">
          <view class="record-card">
            <text class="record-title">{{ L.trend_chart }}</text>
            <!-- 为 canvas 添加 touchstart 事件 -->
            <canvas canvas-id="healthChart" id="healthChart" class="chart" @touchstart="handleChartTouch"></canvas>
          </view>
          <view v-if="recordAdvice" class="record-advice">
            <text>{{ recordAdvice }}</text>
          </view>
          <view class="history">
            <text class="history-title">{{ L.history }}</text>
            <scroll-view scroll-y class="history-list">
              <view v-for="(rec, idx) in records" :key="idx" class="history-item">
                <text>
                  {{ rec.date }} | {{ L.height }}: {{ rec.height }} cm, 
                  {{ L.weight }}: {{ rec.weight }} kg, 
                  {{ L.blood_sugar }}: {{ rec.bloodSugar }} mmol/L, 
                  {{ L.exercise }}: {{ rec.exercise }}, 
                  {{ L.sleep }}: {{ rec.sleep }} hrs
                </text>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>

      <!-- 设备 -->
      <view v-else-if="currentSection==='device'" class="section device-section">
        <view class="device-controls">
          <button @click="searchDevices" class="device-btn">{{ L.search_device }}</button>
          <view v-if="isSearching" class="loading">{{ L.searching }}</view>
          <view v-for="(device, idx) in deviceList" :key="idx" class="device-item" @click="connectDevice(device)">
            <text>{{ device.name || L.unknown_device }}</text>
            <text class="device-id">{{ device.deviceId }}</text>
          </view>
        </view>
        <view v-if="connectedDevice" class="device-data">
          <text>{{ L.current_device }}: {{ connectedDevice.name }}</text>
          <view class="data-value">{{ glucoseValue ? glucoseValue + ' mmol/L' : L.no_data }}</view>
          <view class="advice" v-if="glucoseAdvice">{{ glucoseAdvice }}</view>
        </view>
      </view>

      <!-- 科普 -->
      <view v-else-if="currentSection==='science'" class="section science-section">
        <view class="science-header">
          <text class="science-title">{{ L.science_title }}</text>
          <!-- 刷新按钮放到最右边 -->
          <button class="refresh-btn" @click="refreshScience">{{ L.refresh }}</button>
        </view>
        <scroll-view scroll-y class="science-items">
          <view v-for="(item, idx) in scienceItems" :key="idx" class="science-item" @click="toggleScienceItem(idx)">
            <text class="science-item-title">{{ item.title }}</text>
            <transition name="slide">
              <view v-if="item.expanded" class="science-item-detail">
                <text>{{ item.content }}</text>
              </view>
            </transition>
          </view>
        </scroll-view>
      </view>

      <!-- 关于 -->
      <view v-else-if="currentSection==='about'" class="section about-section">
        <view class="about-content">
          <text class="about-title">{{ L.about_title }}</text>
          <text class="about-text">{{ L.about_content }}</text>
          <text class="version">{{ L.version }}: 1.0.0</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)
export default {
  data() {
    return {
      lang: 'zh',
      labels: {
        zh: {
          header_title: '健康助手',
          header_subtitle: '您的私人健康管理专家',
          menu_chat: '对话',
          menu_record: '档案',
          menu_device: '设备',
          menu_science: '科普',
          menu_about: '关于',
          chat_placeholder: '输入您的健康问题...',
          send_btn: '发送',
          record_date: '选择日期',
          height: '身高',
          weight: '体重',
          blood_sugar: '血糖',
          exercise: '运动情况',
          sleep: '睡眠时长',
          exercise_placeholder: '如：慢跑、健身等',
          sleep_placeholder: '单位：小时',
          submit_record: '提交记录',
          reset: '重置',
          get_advice: '获取建议',
          trend_chart: '血糖趋势图',
          search_device: '搜索血糖仪',
          searching: '搜索中...',
          unknown_device: '未知设备',
          current_device: '当前设备',
          no_data: '暂无数据',
          science_title: '健康科普',
          refresh: '刷新',
          about_title: '健康助手应用',
          about_content: '这是一款基于人工智能的健康管理应用，可以帮助您管理健康数据、获取专业建议。',
          version: '版本',
          missing_info: '信息不全',
          no_records: '暂无记录',
          no_advice: '暂无建议',
          no_content: '暂无内容',
          failed: '失败',
          please_open_bluetooth: '请打开蓝牙',
          connection_success: '设备连接成功',
          connection_failed: '连接设备失败',
          network_error: '网络错误',
          history: '历史记录'
        },
        en: {
          header_title: 'Health Assistant',
          header_subtitle: 'Your personal health management expert',
          menu_chat: 'Chat',
          menu_record: 'Records',
          menu_device: 'Device',
          menu_science: 'Knowledge',
          menu_about: 'About',
          chat_placeholder: 'Enter your health question...',
          send_btn: 'Send',
          record_date: 'Select Date',
          height: 'Height',
          weight: 'Weight',
          blood_sugar: 'Blood Sugar',
          exercise: 'Exercise',
          sleep: 'Sleep Duration',
          exercise_placeholder: 'e.g. jogging, gym etc.',
          sleep_placeholder: 'in hours',
          submit_record: 'Submit Record',
          reset: 'Reset',
          get_advice: 'Get Advice',
          trend_chart: 'Glucose Trend Chart',
          search_device: 'Search Glucose Meter',
          searching: 'Searching...',
          unknown_device: 'Unknown Device',
          current_device: 'Current Device',
          no_data: 'No Data',
          science_title: 'Health Knowledge',
          refresh: 'Refresh',
          about_title: 'Health Assistant App',
          about_content: 'This is an AI-powered health management application that helps you manage health data and get professional advice.',
          version: 'Version',
          missing_info: 'incomplete information',
          no_records: 'No records',
          no_advice: 'No advice',
          no_content: 'No content',
          failed: 'Failed',
          please_open_bluetooth: 'Please enable Bluetooth',
          connection_success: 'Device connected successfully',
          connection_failed: 'Failed to connect device',
          network_error: 'Network error',
          history: 'History'
        }
      },
      langBtnText: 'EN',
      sidebarVisible: false,
      currentSection: 'chat',
      messages: [],
      userInput: '',
      scrollTop: 0,
      recordDate: '',
      height: '',
      weight: '',
      bloodSugar: '',
      exercise: '',
      sleep: '',
      records: [],
      recordAdvice: '',
      healthData: {
        labels: [],
        datasets: [
          {
            label: 'Blood Sugar',
            data: [],
            borderColor: '#4CAF50',
            tension: 0.1
          }
        ]
      },
      // 用于保存趋势图上各数据点的坐标及对应记录信息
      chartPoints: [],
      isSearching: false,
      deviceList: [],
      connectedDevice: null,
      glucoseValue: null,
      glucoseAdvice: '',
      scienceItems: []
    }
  },
  computed: {
    L() {
      return this.labels[this.lang]
    }
  },
  methods: {
    toggleSideMenu() {
      this.sidebarVisible = !this.sidebarVisible;
    },
    switchSection(sec) {
      this.currentSection = sec;
      this.sidebarVisible = false;
      if (sec === 'record') {
        this.$nextTick(() => {
          this.updateChart();
        });
      }
    },
    toggleLanguage() {
      this.lang = (this.lang === 'zh') ? 'en' : 'zh';
      this.langBtnText = (this.lang === 'zh') ? 'EN' : '中';
    },
    // 使用 uni.request 实现 API 请求（非流式返回）
    uniRequestStream(url, payload, onChunk, headers = {}) {
      return new Promise((resolve, reject) => {
        uni.request({
          url: url,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            ...headers
          },
          data: payload,
          success: (res) => {
            let content = (res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message.content) || '';
            onChunk(content);
            resolve(content);
          },
          fail: (err) => {
            reject(err);
          }
        });
      });
    },
    // 对话调用：先显示“思考中，请稍后”，请求返回后替换为实际内容
    async callChatAPI(queryContent) {
      const lastIndex = this.messages.length - 1;
      const NEW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
      const NEW_MODEL_NAME = 'deepseek-ai/DeepSeek-V3';
      const API_KEY = 'sk-vymzgykxvebjxkmkuhmgbwdmyhgpfhxjnumfmnhxvtipflit';
      // 显示提示文字
      this.messages[lastIndex].content = '思考中，请稍后';
      try {
        await this.uniRequestStream(
          NEW_API_URL,
          {
            model: NEW_MODEL_NAME,
            messages: [
              { role: 'system', content: '你是一个专业的健康顾问，提供准确、有用且详细的健康建议。' },
              { role: 'user', content: queryContent }
            ],
            temperature: 0.7,
            stream: false
          },
          chunk => {
            this.messages[lastIndex].content = chunk;
          },
          { 'Authorization': `Bearer ${API_KEY}` }
        );
      } catch (e) {
        this.messages[lastIndex].content = '错误：' + e.message;
      }
    },
    // 用户发送消息
    sendMessage() {
      if (!this.userInput.trim()) return;
      this.messages.push({ role: 'user', content: this.userInput });
      // 预置回复消息
      this.messages.push({ role: 'assistant', content: '' });
      const currentInput = this.userInput;
      this.userInput = '';
      this.callChatAPI(currentInput);
    },
    // 档案建议（非流式方式）
    getRecordAdvice() {
      if (this.records.length === 0) {
        uni.showToast({
          title: this.L.no_records,
          icon: 'none'
        });
        return;
      }
      this.recordAdvice = "";
      const NEW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
      const NEW_MODEL_NAME = 'deepseek-ai/DeepSeek-V3';
      const API_KEY = 'sk-vymzgykxvebjxkmkuhmgbwdmyhgpfhxjnumfmnhxvtipflit';
      const latest = this.records[this.records.length - 1];
      const payload = {
        model: NEW_MODEL_NAME,
        messages: [
          { role: 'system', content: '你是一个专业的健康顾问，基于用户的健康记录和趋势，提供简短且有针对性的健康建议。' },
          { role: 'user', content: `我的血糖值是${latest.bloodSugar} mmol/L，记录日期为${latest.date}。请根据我的记录和趋势给出建议。` }
        ],
        temperature: 0.7,
        stream: false
      };
      uni.request({
        url: NEW_API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        data: payload,
        success: (res) => {
          if (res.data && res.data.choices && res.data.choices.length > 0) {
            this.recordAdvice = res.data.choices[0].message.content;
          } else {
            this.recordAdvice = this.L.no_advice;
          }
        },
        fail: (err) => {
          this.recordAdvice = '错误：' + err.message;
        }
      });
    },
    // 更新图表，并保存各数据点坐标用于点击判断
    updateChart() {
      this.healthData.labels = this.records.map(item => item.date);
      this.healthData.datasets[0].data = this.records.map(item => item.bloodSugar);
      const systemInfo = uni.getSystemInfoSync();
      const canvasWidth = systemInfo.windowWidth - 60;
      const canvasHeight = 200;
      const padding = 30;
      const dataCount = this.healthData.labels.length;
      const ctx = uni.createCanvasContext('healthChart', this);
      this.chartPoints = [];
      if (!ctx || dataCount < 2) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.draw();
        return;
      }
      const xStep = (canvasWidth - padding * 2) / (dataCount - 1);
      const yMax = Math.max(...this.healthData.datasets[0].data) * 1.2;
      const yStep = (canvasHeight - padding * 2) / yMax;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      // 绘制坐标轴
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvasHeight - padding);
      ctx.lineTo(canvasWidth - padding, canvasHeight - padding);
      ctx.setStrokeStyle('#999');
      ctx.stroke();
      // 绘制趋势线并记录数据点坐标
      ctx.beginPath();
      this.healthData.datasets[0].data.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = canvasHeight - padding - value * yStep;
        this.chartPoints.push({ x, y, record: this.records[index] });
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.setStrokeStyle('#4CAF50');
      ctx.stroke();
      // 绘制数据点
      this.healthData.datasets[0].data.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = canvasHeight - padding - value * yStep;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.setFillStyle('#4CAF50');
        ctx.fill();
      });
      // 绘制横坐标文字
      ctx.setFontSize(10);
      ctx.setTextAlign('center');
      this.healthData.labels.forEach((label, index) => {
        const x = padding + index * xStep;
        ctx.fillText(label, x, canvasHeight - padding + 15);
      });
      ctx.draw();
    },
    // 处理趋势图点击：获取 canvas 位置并换算相对坐标，判断是否点击在数据点附近
    handleChartTouch(e) {
      const touch = e.touches[0];
      uni.createSelectorQuery().in(this).select('#healthChart').boundingClientRect(rect => {
        if (!rect) return;
        const { left, top } = rect;
        // 计算触摸点相对于 canvas 内部的坐标
        const relativeX = touch.pageX - left;
        const relativeY = touch.pageY - top;
        const threshold = 10; // 判断误差范围
        for (let point of this.chartPoints) {
          const dx = relativeX - point.x;
          const dy = relativeY - point.y;
          if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
            const rec = point.record;
            uni.showToast({
              title: `日期：${rec.date}\n血糖：${rec.bloodSugar} mmol/L\n身高：${rec.height} cm\n体重：${rec.weight} kg\n睡眠：${rec.sleep} hr`,
              icon: 'none',
              duration: 3000
            });
            break;
          }
        }
      }).exec();
    },
    // 科普部分：获取科普内容
    pollScience() {
      for (let i = 0; i < 5; i++) {
        uni.request({
          url: 'https://api.siliconflow.cn/v1/chat/completions',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-drchipruirzifwonqwyazjxrvqailjdrahqgslmnlgcayzyk'
          },
          data: {
            model: 'deepseek-ai/DeepSeek-V3',
            messages: [
              { role: 'system', content: '你是一个健康科普专家，请从“生命科学”、“个人卫生”、“疾病预防”、“健康习惯”、“医学前沿”等主题随机选取提供准确的健康科普知识，尽量避免重复。请以JSON格式返回结果，格式示例: {"title": "标题", "content": "详细内容"}' },
              { role: 'user', content: '请提供5条健康科普知识，不要重复。' }
            ],
            temperature: 0.7,
            max_tokens: 150,
            stream: false
          },
          success: (res) => {
            let content = (res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message.content) || '';
            content = content.replace(/```json/g, '').replace(/```/g, '').trim().replace(/[“”]/g, '"');
            try {
              let parsed = JSON.parse(content);
              this.scienceItems.push({
                title: parsed.title || this.L.no_content,
                content: parsed.content || '',
                expanded: false
              });
            } catch (e) {
              let dotIndex = content.indexOf('。');
              let title = dotIndex > 0 ? content.substring(0, dotIndex + 1) : content.substring(0, 20);
              this.scienceItems.push({
                title: title,
                content: content,
                expanded: false
              });
            }
          },
          fail: (err) => {
            console.error('科普 API 调用错误:', err);
            this.scienceItems.push({
              title: this.L.network_error,
              content: '',
              expanded: false
            });
          }
        });
      }
    },
    // 刷新科普：先清空再获取
    refreshScience() {
      this.scienceItems = [];
      this.pollScience();
    },
    // 切换科普项展开/收起
    toggleScienceItem(index) {
      this.$set(this.scienceItems[index], 'expanded', !this.scienceItems[index].expanded);
    },
    onRecordDateChange(e) {
      this.recordDate = e.detail.value;
    },
    submitRecord() {
      if (!this.recordDate || !this.height || !this.weight || !this.bloodSugar) {
        uni.showToast({
          title: `${this.L.submit_record} ${this.L.missing_info}`,
          icon: 'none'
        });
        return;
      }
      const record = {
        date: this.recordDate,
        height: parseFloat(this.height),
        weight: parseFloat(this.weight),
        bloodSugar: parseFloat(this.bloodSugar),
        exercise: this.exercise,
        sleep: this.sleep ? parseFloat(this.sleep) : 0
      };
      this.records.push(record);
      uni.setStorage({
        key: 'records',
        data: this.records
      });
      this.updateChart();
      this.getRecordAdvice();
      this.resetRecordForm();
      uni.pageScrollTo({
        selector: '.history',
        duration: 300
      });
    },
    resetRecordForm() {
      this.height = '';
      this.weight = '';
      this.bloodSugar = '';
      this.exercise = '';
      this.sleep = '';
    },
    searchDevices() {
      this.isSearching = true;
      this.deviceList = [];
      uni.openBluetoothAdapter({
        success: () => {
          uni.startBluetoothDevicesDiscovery({
            success: () => {
              uni.onBluetoothDeviceFound((res) => {
                const devices = res.devices.filter(device =>
                  device.name &&
                  (device.name.toLowerCase().includes('glucose') || device.name.toLowerCase().includes('meter'))
                );
                this.deviceList = [...this.deviceList, ...devices];
              });
            },
            fail: (err) => {
              console.error('搜索设备失败:', err);
              this.isSearching = false;
              uni.showToast({
                title: `${this.L.search_device} ${this.L.failed}`,
                icon: 'none'
              });
            }
          });
          setTimeout(() => {
            uni.stopBluetoothDevicesDiscovery();
            this.isSearching = false;
          }, 10000);
        },
        fail: (err) => {
          console.error('初始化蓝牙适配器失败:', err);
          this.isSearching = false;
          uni.showToast({
            title: this.L.please_open_bluetooth,
            icon: 'none'
          });
        }
      });
    },
    connectDevice(device) {
      uni.createBLEConnection({
        deviceId: device.deviceId,
        success: () => {
          this.connectedDevice = device;
          uni.showToast({
            title: this.L.connection_success,
            icon: 'success'
          });
          setTimeout(() => {
            this.glucoseValue = (Math.random() * 3 + 4).toFixed(1);
            this.getGlucoseAdvice(this.glucoseValue);
          }, 1000);
        },
        fail: (err) => {
          console.error('连接设备失败:', err);
          uni.showToast({
            title: this.L.connection_failed,
            icon: 'none'
          });
        }
      });
    },
    getGlucoseAdvice(value) {
      this.glucoseAdvice = "";
      const NEW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
      const NEW_MODEL_NAME = 'deepseek-ai/DeepSeek-V3';
      const DEVICE_API_KEY = 'sk-drchipruirzifwonqwyazjxrvqailjdrahqgslmnlgcayzyk';
      // 显示提示文字
      this.glucoseAdvice = '思考中，请稍后';
      this.uniRequestStream(
        NEW_API_URL,
        {
          model: NEW_MODEL_NAME,
          messages: [
            { role: 'system', content: '你是一个专业的健康顾问，提供关于血糖值的简短建议。' },
            { role: 'user', content: `我的血糖值是${value} mmol/L，请给出简短的健康建议。` }
          ],
          temperature: 0.7,
          stream: false
        },
        chunk => {
          this.glucoseAdvice = chunk;
        },
        { 'Authorization': `Bearer ${DEVICE_API_KEY}` }
      ).catch(e => {
        this.glucoseAdvice = '错误：' + e.message;
      });
    }
  },
  created() {
    this.pollScience();
    uni.getStorage({
      key: 'records',
      success: res => {
        if (res.data && Array.isArray(res.data)) {
          this.records = res.data;
          this.$nextTick(() => {
            this.updateChart();
          });
        }
      }
    });
  },
  onReady() {
    if (this.currentSection === 'record') {
      this.updateChart();
    }
  }
}
</script>

<style scoped>
/* 基本布局 */
.app-container { 
  display: flex; 
  flex-direction: column; 
  width: 100%; 
  height: 100%; 
  background-color: #eef2f5;
}

/* 头部 */
.header { 
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  height: 120rpx; 
  background-color: #4CAF50; 
  display: flex; 
  align-items: center; 
  z-index: 100;
}
.btn-hamburger { 
  font-size: 44rpx; 
  color: #fff; 
  background: none; 
  border: none; 
  margin-left: 20rpx;  
  margin-right: 20rpx; 
}
.header-info { 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
}
.header-title { 
  font-size: 30rpx; 
  color: #fff; 
  font-weight: bold; 
}
.header-subtitle { 
  font-size: 24rpx; 
  color: #fff; 
}
.btn-lang { 
  margin-left: auto; 
  font-size: 32rpx; 
  color: #fff; 
  background: none; 
  border: none; 
  margin-right: 20rpx; 
}

/* 侧边菜单 */
.sidebar { 
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 240rpx; 
  height: 100%; 
  background: #4CAF50; 
  padding-top: 100rpx; 
  transform: translateX(-100%); 
  transition: transform 0.3s; 
  z-index: 90; 
  color: #fff; 
}
.sidebar.show { 
  transform: translateX(0); 
}
.btn-close { 
  position: absolute; 
  top: 20rpx; 
  right: 20rpx; 
  font-size: 36rpx; 
  color: #fff; 
  background: none; 
  border: none; 
}
.menu { 
  padding: 20rpx 0; 
}
.menu-item { 
  padding: 20rpx 30rpx; 
  font-size: 30rpx; 
}
.menu-item:hover, .menu-item:active { 
  background-color: rgba(255, 255, 255, 0.2); 
}

/* 主体区域 */
.main { 
  flex: 1; 
  margin-top: 80rpx; 
  padding: 30rpx; 
  overflow-y: auto; 
}

/* 对话 */
.chat-section { 
  height: 100%; 
}
.chat-box { 
  display: flex; 
  flex-direction: column; 
  height: calc(100vh - 140rpx); 
  background-color: #fff; 
  border-radius: 20rpx; 
  overflow: hidden; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
}
.chat-messages { 
  flex: 1; 
  padding: 20rpx; 
  overflow-y: auto; 
}
.message { 
  margin-bottom: 20rpx; 
  padding: 16rpx 20rpx; 
  border-radius: 16rpx; 
  max-width: 80%; 
  word-wrap: break-word; 
}
.message.user { 
  background-color: #e1f5e1; 
  align-self: flex-end; 
  margin-left: auto; 
}
.message.assistant { 
  background-color: #f0f0f0; 
  align-self: flex-start; 
}
.chat-input { 
  display: flex; 
  padding: 20rpx; 
  border-top: 2rpx solid #eee; 
}
.chat-input input { 
  flex: 1; 
  height: 80rpx; 
  padding: 0 20rpx; 
  border: 2rpx solid #ddd; 
  border-radius: 40rpx; 
  margin-right: 20rpx; 
}
.chat-input button { 
  width: 160rpx; 
  height: 80rpx; 
  border-radius: 40rpx; 
  background-color: #4CAF50; 
  color: #fff; 
  font-size: 28rpx; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

/* 档案 */
.record-form { 
  background-color: #fff; 
  border-radius: 20rpx; 
  padding: 20rpx; 
  margin-bottom: 30rpx; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
}
.form-item { 
  margin-bottom: 20rpx; 
  display: flex; 
  flex-direction: column; 
}
.form-item text { 
  font-size: 28rpx; 
  margin-bottom: 10rpx; 
  color: #333; 
}
.form-item input, .picker { 
  height: 60rpx; 
  padding: 0 20rpx; 
  border: 2rpx solid #ddd; 
  border-radius: 30rpx; 
  font-size: 28rpx; 
  display: flex; 
  align-items: center; 
}
.btn-group { 
  display: flex; 
  gap: 20rpx; 
}
.form-btn, .advice-btn { 
  background-color: #4CAF50; 
  color: #fff; 
  border-radius: 40rpx; 
  height: 80rpx; 
  font-size: 28rpx; 
  margin-top: 20rpx; 
  width: 100%; 
}
.records { 
  padding: 20rpx; 
}
.record-card { 
  background-color: #fff; 
  border-radius: 20rpx; 
  padding: 30rpx; 
  margin-bottom: 30rpx; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
}
.record-title { 
  font-size: 32rpx; 
  font-weight: bold; 
  margin-bottom: 20rpx; 
  color: #333; 
}
.chart { 
  width: 100%; 
  height: 400rpx; 
}
.record-advice { 
  background-color: #fff; 
  border-radius: 20rpx; 
  padding: 20rpx; 
  font-size: 28rpx; 
  color: #666; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
}
.history { 
  margin-top: 30rpx; 
  background-color: #fff; 
  border-radius: 20rpx; 
  padding: 20rpx; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
}
.history-title { 
  font-size: 32rpx; 
  font-weight: bold; 
  margin-bottom: 20rpx; 
  color: #333; 
  text-align: center; 
}
.history-list { 
  max-height: 200rpx; 
}
.history-item { 
  padding: 10rpx 0; 
  border-bottom: 1rpx solid #eee; 
  font-size: 26rpx; 
  color: #555; 
}

/* 设备 */
.device-controls { 
  background-color: #fff; 
  border-radius: 20rpx; 
  padding: 30rpx; 
  margin-bottom: 30rpx; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
}
.device-btn { 
  background-color: #4CAF50; 
  color: #fff; 
  border-radius: 40rpx; 
  height: 80rpx; 
  font-size: 28rpx; 
  margin-bottom: 20rpx; 
}
.loading { 
  text-align: center; 
  color: #666; 
  margin: 20rpx 0; 
}
.device-item { 
  padding: 20rpx; 
  border-bottom: 2rpx solid #eee; 
  display: flex; 
  flex-direction: column; 
}
.device-id { 
  font-size: 24rpx; 
  color: #999; 
}
.device-data { 
  background-color: #fff; 
  border-radius: 20rpx; 
  padding: 30rpx; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
}
.data-value { 
  font-size: 60rpx; 
  font-weight: bold; 
  color: #4CAF50; 
  text-align: center; 
  margin: 30rpx 0; 
}
.advice { 
  color: #666; 
  font-size: 28rpx; 
  line-height: 1.6; 
}

/* 科普 */
.science-section { 
  background-color: #fff; 
  border-radius: 20rpx; 
  padding: 30rpx; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
  margin-top: 20rpx; 
  overflow-y: auto; 
  max-height: calc(100vh - 200rpx); 
}
.science-header { 
  display: flex; 
  justify-content: space-between; /* 科普标题与刷新按钮左右分布 */
  align-items: center; 
  margin-bottom: 20rpx; 
}
.science-title { 
  font-size: 32rpx; 
  font-weight: bold; 
  color: #4CAF50; 
}
.refresh-btn { 
  background-color: #4CAF50; 
  color: #fff; 
  border-radius: 40rpx; 
  height: 60rpx; 
  width: 120rpx; 
  font-size: 28rpx; 
}
.science-items { 
  display: flex; 
  flex-direction: column; 
  gap: 20rpx; 
}
.science-item { 
  font-size: 28rpx; 
  line-height: 1.6; 
  color: #333; 
  cursor: pointer; 
}
.science-item-title { 
  font-weight: bold; 
  font-size: 30rpx; 
}
.science-item-detail { 
  margin-top: 10rpx; 
  font-size: 26rpx; 
  color: #666; 
}

/* 关于 */
.about-content { 
  background-color: #fff; 
  border-radius: 20rpx; 
  padding: 30rpx; 
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); 
  text-align: center; 
}
.about-title { 
  font-size: 36rpx; 
  font-weight: bold; 
  margin-bottom: 30rpx; 
  color: #4CAF50; 
}
.about-text { 
  font-size: 28rpx; 
  line-height: 1.6; 
  color: #666; 
  margin-bottom: 30rpx; 
}
.version { 
  font-size: 24rpx; 
  color: #999; 
}

/* 平滑展开动画 */
.slide-enter-active, .slide-leave-active {
  transition: all 0.3s;
}
.slide-enter, .slide-leave-to {
  opacity: 0;
  height: 0;
  overflow: hidden;
}
</style>
