let currentEditItem = null; // 用于跟踪当前正在编辑的项

/** 使用 shared/colors.js 提供的全局方法：isValidChromeColor, colorNameToHex */

/* Toast API */
function showToast({ type = 'info', text = '', timeout, sticky = false }) {
    const host = document.getElementById('toastHost');
    if (!host) { console.error('Toast host missing:', text); return; }
    const div = document.createElement('div');
    div.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'warning' ? '!' : type === 'error' ? '×' : 'ℹ';
    div.setAttribute('role', (type === 'error' || type === 'warning') ? 'alert' : 'status');
    div.setAttribute('aria-live', (type === 'error' || type === 'warning') ? 'assertive' : 'polite');
    div.innerHTML = `<span class="icon">${icon}</span><span class="msg">${text}</span>`;
    const close = document.createElement('button');
    close.className = 'close-btn';
    close.type = 'button';
    close.textContent = '关闭';
    close.addEventListener('click', () => div.remove());
    div.appendChild(close);
    host.appendChild(div);
    const t = timeout != null ? timeout : ((type === 'success' || type === 'info') ? 3000 : 6000);
    if (!sticky) setTimeout(() => div.remove(), t);
}

/* 切换导入/导出表单显示 */
function setMode(mode) {
    // mode: 'edit' | 'io'
    const panel = document.getElementById('importExportPanel');
    const form = document.getElementById('groupSettings');
    const toggleBtn = document.getElementById('toggleImportExportBtn');
    if (!panel || !form || !toggleBtn) return;
    if (mode === 'io') {
        panel.classList.remove('hidden');
        form.classList.add('hidden');
        toggleBtn.textContent = '切换到添加/编辑模式';
        toggleBtn.dataset.mode = 'io';
    } else {
        panel.classList.add('hidden');
        form.classList.remove('hidden');
        toggleBtn.textContent = '切换到导入/导出模式';
        toggleBtn.dataset.mode = 'edit';
    }
}
function toggleMode() {
    const btn = document.getElementById('toggleImportExportBtn');
    const next = btn && btn.dataset.mode === 'io' ? 'edit' : 'io';
    setMode(next);
}

/* 导出当前规则为 JSON 文件 */
async function exportGroups() {
    const result = await new Promise(res => chrome.storage.sync.get(['groups'], res));
    const groups = result.groups || [];
    const blob = new Blob([JSON.stringify({ groups }, null, 2)], { type: 'application/json;charset=utf-8' });
    const ts = new Date();
    const pad = n => String(n).padStart(2, '0');
    const filename = `LoiyTabTool_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
    showToast({ type: 'success', text: '导出成功' });
}

/* JSON 解析与校验、规范化、合并（覆盖） */
function parseAndMergeGroups(jsonObj) {
    const out = { added: 0, overwritten: 0, fixed: 0, total: 0, groups: [] };
    if (!jsonObj || typeof jsonObj !== 'object' || !Array.isArray(jsonObj.groups)) {
        throw new Error('JSON 结构无效：需包含 "groups" 数组');
    }
    const input = jsonObj.groups;
    out.total = input.length;
    if (input.length > 200) {
        throw new Error('导入条目超过 200 条限制');
    }
    const byDomain = new Map();
    document.querySelectorAll('.group-item').forEach(item => {
        byDomain.set(item.dataset.domain, {
            domain: item.dataset.domain,
            groupName: item.dataset.groupName,
            color: item.dataset.colorName || 'grey'
        });
    });
    for (const g of input) {
        if (!g || typeof g !== 'object') { out.fixed++; continue; }
        let { domain, groupName, color } = g;
        if (typeof domain !== 'string' || typeof groupName !== 'string' || typeof color !== 'string') { out.fixed++; continue; }
        domain = domain.trim().toLowerCase().replace(/^\.+/, '');
        groupName = groupName.trim();
        if (!domain || !groupName) { out.fixed++; continue; }
        if (domain.length > 64) { out.fixed++; continue; }
        if (groupName.length > 24) { out.fixed++; continue; }
        if (!isValidChromeColor(color)) { color = 'grey'; out.fixed++; }
        if (byDomain.has(domain)) {
            out.overwritten++;
        } else {
            out.added++;
        }
        byDomain.set(domain, { domain, groupName, color });
    }
    out.groups = Array.from(byDomain.values());
    return out;
}

/* 从文件 input 导入 */
async function importFromFile(inputEl) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) { showToast({ type: 'warning', text: '请选择要导入的 JSON 文件' }); return; }
    if (file.size > 1024 * 1024) { showToast({ type: 'error', text: '文件超过 1MB 限制' }); return; }
    try {
        const text = await file.text();
        const obj = JSON.parse(text);
        const res = parseAndMergeGroups(obj);
        await chrome.storage.sync.set({ groups: res.groups });
        // 刷新 UI
        document.getElementById('groupList').innerHTML = '';
        res.groups.forEach(createGroupItem);
        showToast({ type: 'success', text: `新增 ${res.added} / 覆盖 ${res.overwritten} / 修正 ${res.fixed}` });
    } catch (e) {
        console.error(e);
        showToast({ type: 'error', text: e.message || '导入失败' });
    } finally {
        inputEl.value = '';
    }
}



/* 从预设模板导入（dist/example/basic.json） */
async function importFromTemplate() {
    try {
        const resp = await fetch(chrome.runtime.getURL('example/basic.json'), { cache: 'no-cache' });
        if (!resp.ok) throw new Error('模板资源不可用');
        const obj = await resp.json();
        const res = parseAndMergeGroups(obj);
        await chrome.storage.sync.set({ groups: res.groups });
        document.getElementById('groupList').innerHTML = '';
        res.groups.forEach(createGroupItem);
        showToast({ type: 'success', text: `新增 ${res.added} / 覆盖 ${res.overwritten} / 修正 ${res.fixed}` });
    } catch (e) {
        console.error(e);
        showToast({ type: 'error', text: '无法读取模板文件，请尝试重新安装扩展或联系维护者' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadGroups();

    /* 初始模式为添加/编辑模式 */
    setMode('edit');

    /* 导入/导出：事件绑定 */
    const toggleBtn = document.getElementById('toggleImportExportBtn');
    const importFileInput = document.getElementById('importFile');

    const importTplBtn = document.getElementById('importFromTemplateBtn');
    const doImportBtn = document.getElementById('doImportBtn');
    const doExportBtn = document.getElementById('doExportBtn');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleMode);
    if (importFileInput) importFileInput.addEventListener('change', () => {
        const nameEl = document.getElementById('selectedFileName');
        if (nameEl) nameEl.textContent = importFileInput.files && importFileInput.files[0] ? importFileInput.files[0].name : '未选择文件';
    });
    if (doExportBtn) doExportBtn.addEventListener('click', exportGroups);
    if (doImportBtn) doImportBtn.addEventListener('click', async () => {
        if (importFileInput && importFileInput.files && importFileInput.files.length) {
            await importFromFile(importFileInput);
        } else {
            showToast({ type: 'warning', text: '请选择要导入的 JSON 文件' });
        }
    });
    if (importTplBtn) importTplBtn.addEventListener('click', importFromTemplate);

    /* 获取域名按钮绑定 */
    const getCurDomainBtn = document.getElementById('getCurDomain');
    if (getCurDomainBtn) {
        getCurDomainBtn.addEventListener('click', fillDomainFromActiveTab);
    }
    
    document.getElementById('addGroup').addEventListener('click', () => {
        const domainInput = document.getElementById('domain').value.trim();
        const groupName = document.getElementById('groupName').value.trim();
        const groupColor = document.getElementById('groupColor').value;
    
        if (!domainInput || !groupName) {
            showToast({ type: 'error', text: '请填写域名和分组名称！' });
            return;
        }
        if (domainInput.length > 64) {
            showToast({ type: 'error', text: '域名长度超过 64 字符' });
            return;
        }
        if (groupName.length > 24) {
            showToast({ type: 'error', text: '分组名称长度超过 24 字符' });
            return;
        }

        const normDomain = domainInput.toLowerCase();
        const exists = Array.from(document.querySelectorAll('.group-item')).some(
            item => item.dataset.domain === normDomain
        );
        if (exists) {
            showToast({ type: 'warning', text: '该域名规则已存在，请编辑现有项。' });
            return;
        }

        createGroupItem({ domain: normDomain, groupName, color: groupColor });
        persistGroups();
        
        // 清空输入框
        document.getElementById('domain').value = '';
        document.getElementById('groupName').value = '';
        document.getElementById('groupColor').value = 'grey'; // 重置为默认颜色
    });

    document.getElementById('updateGroup').addEventListener('click', updateGroup);
    document.getElementById('cancelUpdate').addEventListener('click', exitEditMode);


});

function createGroupItem(group) {
    const groupList = document.getElementById('groupList');
    const groupItem = document.createElement('div');
    groupItem.className = 'group-item';

    const normalizedColor = colorNameToHex(group.color);
    const domainLower = (group.domain || '').trim().toLowerCase();

    groupItem.dataset.domain = domainLower;
    groupItem.dataset.groupName = group.groupName;
    groupItem.dataset.colorName = group.color;

    // 设置背景色
    groupItem.style.backgroundColor = normalizedColor;

    groupItem.innerHTML = `
        <div class="item-left">
            <span class="group-name">${group.groupName}</span>
            <span class="domain">${domainLower}</span>
        </div>
        <div class="item-buttons">
            <button class="edit-btn">编辑</button>
            <button class="delete-btn">删除</button>
        </div>
    `;

    groupItem.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        enterEditMode(groupItem);
    });

    groupItem.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        groupList.removeChild(groupItem);
        persistGroups();
    });

    groupList.appendChild(groupItem);
}

function enterEditMode(item) {
    if (currentEditItem) {
        // 如果已在编辑另一项，先取消
        currentEditItem.classList.remove('editing');
    }

    currentEditItem = item;
    item.classList.add('editing');

    document.getElementById('domain').value = item.dataset.domain;
    document.getElementById('groupName').value = item.dataset.groupName;
    
    // 将十六进制颜色转换为Chrome颜色名称
    const chromeColorName = item.dataset.colorName || 'grey';
    document.getElementById('groupColor').value = chromeColorName;

    document.getElementById('addGroup').classList.add('hidden');
    document.getElementById('getCurDomain').classList.add('hidden');
    document.getElementById('updateGroup').classList.remove('hidden');
    document.getElementById('cancelUpdate').classList.remove('hidden');
}

function exitEditMode() {
    if (currentEditItem) {
        currentEditItem.classList.remove('editing');
        currentEditItem = null;
    }

    document.getElementById('domain').value = '';
    document.getElementById('groupName').value = '';
    document.getElementById('groupColor').value = 'grey';

    document.getElementById('addGroup').classList.remove('hidden');
    document.getElementById('getCurDomain').classList.remove('hidden');
    document.getElementById('updateGroup').classList.add('hidden');
    document.getElementById('cancelUpdate').classList.add('hidden');
}

function updateGroup() {
    if (!currentEditItem) return;

    const domainInput = document.getElementById('domain').value.trim();
    const groupName = document.getElementById('groupName').value.trim();
    const color = document.getElementById('groupColor').value;

    if (!domainInput || !groupName) {
        showToast({ type: 'error', text: '请填写域名和分组名称！' });
        return;
    }
    if (domainInput.length > 64) {
        showToast({ type: 'error', text: '域名长度超过 64 字符' });
        return;
    }
    if (groupName.length > 24) {
        showToast({ type: 'error', text: '分组名称长度超过 24 字符' });
        return;
    }

    const domain = domainInput.toLowerCase();

    // 重复检测：允许当前编辑项保留相同域名，但禁止与其他项重复
    const conflict = Array.from(document.querySelectorAll('.group-item')).some(
        item => item !== currentEditItem && item.dataset.domain === domain
    );
    if (conflict) {
        showToast({ type: 'warning', text: '已存在相同域名的规则，请修改域名或编辑已有项。' });
        return;
    }

    // 将Chrome颜色名称转换为十六进制颜色用于显示
    const hexColor = colorNameToHex(color);

    // 更新DOM元素的数据和外观
    currentEditItem.dataset.domain = domain;
    currentEditItem.dataset.groupName = groupName;
    currentEditItem.dataset.colorName = color;

    currentEditItem.style.backgroundColor = hexColor;

    currentEditItem.querySelector('.domain').textContent = domain;
    currentEditItem.querySelector('.group-name').textContent = groupName;

    persistGroups();
    exitEditMode();
}

function persistGroups() {
    const groups = [];
    document.querySelectorAll('.group-item').forEach(item => {
        groups.push({
            domain: item.dataset.domain,
            groupName: item.dataset.groupName,
            color: item.dataset.colorName || 'grey'
        });
    });
    chrome.storage.sync.set({ groups });
}

function loadGroups() {
    chrome.storage.sync.get(['groups'], (result) => {
        if (result.groups) {
            result.groups.forEach(group => createGroupItem(group));
        }
    });
}

/* 工具：查询当前活动标签页 */
function getActiveTab() {
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const err = chrome.runtime && chrome.runtime.lastError;
                if (err) {
                    reject(new Error(err.message || '无法访问标签页信息'));
                    return;
                }
                resolve(tabs && tabs[0]);
            });
        } catch (e) {
            reject(e);
        }
    });
}

/* 提取可注册顶级域名（eTLD+1） */
function extractRegistrableDomain(hostname) {
    if (!hostname || typeof hostname !== 'string') return '';
    let host = hostname.trim().toLowerCase();
    if (host.endsWith('.')) host = host.slice(0, -1);
    if (host.startsWith('[') && host.endsWith(']')) return ''; // IPv6
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return ''; // IPv4
    host = host.replace(/^www\d*\./, '');

    const multiPartTlds = new Set([
        'co.uk','ac.uk','gov.uk','org.uk','ltd.uk','plc.uk',
        'com.cn','net.cn','org.cn','gov.cn','edu.cn',
        'com.au','net.au','org.au',
        'com.hk','net.hk','org.hk',
        'com.tw','net.tw','org.tw',
        'com.sg','net.sg','org.sg',
        'co.jp','ne.jp','or.jp',
        'com.br','net.br','org.br'
    ]);

    const parts = host.split('.').filter(Boolean);
    if (parts.length <= 1) return host;

    const last2 = parts.slice(-2).join('.');
    const last3 = parts.length >= 3 ? parts.slice(-3).join('.') : '';

    // 如果是多级后缀，取 eTLD+1 = 最后三段中的前一段+后两段
    if (last3 && multiPartTlds.has(parts.slice(-2).join('.'))) {
        return parts.slice(-3).join('.');
    }
    // 常规：取最后两段
    return last2;
}

/* 主函数：从当前标签页获取域名并填充输入框 */
async function fillDomainFromActiveTab() {
    try {
        const tab = await getActiveTab();
        if (!tab || !tab.url) {
            showToast({ type: 'warning', text: '无法获取当前标签页 URL' });
            return;
        }
        let hostname = '';
        try {
            const u = new URL(tab.url);
            hostname = u.hostname || '';
        } catch {
            // 非法或特殊 url（如 chrome://），直接提示
            showToast({ type: 'warning', text: '当前页面地址无法解析为域名' });
            return;
        }
        const domain = extractRegistrableDomain(hostname);
        if (!domain) {
            showToast({ type: 'warning', text: '未识别到有效域名' });
            return;
        }
        const domainInput = document.getElementById('domain');
        if (domainInput) {
            domainInput.value = domain;
            showToast({ type: 'success', text: `已获取域名：${domain}` });
        }
    } catch (e) {
        console.error(e);
        showToast({ type: 'error', text: e.message || '获取域名失败，请检查权限设置' });
    }
}