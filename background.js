// Chrome支持的标签组颜色
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

// 验证颜色是否为有效的Chrome颜色
function isValidChromeColor(color) {
    return CHROME_COLORS.hasOwnProperty(color);
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
                color: isValidChromeColor(groupSetting.color) ? groupSetting.color : 'grey'
            });
        }
    }
});