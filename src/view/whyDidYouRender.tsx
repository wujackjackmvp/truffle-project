import React, { useState, memo, ChangeEvent } from 'react';

/**
 * @title @welldone-software/why-did-you-render 教学案例
 * @description 这个组件展示了如何使用@welldone-software/why-did-you-render来检测和修复不必要的React组件重渲染
 */

// 示例1：展示不必要的重渲染
const UnoptimizedComponent = ({ title, data }: { title: string; data: { value: number } }) => {
  console.log('UnoptimizedComponent 渲染了!');
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">数值: {data.value}</p>
    </div>
  );
};

// 示例2：使用memo优化后的组件
const OptimizedComponent = memo(({ title, data }: { title: string; data: { value: number } }) => {
  console.log('OptimizedComponent 渲染了!');
  
  return (
    <div className="bg-green-50 p-6 rounded-lg shadow-md border border-green-200">
      <h3 className="text-lg font-semibold text-green-800 mb-2">{title}</h3>
      <p className="text-green-600">数值: {data.value}</p>
    </div>
  );
});

// 主教学组件
const WhyDidYouRenderExample = () => {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  
  // 创建一个稳定的data对象
  const data = { value: count };
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* 标题 */}
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8 mt-4">
        ��� @welldone-software/why-did-you-render 教学案例
      </h1>
      
      {/* 工具作用 */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-2xl font-semibold text-blue-600 mb-4">�� 工具作用</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700 pl-4">
          <li>检测React组件不必要的重渲染</li>
          <li>在控制台显示详细的重渲染原因</li>
          <li>对比前后props和state的变化</li>
          <li>帮助优化应用性能</li>
        </ul>
      </div>
      
      {/* 实时演示 */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-2xl font-semibold text-blue-600 mb-4">��� 实时演示</h2>
        
        {/* 控制面板 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-gray-700 font-medium">计数器：</label>
            <button 
              onClick={() => setCount(prev => prev + 1)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              增加: {count}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-700 font-medium">文本输入：</label>
            <input 
              type="text" 
              placeholder="输入文本" 
              value={text}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* 组件对比 */}
        <div>
          <h3 className="text-xl font-semibold text-green-600 mb-4">��� 组件渲染对比</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UnoptimizedComponent 
              title="1. 未优化组件" 
              data={data} 
            />
            <OptimizedComponent 
              title="2. 使用memo优化组件" 
              data={data} 
            />
          </div>
        </div>
      </div>
      
      {/* 控制台输出说明 */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-2xl font-semibold text-blue-600 mb-4">��� 控制台输出说明</h2>
        <pre className="bg-gray-800 text-green-400 p-5 rounded-lg overflow-x-auto font-mono text-sm">
{`[why-did-you-render] UnoptimizedComponent rendered because:
  • data changed (object reference changed)
  • title changed (new string)

{"prevProps": {
  "title": "1. 未优化组件",
  "data": {"value": 0}
}, "nextProps": {
  "title": "1. 未优化组件",
  "data": {"value": 1}
}}`}
        </pre>
      </div>
      
      {/* 最佳实践 */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold text-blue-600 mb-4">✅ 最佳实践</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700 pl-4">
          <li>使用memo包装纯组件</li>
          <li>保持props和state的引用稳定</li>
          <li>避免在渲染函数中创建新对象/数组</li>
          <li>使用useMemo和useCallback优化计算值和回调函数</li>
          <li>只在必要时更新state</li>
        </ul>
      </div>
      
      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <p className="text-yellow-700">
          ��� <strong>提示：</strong>请打开浏览器控制台，观察组件渲染时的详细日志信息，查看why-did-you-render的输出。
        </p>
      </div>
    </div>
  );
};

export default WhyDidYouRenderExample;
