// 初始化
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['rules', 'enabled'], function(data) {
    console.log('初始化数据:', data);
    
    if (data.enabled === undefined) {
      chrome.storage.local.set({ enabled: true });
      console.log('已设置默认启用状态为 true');
    }
    
    if (!data.rules || data.rules.length === 0) {
      const defaultRule = { 
        urlPattern: '.*\\.example\\.com/.*', 
        enabled: true, 
        headers: [{ name: 'X-Custom-Header', value: 'CustomValue' }] 
      };
      chrome.storage.local.set({ rules: [defaultRule] });
      console.log('已设置默认规则:', defaultRule);
    }
    
    updateDynamicRules();
  });
});

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateRules') {
    console.log('准备更新规则');
    updateDynamicRules();
    sendResponse({success: true});
  }
  
  // 返回 true 表示将异步发送响应
  return true;
});

// 更新动态规则
async function updateDynamicRules() {
  try {
    console.log('开始更新动态规则');
    
    // 获取存储的规则和启用状态
    const data = await chrome.storage.local.get(['rules', 'enabled']);
    console.log('获取到的规则数据:', data);
    
    const isEnabled = data.enabled !== undefined ? data.enabled : true;
    const rules = data.rules || [];
    
    console.log('插件启用状态:', isEnabled);
    console.log('规则数量:', rules.length);
    
    // 如果插件被禁用，移除所有规则
    if (!isEnabled) {
      console.log('插件已禁用，移除所有规则');
      await removeAllRules();
      return;
    }
    
    // 移除现有规则
    console.log('移除现有规则');
    await removeAllRules();
    
    // 添加新规则
    const dynamicRules = [];
    let ruleId = 1;
    
    for (const rule of rules) {
      console.log('处理规则:', rule);
      
      if (!rule.enabled || !rule.urlPattern || rule.headers.length === 0) {
        console.log('规则被跳过: 未启用或URL模式为空或没有请求头');
        continue;
      }
      
      try {
        // 测试正则表达式是否有效
        new RegExp(rule.urlPattern);
        console.log('正则表达式有效:', rule.urlPattern);
        
        // 为每个规则创建一个修改请求头的规则
        const requestHeaders = [];
        
        for (const header of rule.headers) {
          if (!header.name || !header.value) {
            console.log('请求头被跳过: 名称或值为空', header);
            continue;
          }

          console.log(header)
          
          requestHeaders.push({
            header: header.name,
            operation: 'set',
            value: header.value
          });
          console.log('添加请求头:', header.name, header.value);
        }
        
        if (requestHeaders.length > 0) {
          const newRule = {
            id: ruleId++,
            priority: 1,
            action: {
              type: 'modifyHeaders',
              requestHeaders: requestHeaders
            },
            condition: {
              regexFilter: rule.urlPattern,
              resourceTypes: [
                'main_frame',
                'sub_frame',
                'stylesheet',
                'script',
                'image',
                'font',
                'object',
                'xmlhttprequest',
                'ping',
                'csp_report',
                'media',
                'websocket',
                'other'
              ]
            }
          };
          
          dynamicRules.push(newRule);
        }
      } catch (e) {
        console.error('无效的正则表达式:', rule.urlPattern, e);
      }
    }
    
    if (dynamicRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [],
        addRules: dynamicRules
      });
      // 验证规则是否已添加
      const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
      console.log('当前活动规则:', currentRules);
    } else {
      console.log('没有有效规则可添加');
    }
  } catch (error) {
    console.error('更新规则时出错:', error);
  }
}

// 移除所有规则
async function removeAllRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

    const ruleIds = existingRules.map(rule => rule.id);

    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
      console.log('已移除所有规则');
    } else {
      console.log('没有规则需要移除');
    }
  } catch (error) {
    console.error('移除规则时出错:', error);
  }
}