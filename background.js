/** 颜色工具（前后端共享） */
try { importScripts('shared/colors.js'); } catch (e) { /* no-op */ }

// 域名匹配：完整匹配或右端以 .rule 结尾，避免 notexample.com 命中 example.com
function matchesDomain(hostname, ruleDomain) {
    if (!hostname || !ruleDomain) return false;
    const h = String(hostname).toLowerCase();
    const r = String(ruleDomain).trim().toLowerCase().replace(/^\.+/, '');
    // 主域或任意多级子域匹配；要求点边界，避免 abcgoogle.com / google.com.hk 等误命中
    return h === r || h.endsWith('.' + r);
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;
    try {
        const url = new URL(tab.url);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
        const domain = url.hostname;

        // 获取保存的分组设置
        const result = await chrome.storage.sync.get(['groups']);
        const groups = result.groups || [];

        // 查找匹配的域名设置（后缀+边界匹配）
        const groupSetting = groups.find(g => matchesDomain(domain, g.domain));
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
    } catch (e) {
        console.warn('Auto-group failed:', e);
    }
});