# Diabetes
下面是根据你的文字稿整理成的 Markdown 格式的 README 示例，可直接复制到 GitHub 仓库中使用：

---

# 糖阈智控，芯筑健康

本项目作为挑战杯“人工智能+”创意赛“糖阈智控，芯筑健康”项目组提交作品，发布展示内容。

## 演示视频

演示视频请前往：**（请在此处添加视频链接）**

## 模型文件

模型托管在Hugging Face [Diabetes Model](https://huggingface.co/aiyawanan1112/Diabetes) 。

## 项目背景

本项目紧密响应《健康中国行动（2030 年）》和《人工智能 + 医疗健康三年行动方案》等政策要求，聚焦 “推广健康管理新技术” 与 “糖尿病防治行动” 等核心任务，设计并实现了一款面向糖尿病患者的智能监测管理系统。项目旨在利用 AI 大模型重构糖尿病管理的 “人 - 机 - 医” 关系，实现从 “被动治疗” 到 “主动预防”、从 “经验驱动” 到 “数据智能” 的双重跨越。

项目通过以下三大核心服务构建糖尿病立体化管理体系：

1. **智能 AI 问诊系统**  
   帮助患者评估健康状态并获取风险预警。
2. **动态血糖监测与记录平台**  
   自动同步多源数据，实时生成血糖趋势折线图，直观展示血糖波动规律，助力患者实现科学化、系统化健康管理。
3. **权威医疗内容矩阵**  
   精准推送权威医疗政策、防治指南及前沿研究成果，助力患者深度了解糖尿病病理知识、防控要点及生活管理技巧，从 “被动医疗” 转向 “主动健康”。

同时，本项目提供中英双语支持，满足国内外患者需求，助力糖尿病知识普惠与全球化健康管理。

本项目将推动糖尿病管理由滞后治疗向实时预防转变，为基层医疗数字化工具以及 “健康中国” 战略的落地提供建设性建议，助力千万糖友实现精准健康管理，并提升全民慢性病防控能力。

## 技术细节

### 数据集收集

数据集格式示例：

```json
{
  "instruction": "请根据以下信息预测患者是否患有糖尿病：",
  "input": "chol: 203.0, stab.glu: 82, hdl: 56.0, ratio: 3.5999999046, location: Buckingham, age: 46, gender: female, height: 62.0, weight: 121.0, frame: medium, bp.1s: 118.0, bp.1d: 59.0, bp.2s: nan, bp.2d: nan, waist: 29.0, hip: 38.0, time.ppn: 720.0",
  "output": "阴性"
}
```

### 模型基座

- **基座模型**：采用 *DeepSeek-R1-Distill-Qwen-7B* 进行微调
- **微调平台**：考虑到时间和模型大小，使用 6 张 4090 显卡并行训练

### 模型训练

采用 QLoRa 量化 + DDP 联动 6 卡并行训练。

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

#### 数据预处理：分词和标签复制

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

#### 启动训练

```bash
export CUDA_VISIBLE_DEVICES=0,1,2,3,4,5
python train.py
```

### 模型融合

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel  # 请确保已安装 peft 库

# 1. 加载原始预训练模型（基座模型）
base_model_path = '/root/DeepSeek-R1-Distill-Qwen-7B'
model = AutoModelForCausalLM.from_pretrained(base_model_path)

# 2. 通过 peft 加载微调 adapter
# adapter_path 指向包含 adapter_config.json 和 adapter_model.safetensors 的目录（而非单个权重文件）
adapter_path = '/root/DeepSeek-R1-Distill-Qwen-7B/checkpoint-19000'
model = PeftModel.from_pretrained(model, adapter_path)

# 3. 将 adapter 权重融合到模型中
model = model.merge_and_unload()

# 4. 加载分词器
tokenizer = AutoTokenizer.from_pretrained(base_model_path)

# 5. 保存融合后的完整模型
save_directory = '/root/DeepSeek-R1-Distill-Qwen-7B/Diabetes_model'
model.save_pretrained(save_directory)
tokenizer.save_pretrained(save_directory)

print("Adapter 权重已融合，完整模型保存完毕！")
```

### 封装

基于模型文件，本项目提供了两种封装方式：
- **H5+ 封装**
- **uni-app 封装**

详细封装方法请参见相关文件；演示视频请参见文章开头。

---

以上就是本项目的详细说明，如有疑问或建议欢迎提交 Issues。
