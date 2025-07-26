let currentEditItem = null; // 用于跟踪当前正在编辑的项

function normalizeColor(color) {
    if (typeof color === 'string' && color.startsWith('#')) {
        return color;
    }
    return '#999999'; // 如果颜色格式不正确，则默认为灰色
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
    document.getElementById('groupColor').value = item.dataset.color;

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
    document.getElementById('groupColor').value = '#999999';

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

    // 更新DOM元素的数据和外观
    currentEditItem.dataset.domain = domain;
    currentEditItem.dataset.groupName = groupName;
    currentEditItem.dataset.color = color;

    currentEditItem.style.backgroundColor = color;
    currentEditItem.style.color = getContrastColor(color);

    currentEditItem.querySelector('.domain').textContent = domain;
    currentEditItem.querySelector('.group-name').textContent = groupName;

    exitEditMode();
}

function saveSettings() {
    const groups = [];
    document.querySelectorAll('.group-item').forEach(item => {
        groups.push({
            domain: item.dataset.domain,
            groupName: item.dataset.groupName,
            color: item.dataset.color
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