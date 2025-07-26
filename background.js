// 支持的标签组颜色
const CHROME_COLORS = {
    grey: [218, 220, 224],
    blue: [138, 180, 248],
    red: [242, 139, 130],
    yellow: [252, 212, 120],
    green: [129, 201, 149],
    pink: [253, 163, 203],
    purple: [211, 160, 255],
    cyan: [128, 216, 208],
};

// 将十六进制颜色转换为RGB数组
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

// 计算两种RGB颜色之间的欧氏距离
function colorDistance(rgb1, rgb2) {
    const [r1, g1, b1] = rgb1;
    const [r2, g2, b2] = rgb2;
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}

// 找到最接近的Chrome预设颜色
function findClosestChromeColor(hexColor) {
    const targetRgb = hexToRgb(hexColor);
    let closestColor = 'grey';
    let minDistance = Infinity;

    for (const color in CHROME_COLORS) {
        const distance = colorDistance(targetRgb, CHROME_COLORS[color]);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }
    return closestColor;
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const url = new URL(tab.url);
        const domain = url.hostname;

        // 获取保存的分组设置
        const result = await chrome.storage.sync.get(['groups']);
        const groups = result.groups || [];

        // 查找匹配的域名设置
        const groupSetting = groups.find(g => domain.includes(g.domain));
        if (!groupSetting) return;

        // 获取当前窗口的所有标签组
        const tabGroups = await chrome.tabGroups.query({ windowId: tab.windowId });
        
        // 查找是否已存在相同名称的标签组
        let existingGroup = tabGroups.find(g => g.title === groupSetting.groupName);

        if (existingGroup) {
            // 如果组已存在，将标签添加到该组
            await chrome.tabs.group({
                groupId: existingGroup.id,
                tabIds: tabId
            });
        } else {
            // 如果组不存在，创建新组
            const groupId = await chrome.tabs.group({
                tabIds: tabId
            });
            
            // 设置组的标题和颜色
            await chrome.tabGroups.update(groupId, {
                title: groupSetting.groupName,
                color: findClosestChromeColor(groupSetting.color)
            });
        }
    }
});