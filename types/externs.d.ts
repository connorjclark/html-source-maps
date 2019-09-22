declare global {
  module HtmlMaps {
    export type Template = TemplateNode;

    export type Node = FragmentNode|LiteralNode|TemplateNode|BlockNode|PlaceholderNode|LoopNode;

    interface BaseNode {
      source: {
        line: number;
        column: number;
      };
    }

    interface FragmentNode extends BaseNode {
      type: 'fragment';
      value: Node[];
    }
    
    interface LiteralNode extends BaseNode {
      type: 'literal';
      value: string;
    }

    interface TemplateNode extends BaseNode {
      type: 'template';
      value: {
        name: string;
        nodes: Node[];
      };
    }

    interface BlockNode extends BaseNode {
      type: 'block';
      value: {
        name: string;
        nodes: Node[];
      };
    }

    interface PlaceholderNode extends BaseNode {
      type: 'placeholder';
      value: string[];
    }

    interface LoopNode extends BaseNode {
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
      source: {line: number; column: number;}
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
      callStack: Frame[],
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;

      // TODO: should these exist?
      length: number;
    }

    interface Frame {
      // file: string;
      line: number;
      column: number;
    }
  }
}

// empty export to keep file a module
export {}
