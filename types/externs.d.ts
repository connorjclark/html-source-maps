declare global {
  module HtmlMaps {
    export type Template = Node[];

    export type Node = LiteralNode|PlaceholderNode|LoopNode;

    interface LiteralNode {
      type: 'literal';
      value: string;
    }

    interface PlaceholderNode {
      type: 'placeholder';
      value: string[];
    }

    interface LoopNode {
      type: 'loop';
      value: {
        bindingName: string;
        iterablePath: string[];
        nodes: Node[];
      };
    }
  }
}

// empty export to keep file a module
export {}
