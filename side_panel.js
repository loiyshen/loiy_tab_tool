let currentEditItem = null; // 用于跟踪当前正在编辑的项

/** 使用 shared/colors.js 提供的全局方法：isValidChromeColor, colorNameToHex */

document.addEventListener('DOMContentLoaded', () => {
    loadGroups();
    
    document.getElementById('addGroup').addEventListener('click', () => {
        const domainInput = document.getElementById('domain').value.trim();
        const groupName = document.getElementById('groupName').value.trim();
        const groupColor = document.getElementById('groupColor').value;
    
        if (!domainInput || !groupName) {
            alert('请填写域名和分组名称！');
            return;
        }

        const normDomain = domainInput.toLowerCase();
        const exists = Array.from(document.querySelectorAll('.group-item')).some(
            item => item.dataset.domain === normDomain
        );
        if (exists) {
            alert('该域名规则已存在，请编辑现有项。');
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

    const domainInput = document.getElementById('domain').value.trim();
    const groupName = document.getElementById('groupName').value.trim();
    const color = document.getElementById('groupColor').value;

    if (!domainInput || !groupName) {
        alert('请填写域名和分组名称！');
        return;
    }

    const domain = domainInput.toLowerCase();

    // 重复检测：允许当前编辑项保留相同域名，但禁止与其他项重复
    const conflict = Array.from(document.querySelectorAll('.group-item')).some(
        item => item !== currentEditItem && item.dataset.domain === domain
    );
    if (conflict) {
        alert('已存在相同域名的规则，请修改域名或编辑已有项。');
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

