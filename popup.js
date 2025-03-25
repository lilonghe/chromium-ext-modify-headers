document.addEventListener('DOMContentLoaded', function() {
  const enableSwitch = document.getElementById('enableSwitch');
  const rulesContainer = document.getElementById('rulesContainer');
  const addRuleBtn = document.getElementById('addRuleBtn');
  
  // 加载保存的配置
  loadConfig();
  
  // 切换开关状态
  enableSwitch.addEventListener('change', function() {
    chrome.storage.local.set({ enabled: this.checked });
    updateBackgroundRules();
  });
  
  // 添加新规则
  addRuleBtn.addEventListener('click', function() {
    addRuleElement({ 
      urlPattern: '', 
      enabled: true, 
      headers: [{ name: '', value: '' }] 
    });
  });
  
  // 加载配置
  function loadConfig() {
    chrome.storage.local.get(['rules', 'enabled'], function(data) {
      enableSwitch.checked = data.enabled !== undefined ? data.enabled : true;
      
      const rules = data.rules || [];
      rulesContainer.innerHTML = '';
      
      if (rules.length === 0) {
        // 如果没有规则，添加一个默认规则
        addRuleElement({ 
          urlPattern: '', 
          enabled: true, 
          headers: [{ name: '', value: '' }] 
        });
      } else {
        // 加载已有规则
        rules.forEach(rule => {
          addRuleElement(rule);
        });
      }
    });
  }

  function createIcon(type) {
    const icon = document.createElement('span');
    icon.className = 'icon icon-' + type;
    return icon;
  }
  
  // 添加规则元素
  function addRuleElement(rule) {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'rule-container';
    
    const ruleHeader = document.createElement('div');
    ruleHeader.className = 'rule-header';
    
    // URL 模式输入框
    const urlPatternInput = document.createElement('input');
    urlPatternInput.type = 'text';
    urlPatternInput.placeholder = 'url regexp, eg: .*\\.example\\.com/.*';
    urlPatternInput.value = rule.urlPattern;
    urlPatternInput.addEventListener('input', saveRules);
    
    // 规则启用开关
    const ruleEnabledLabel = document.createElement('label');
    ruleEnabledLabel.className = 'switch';
    
    const ruleEnabledInput = document.createElement('input');
    ruleEnabledInput.type = 'checkbox';
    ruleEnabledInput.checked = rule.enabled;
    ruleEnabledInput.addEventListener('change', function() {
      saveRules();
    });
    
    const ruleEnabledSlider = document.createElement('span');
    ruleEnabledSlider.className = 'slider';
    
    ruleEnabledLabel.appendChild(ruleEnabledInput);
    ruleEnabledLabel.appendChild(ruleEnabledSlider);
    
    // 删除规则按钮
    const deleteRuleBtn = document.createElement('div');
    deleteRuleBtn.className = 'btn btn-delete';
    deleteRuleBtn.appendChild(createIcon('close'));
    deleteRuleBtn.addEventListener('click', function() {
      ruleDiv.remove();
      saveRules();
    });
    
    ruleHeader.appendChild(urlPatternInput);
    ruleHeader.appendChild(ruleEnabledLabel);
    ruleHeader.appendChild(deleteRuleBtn);
    
    // 请求头列表
    const headerList = document.createElement('div');
    headerList.className = 'header-list';
    
    // 添加已有的请求头
    rule.headers.forEach(header => {
      addHeaderItem(headerList, header);
    });
    
    // 添加请求头按钮
    const addHeaderBtn = document.createElement('button');
    addHeaderBtn.className = 'btn btn-add-header';
    addHeaderBtn.appendChild(createIcon('plus'));
    addHeaderBtn.addEventListener('click', function() {
      addHeaderItem(headerList, { name: '', value: '' });
      saveRules();
    });
    
    ruleDiv.appendChild(ruleHeader);
    ruleDiv.appendChild(headerList);
    ruleDiv.appendChild(addHeaderBtn);
    
    rulesContainer.appendChild(ruleDiv);
  }
  
  // 添加请求头项
  function addHeaderItem(headerList, header) {
    const headerItem = document.createElement('div');
    headerItem.className = 'header-item';
    
    // 请求头名称输入框
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'header name';
    nameInput.value = header.name;
    nameInput.addEventListener('input', saveRules);
    
    // 请求头值输入框
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'header value';
    valueInput.value = header.value;
    valueInput.addEventListener('input', saveRules);
    
    // 删除请求头按钮
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'btn btn-delete';
    deleteBtn.appendChild(createIcon('close'));
    deleteBtn.addEventListener('click', function() {
      headerItem.remove();
      saveRules();
    });
    
    headerItem.appendChild(nameInput);
    headerItem.appendChild(valueInput);
    headerItem.appendChild(deleteBtn);
    
    headerList.appendChild(headerItem);
  }
  
  // 保存规则
  function saveRules() {
    const rules = [];
    
    // 获取所有规则容器
    const ruleContainers = rulesContainer.querySelectorAll('.rule-container');
    
    ruleContainers.forEach(ruleContainer => {
      const urlPattern = ruleContainer.querySelector('input[type="text"]').value;
      const enabled = ruleContainer.querySelector('input[type="checkbox"]').checked;
      
      const headers = [];
      const headerItems = ruleContainer.querySelectorAll('.header-item');
      
      headerItems.forEach(headerItem => {
        const inputs = headerItem.querySelectorAll('input');
        const name = inputs[0].value.trim();
        const value = inputs[1].value.trim();
        
        if (name && value) {
          headers.push({ name, value });
        }
      });
      
      if (urlPattern) {
        rules.push({
          urlPattern,
          enabled,
          headers
        });
      }
    });
    
    chrome.storage.local.set({ rules }, function() {
      updateBackgroundRules();
    });
  }
  
  // 更新后台规则
  function updateBackgroundRules() {
    chrome.runtime.sendMessage({ action: 'updateRules' });
  }
});