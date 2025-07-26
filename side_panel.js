let currentEditItem = null; // 用于跟踪当前正在编辑的项

// Chrome支持的标签组颜色映射
const CHROME_COLORS = {
    grey: '#DADCE0',
    blue: '#8AB4F8',
    red: '#F28B82',
    yellow: '#FCD174',
    green: '#81C995',
    pink: '#FDA5CB',
    purple: '#D3A0FF',
    cyan: '#80D8D0'
};

// 颜色名称映射
const COLOR_NAMES = {
    grey: '灰色',
    blue: '蓝色',
    red: '红色',
    yellow: '黄色',
    green: '绿色',
    pink: '粉色',
    purple: '紫色',
    cyan: '青色'
};

function normalizeColor(color) {
    // 如果是Chrome颜色名称，返回对应的十六进制颜色
    if (CHROME_COLORS[color]) {
        return CHROME_COLORS[color];
    }
    // 如果是十六进制颜色，直接返回
    if (typeof color === 'string' && color.startsWith('#')) {
        return color;
    }
    return CHROME_COLORS.grey; // 默认返回灰色
}

function getChromeColorName(hexColor) {
    // 根据十六进制颜色找到对应的Chrome颜色名称
    for (const [name, hex] of Object.entries(CHROME_COLORS)) {
        if (hex.toLowerCase() === hexColor.toLowerCase()) {
            return name;
        }
    }
    return 'grey'; // 默认返回灰色
}

document.addEventListener('DOMContentLoaded', () => {
    loadGroups();
    
    document.getElementById('addGroup').addEventListener('click', () => {
        const domain = document.getElementById('domain').value.trim();
        const groupName = document.getElementById('groupName').value.trim();
        const groupColor = document.getElementById('groupColor').value;
    
        if (!domain || !groupName) {
            alert('请填写域名和分组名称！');
            return;
        }

        createGroupItem({ domain, groupName, color: groupColor });
        
        // 清空输入框
        document.getElementById('domain').value = '';
        document.getElementById('groupName').value = '';
        document.getElementById('groupColor').value = 'grey'; // 重置为默认颜色
    });

    document.getElementById('updateGroup').addEventListener('click', updateGroup);
    document.getElementById('cancelUpdate').addEventListener('click', exitEditMode);

    document.getElementById('saveSettings').addEventListener('click', saveSettings);
});

function createGroupItem(group) {
    const groupList = document.getElementById('groupList');
    const groupItem = document.createElement('div');
    groupItem.className = 'group-item';

    const normalizedColor = normalizeColor(group.color);

    groupItem.dataset.domain = group.domain;
    groupItem.dataset.groupName = group.groupName;
    groupItem.dataset.color = normalizedColor;

    // 设置背景色和文字颜色
    groupItem.style.backgroundColor = normalizedColor;
    groupItem.style.color = getContrastColor(normalizedColor);

    groupItem.innerHTML = `
        <span class="group-name">${group.groupName}</span>
        <span class="domain">${group.domain}</span>
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
    const chromeColorName = getChromeColorName(item.dataset.color);
    document.getElementById('groupColor').value = chromeColorName;

    document.getElementById('addGroup').classList.add('hidden');
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
    document.getElementById('updateGroup').classList.add('hidden');
    document.getElementById('cancelUpdate').classList.add('hidden');
}

function updateGroup() {
    if (!currentEditItem) return;

    const domain = document.getElementById('domain').value.trim();
    const groupName = document.getElementById('groupName').value.trim();
    const color = document.getElementById('groupColor').value;

    if (!domain || !groupName) {
        alert('请填写域名和分组名称！');
        return;
    }

    // 将Chrome颜色名称转换为十六进制颜色用于显示
    const hexColor = normalizeColor(color);

    // 更新DOM元素的数据和外观
    currentEditItem.dataset.domain = domain;
    currentEditItem.dataset.groupName = groupName;
    currentEditItem.dataset.color = hexColor;

    currentEditItem.style.backgroundColor = hexColor;
    currentEditItem.style.color = getContrastColor(hexColor);

    currentEditItem.querySelector('.domain').textContent = domain;
    currentEditItem.querySelector('.group-name').textContent = groupName;

    exitEditMode();
}

function saveSettings() {
    const groups = [];
    document.querySelectorAll('.group-item').forEach(item => {
        // 将十六进制颜色转换为Chrome颜色名称进行存储
        const chromeColorName = getChromeColorName(item.dataset.color);
        groups.push({
            domain: item.dataset.domain,
            groupName: item.dataset.groupName,
            color: chromeColorName
        });
    });

    chrome.storage.sync.set({ groups }, () => {
        const message = document.getElementById('message');
        message.textContent = '保存成功！';
        message.style.display = 'block';
        setTimeout(() => {
            message.style.display = 'none';
        }, 2000);
    });
}

function loadGroups() {
    chrome.storage.sync.get(['groups'], (result) => {
        if (result.groups) {
            result.groups.forEach(group => createGroupItem(group));
        }
    });
}

// 根据背景色计算合适的文字颜色（黑色或白色）
function getContrastColor(hexColor) {
    if (!hexColor) hexColor = '#999999';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
}