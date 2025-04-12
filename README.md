# Diabetes

---

# 糖阈智控，芯筑健康

本项目作为挑战杯“人工智能+”创意赛“糖阈智控，芯筑健康”项目组提交作品，发布展示内容。

## 演示视频

演示视频请前往：**（请在此处添加视频链接）**

## 模型文件

模型托管至Hugging Face仓库 [aiyawanan1112-Diabetes](https://huggingface.co/aiyawanan1112/Diabetes) 。

## 数据来源

为保证训练数据集的可靠性，在训练开始前，将从 Kaggle 获取的数据集与队内顾问（巴基斯坦籍医学专业留学生）讨论，确认数据的真实性。

## 项目背景

本项目紧密响应《健康中国行动（2030 年）》和《人工智能 + 医疗健康三年行动方案》等政策，聚焦“推广健康管理新技术”与“糖尿病防治行动”，设计并实现了一款面向糖尿病患者的智能监测管理系统。  
项目以 AI 大模型为引擎，重构“人 - 机 - 医”关系，实现从“被动治疗”到“主动预防”、从“经验驱动”到“数据智能”的双重跨越，提供中英双语支持，满足国内外患者需求。  

项目主要包括三大核心服务：
- **智能 AI 问诊系统**：帮助患者评估健康状态并获取风险预警；
- **动态血糖监测平台**：自动同步多源数据，实时生成血糖趋势图，直观展示血糖波动；
- **权威科普内容矩阵**：精准推送权威医疗政策、防治指南及前沿研究成果，帮助患者从“被动医疗”转向“主动健康”。

## 技术细节

### 数据集收集

数据集示例格式：
```json
{
  "instruction": "请根据以下信息预测患者是否患有糖尿病：",
  "input": "chol: 203.0, stab.glu: 82, hdl: 56.0, ratio: 3.5999999046, location: Buckingham, age: 46, gender: female, height: 62.0, weight: 121.0, frame: medium, bp.1s: 118.0, bp.1d: 59.0, bp.2s: nan, bp.2d: nan, waist: 29.0, hip: 38.0, time.ppn: 720.0",
  "output": "阴性"
}
```

### 模型微调与训练

- **模型基座**：采用 *DeepSeek-R1-Distill-Qwen-7B*
- **微调平台**：使用 6 张 4090 并行训练
- **训练策略**：QLoRa 量化 + DDP 联动多卡训练

#### 多数据集加载示例

```python
data_files = [
    "/root/DeepSeek-R1-Distill-Qwen-7B/1.jsonl",
    "/root/DeepSeek-R1-Distill-Qwen-7B/2.jsonl",
    "/root/DeepSeek-R1-Distill-Qwen-7B/3.jsonl",
]
datasets_list = [load_dataset('json', data_files=path, split="train") for path in data_files]
full_dataset = concatenate_datasets(datasets_list)

print("数据集示例:", full_dataset[0])
print("数据集字段:", full_dataset.column_names)
```

#### 数据预处理（分词及标签复制）

```python
def tokenize_function(examples):
    # 检查输入字段，优先选择 'input' 或 'text'，否则遍历可能的字段
    input_field = "input" if "input" in examples else "text"
    if input_field not in examples:
        possible_fields = ["instruction", "content", "prompt", "source"]
        for field in possible_fields:
            if field in examples:
                input_field = field
                break
        else:
            raise ValueError(f"无法找到输入文本字段。可用字段: {list(examples.keys())}")
    
    texts = examples[input_field]
    tokenized = tokenizer(texts, padding="max_length", truncation=True, max_length=512)
    return tokenized
```

#### 数据集切割

```python
# 划分训练集和验证集（验证集占 5%）
split_dataset = full_dataset.train_test_split(test_size=0.05, seed=42)
train_dataset = split_dataset["train"]
eval_dataset = split_dataset["test"]

print(f"训练集大小: {len(train_dataset)}")
print(f"验证集大小: {len(eval_dataset)}")
```

#### 多卡训练配置

```python
training_args = TrainingArguments(
    output_dir="./outputs",
    per_device_train_batch_size=2,
    per_device_eval_batch_size=2,
    num_train_epochs=3,
    learning_rate=2e-4,
    logging_steps=10,
    save_steps=50,
    save_total_limit=3,
    fp16=True,
    do_eval=True,
    eval_steps=50,
    gradient_accumulation_steps=4,
    warmup_steps=100,
    weight_decay=0.01,
    optim="adamw_torch",
    local_rank=local_rank,
    ddp_find_unused_parameters=False,
)

trainer = Trainer(
    model=peft_model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    compute_metrics=compute_metrics,
    data_collator=data_collator
)
```

#### 启动训练命令

```bash
export CUDA_VISIBLE_DEVICES=0,1,2,3,4,5
python train.py
```

#### 模型融合

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# 1. 加载原始预训练模型（基座模型）
base_model_path = '/root/DeepSeek-R1-Distill-Qwen-7B'
model = AutoModelForCausalLM.from_pretrained(base_model_path)

# 2. 通过 peft 加载微调 adapter
# adapter_path 指向包含 adapter_config.json 和 adapter_model.safetensors 的目录（而非单个权重文件）
adapter_path = '/root/DeepSeek-R1-Distill-Qwen-7B/checkpoint-19000'
model = PeftModel.from_pretrained(model, adapter_path)

# 3. 将 adapter 权重融合到模型中
model = model.merge_and_unload()

# 4. 加载分词器并保存融合后的完整模型
tokenizer = AutoTokenizer.from_pretrained(base_model_path)
save_directory = '/root/DeepSeek-R1-Distill-Qwen-7B/Diabetes_model'
model.save_pretrained(save_directory)
tokenizer.save_pretrained(save_directory)

print("Adapter 权重已融合，完整模型保存完毕！")
```

## 封装

基于模型文件，本项目提供两种封装方式（具体实现见相应文件）：
- **H5+ 封装**
- **uni-app 封装**

演示视频中有详细说明。

## 模型调用

为方便用户使用，本项目采用 API 传递方式，格式参考 OpenAI 接口。

### API 调用示例（OpenAI 格式）

```javascript
try {
  const response = await fetch('https://fast.bemore.lol/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR-API_KEY'
    },
    body: JSON.stringify({
      model: "deepseek-v3",
      messages: [{ role: "user", content: userText }],
      stream: true
    })
  });
} catch (error) {
  console.error(error);
}
```

## App 亮点

- **减少用户等待时间**  
  利用 API 流式传输，通过 `streamFetch` 实现实时返回数据，提升响应速度。
  
  ```javascript
  await streamFetch(
    'https://fast.bemore.lol/v1/chat/completions',
    {
      model: "deepseek-v3",
      messages: [{ role: "user", content: prompt }],
      stream: true
    },
    (chunk) => {
      const cleaned = chunk.replace(/[#*]/g, "");
      generatedText += cleaned;
      // 实时显示部分返回内容（调试可选）
      scienceBox.innerHTML = `<p>科普内容正在获取中……</p><pre>${generatedText}</pre>`;
    }
  );
  ```
  
- **科普内容卡片展示**  
  采用卡片堆叠格式展示科普内容，点击标题可平滑展开详细内容：
  
  ```javascript
  function renderScienceItems(items) {
    const scienceBox = document.getElementById('science-box');
    scienceBox.innerHTML = "";
    
    items.forEach(item => {
      const container = document.createElement('div');
      container.className = 'science-item';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'science-title';
      titleDiv.innerText = item.title;
      // 点击标题切换显示内容
      titleDiv.onclick = () => {
        if (contentDiv.style.display === "none") {
          contentDiv.style.display = "block";
        } else {
          contentDiv.style.display = "none";
        }
      };

      const contentDiv = document.createElement('div');
      contentDiv.className = 'science-content';
      contentDiv.innerText = item.content;
      contentDiv.style.display = "none";  // 默认隐藏
      
      container.appendChild(titleDiv);
      container.appendChild(contentDiv);
      scienceBox.appendChild(container);
    });
  }
  ```
  
- **健康数据趋势图与建议**  
  利用图表展示健康数据变化趋势，并给出对应的健康建议：
  
  ```javascript
  let chart; 
  function updateChart() {
    const ctx = document.getElementById('record-chart').getContext('2d');
    const sortedRecords = records.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sortedRecords.map(r => r.date);
    const weightData = sortedRecords.map(r => r.weight);
    const bloodSugarData = sortedRecords.map(r => r.bloodSugar);

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = weightData;
      chart.data.datasets[1].data = bloodSugarData;
      chart.update();
    } else {
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: '体重 (kg)',
              data: weightData,
              borderColor: 'rgba(75, 192, 192, 1)',
              fill: false
            },
            {
              label: '血糖 (mmol/L)',
              data: bloodSugarData,
              borderColor: 'rgba(255, 99, 132, 1)',
              fill: false
            }
          ]
        },
        options: {
          scales: {
            x: { display: true, title: { display: true, text: '日期' } },
            y: { display: true, title: { display: true, text: '数值' } }
          }
        }
      });
    }
  }
  ```

---

以上即为本项目的 README 主要内容与技术实现说明，如有疑问或建议欢迎提交 Issue。
