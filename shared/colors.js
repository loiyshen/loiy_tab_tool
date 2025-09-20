// 统一的 Chrome 预设分组颜色（名称 -> HEX）
(function (global) {
  const CHROME_COLOR_HEX = {
    grey: '#DADCE0',
    blue: '#8AB4F8',
    red: '#F28B82',
    yellow: '#FCD174',
    green: '#81C995',
    pink: '#FDA5CB',
    purple: '#D3A0FF',
    cyan: '#80D8D0'
  };

  function isValidChromeColor(name) {
    return Object.prototype.hasOwnProperty.call(CHROME_COLOR_HEX, String(name));
  }

  function colorNameToHex(name) {
    return CHROME_COLOR_HEX[String(name)] || CHROME_COLOR_HEX.grey;
  }

  // 导出到全局（兼容 side panel 与 service worker）
  global.CHROME_COLOR_HEX = CHROME_COLOR_HEX;
  global.isValidChromeColor = isValidChromeColor;
  global.colorNameToHex = colorNameToHex;
})(typeof self !== 'undefined' ? self : this);