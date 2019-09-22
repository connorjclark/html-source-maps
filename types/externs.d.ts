declare global {
  module HtmlMaps {
    export type Template = FragmentNode;

    export type Node = FragmentNode|LiteralNode|TemplateNode|BlockNode|PlaceholderNode|LoopNode;

    interface FragmentNode {
      type: 'fragment';
      value: Node[];
    }
    
    interface LiteralNode {
      type: 'literal';
      value: string;
    }

    interface TemplateNode {
      type: 'template';
      value: {
        templatePath: string;
        template: Template;
      };
    }

    interface BlockNode {
      type: 'block';
      value: {
        name: string;
        nodes: Node[];
      };
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

    interface TextRenderSegment {
      type: 'raw';
      text: string;
    }
    interface BlockRenderSegment {
      type: 'block';
      containsDefault: boolean;
      segments: RenderSegment[];
    }
    type RenderSegment = TextRenderSegment | BlockRenderSegment;

    // HTML Source Map
    interface HtmlMap {
      ranges: Range[];
      frames: Frame[];
    }

    interface Range {
      callStack: number[],
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }

    interface Frame {
      
    }
  }
}

// empty export to keep file a module
export {}
