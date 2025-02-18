# NVIDIA API Chat

在本地网页中调用NVIDIA API，支持流式传输、在线markdown解析。

基于原生Javascript实现，避免了繁琐的配置过程。

## 使用说明

1. 安装依赖

本地安装好node( https://nodejs.org/zh-cn/download )，并确认npm加入环境变量

2. 获取NVIDIA API Key

在.env文件中填入NVIDIA API Key(从 https://www.nvidia.com/en-us/ai 获取)

普通邮箱可以获得1000credits，1个credit可以对话1次，按模型单次回答最大8192tokens计，总计近千万token可以使用

企业邮箱可以获得5000credits，校园邮箱亦可。

3. 在Windows CMD进入package.json所在目录，执行

```bash
npm install
npm start
```

3. 打开浏览器，访问http://localhost:3001

直接开始对话，支持流式传输，在线解析markdown

## 注意

默认使用deepseek r1模型，如果需要使用其他模型，请根据nvidia api文档在server.js中修改。

NVIDIA API调用对网络环境要求非常严格，可能时不时会遇到无法建立连接的情况，尝试更换网络环境、新建API、等待一段时间的方式解决此类问题。

