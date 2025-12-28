// 添加一些运行时的定义 自定义JSX运行时类型声明，解决React 19与TypeScript的兼容性问题
declare module 'react/jsx-runtime' {
  export namespace JSX {
    interface IntrinsicElements {
      [key: string]: any;
    }
    interface Element extends React.ReactElement<any, any> {}
    interface ElementType extends React.ElementType<any> {}
    interface ElementAttributesProperty {
      props: any;
    }
    interface ElementChildrenAttribute {
      children: any;
    }
  }
}
