declare module 'react-cytoscapejs' {
  import { Component } from 'react';
  import Cytoscape from 'cytoscape';

  interface CytoscapeComponentProps {
    elements: any[];
    style?: React.CSSProperties;
    layout?: any;
    stylesheet?: any;
    cy?: (cy: any) => void;
    [key: string]: any;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
}
