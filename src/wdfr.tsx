import React from 'react';
// 三斜线指令:它的作用类似于 import，但不会引入运行时依赖，只影响类型检查。
/// <reference types="@welldone-software/why-did-you-render"/>
// 仅在开发模式下启用 why-did-you-render
console.log('process.env.NODE_ENV', process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    onlyLogs: true,
    titleColor: 'green',
    diffNameColor: 'darkturquoise',
    trackHooks: true,                 // 跟踪 Hooks（如 useState, useCallback 等）
    trackAllPureComponents: true,     // 跟踪所有 PureComponent 和 React.memo 组件
    // logOwnerStacks: true,             // 显示是谁创建了当前组件（调用栈）
  });
}