// drawflow_component.js



const NODE_TEMPLATES = [
{
    id: 'basic_start', // Only outputs
    icon: '∷', // Changed icon to match the new image
    inputs: 0,
    outputs: 1,
    defaults: { // CSS Custom Properties
        '--node-header-bg': '#4f46e5', // indigo-600 (Purple)
        '--node-body-bg': '#eef2ff',   // indigo-50
        '--node-conn-color': '#4f46e5', // Used for selected border etc.
    },
    render({ title, content, tooltip }) {
        return `<div class="node-header" title="${tooltip || ''}"> <span class="node-icon">${this.icon}</span> <strong>${title}</strong> </div> <div class="node-body"> <p>${content || 'Start point'}</p> </div>`;
    }
},
{
    id: 'basic_intermediate', // Inputs and Outputs
    icon: '📄',
    inputs: 1,
    outputs: 1,
    defaults: {
        '--node-header-bg': '#16a34a', // green-600
        '--node-body-bg': '#f0fdf4',   // green-50
        '--node-conn-color': '#16a34a',
    },
    render({ title, content, tooltip }) {
        return `<div class="node-header" title="${tooltip || ''}"> <span class="node-icon">${this.icon}</span> <strong>${title}</strong> </div> <div class="node-body"> <p>${content || 'Processing step'}</p> </div>`;
    }
},
{
    id: 'basic_end', // Only inputs
    icon: '🛑',
    inputs: 1,
    outputs: 0,
    defaults: {
        '--node-header-bg': '#db2777', // pink-600
        '--node-body-bg': '#fdf2f8',   // pink-50
        '--node-conn-color': '#db2777',
    },
    render({ title, content, tooltip }) {
        return `<div class="node-header" title="${tooltip || ''}"> <span class="node-icon">${this.icon}</span> <strong>${title}</strong> </div> <div class="node-body"> <p>${content || 'End point'}</p> </div>`;
    }
},
{
    id: 'detailed_intermediate',
    icon: '🧩',
    inputs: 1,
    outputs: 2,
    defaults: {
        '--node-header-bg': '#059669', // emerald-600
        '--node-body-bg': '#ecfdf5',   // emerald-50
        '--node-conn-color': '#059669',
    },
    render({ title, content, tooltip, nodeId }) {
        return `
        <div class="node-header" title="${tooltip || ''}">
            <span class="node-icon">${this.icon}</span>
            <strong>${title}</strong>
            ${nodeId ? `<small class="node-detail">#${nodeId}</small>` : ''}
        </div>
        <div class="node-body">
            <p>${content || 'Detailed task'}</p>
        </div>
        <div class="node-footer">
            <small>I: ${this.inputs}, O: ${this.outputs}</small>
            <!-- <button df-action="info" title="More Info">ℹ️</button> -->
        </div>`;
    }
}
];
  
  export default {
    // The root element of the component will be this div.
    // Style ensures it tries to fill its parent if the parent has dimensions.
    template: '<div id="drawflow" style="width: 100%; height: 100%;"></div>',
    props: {
        initial_data: Object, // Receives initial data from Python
    },
    data() {
      return {
        editor: null,
      };
    },
    mounted() {
      // this.$el is the <div id="drawflow">
      this.editor = new Drawflow(this.$el);
      this.editor.reroute = true; // Enable connection rerouting
      this.editor.reroute_fix_curvature = true;
      this.editor.force_first_input = false; // Allow nodes without inputs to be connect targets if appropriate

      // Zoom configuration
      this.editor.zoom_enable = true; // Critical for mouse wheel zoom
      this.editor.zoom_max = 1.6;
      this.editor.zoom_min = 0.3;
      // this.editor.zoom_value = 1; // Drawflow manages this internally

      this.editor.start();

      // Load initial data if provided
      if (this.initial_data && Object.keys(this.initial_data).length > 0) {
          this.importData(this.initial_data);
      } else {
          this.editor.addModule('Home'); // Ensure a default module exists
      }

      // Example: Listen to Drawflow events and emit them to NiceGUI
      // this.editor.on('nodeCreated', (id) => this.$emit('node-created', { nodeId: id }));
      // this.editor.on('nodeSelected', (id) => this.$emit('node-selected', { nodeId: id }));
      // this.editor.on('connectionCreated', (conn) => this.$emit('connection-created', conn));
    },
    methods: {
      
      addTemplateNode(templateId, params) {
        const tpl = NODE_TEMPLATES.find(t => t.id === templateId);
        if (!tpl) {
          console.error(`Drawflow template not found: ${templateId}`);
          return;
        }

        // Determine node class based on inputs/outputs
        let nodeSpecificClass = '';
        if (tpl.inputs > 0 && tpl.outputs > 0) nodeSpecificClass = 'intermediate-node';
        else if (tpl.outputs > 0) nodeSpecificClass = 'start-node';
        else if (tpl.inputs > 0) nodeSpecificClass = 'end-node';
        
        const nodeClass = `drawflow-node ${nodeSpecificClass}`; // Base class + specific class

        // Merge defaults for CSS variables
        const styleString = Object.entries(tpl.defaults || {})
          .map(([k,v]) => `${k}: ${v}`)
          .join('; ');

        const nodeId = this.editor.id; // Get next available ID from Drawflow

        // Data to be stored with the node in Drawflow's export
        const nodeData = {
            templateId: tpl.id,
            title: params.title,
            content: params.content || '',
            tooltip: params.tooltip || '',
            // You can add any other serializable data here
            // e.g., port_definitions: [{name: 'output_1', type: 'data'}, ...]
        };

        // Parameters for rendering the HTML
        const renderParams = { ...params, nodeId, icon: tpl.icon };
        const html = `
          <div class="template-node-wrapper" style="${styleString}">
            ${tpl.render(renderParams)}
          </div>`;
        
        this.editor.addNode(
          params.title, // Name of the node (used by Drawflow internally, can be same as title)
          tpl.inputs,   // Number of inputs
          tpl.outputs,  // Number of outputs
          params.x,     // X position
          params.y,     // Y position
          nodeClass,    // CSS class for the node (e.g., 'start-node')
          nodeData,     // Data object associated with the node
          html          // HTML content of the node
        );
      },
      zoomIn() {
        if (!this.editor) return;
        this.editor.zoom_in();
      },
      zoomOut() {
        if (!this.editor) return;
        this.editor.zoom_out();
      },
      resetZoom() {
        if (!this.editor) return;
        this.editor.zoom_reset();
      },
      exportData() {
        if (!this.editor) return null;
        return this.editor.export();
      },
      importData(data) {
        if (!this.editor) return;
        this.editor.import(data);
      },
      clearEditor() {
        if (!this.editor) return;
        this.editor.clear();
        this.editor.addModule('Home'); // Re-add default module after clearing
      },

      async autoLayoutNodes() {
          if (!this.editor) {
              console.error("Drawflow editor not initialized.");
              return;
          }

          const currentData = this.editor.export();
          // Check if there's any data in the 'Home' module
          if (!currentData || !currentData.drawflow || !currentData.drawflow.Home || !currentData.drawflow.Home.data || Object.keys(currentData.drawflow.Home.data).length === 0) {
              console.warn("No nodes to layout in the 'Home' module.");
              return;
          }

          const nodesData = currentData.drawflow.Home.data;
          const elkNodes = [];
          const elkEdges = [];

          // 1. Map Drawflow nodes and connections to ELK.js format
          for (const nodeId in nodesData) {
              if (nodesData.hasOwnProperty(nodeId)) {
                  const node = nodesData[nodeId];
                  const el = document.getElementById(`node-${nodeId}`); // Drawflow assigns IDs like 'node-X'
                  if (el) {
                      // Get actual rendered width and height of the node element
                      const width = el.offsetWidth;
                      const height = el.offsetHeight;

                      // Add node to ELK graph
                      elkNodes.push({
                          id: String(node.id), // ELK.js expects string IDs
                          width: width,
                          height: height,
                          // Define ports for more precise edge routing
                          ports: Object.keys(node.inputs || {}).map(inputName => ({
                              id: `${node.id}_${inputName}`,
                              properties: { 'org.eclipse.elk.port.side': 'WEST' } // Default input ports to the left
                          })).concat(Object.keys(node.outputs || {}).map(outputName => ({
                              id: `${node.id}_${outputName}`,
                              properties: { 'org.eclipse.elk.port.side': 'EAST' } // Default output ports to the right
                          }))),
                      });

                      // Add edges to ELK graph
                      for (const outputName in node.outputs) {
                          if (node.outputs.hasOwnProperty(outputName)) {
                              node.outputs[outputName].connections.forEach(connection => {
                                  elkEdges.push({
                                      id: `edge-${node.id}-${outputName}-${connection.node}-${connection.output}`,
                                      source: String(node.id),
                                      sourcePort: `${node.id}_${outputName}`, // Connect from specific output port
                                      target: String(connection.node),
                                      targetPort: `${connection.node}_${connection.output}`, // Connect to specific input port
                                  });
                              });
                          }
                      }
                  } else {
                      console.warn(`DOM element for node ${nodeId} not found. Skipping this node for layout.`);
                  }
              }
          }

          if (elkNodes.length === 0) {
              console.warn("No layoutable nodes found after processing. Layout skipped.");
              return;
          }

          const elk = new ELK(); // Corrected case (ELK instead of Elk)
          const graph = {
              id: 'root',
              layoutOptions: {
                  'elk.algorithm': 'layered', // Best for directed graphs/flowcharts
                  'elk.direction': 'RIGHT', // Flow from left to right (can be 'DOWN' for vertical)
                  'elk.spacing.nodeNode': '70', // Minimum space between nodes
                  'elk.spacing.portPort': '10', // Space between ports on the same node
                  'elk.spacing.edgeNode': '40', // Space between edges and nodes
                  'elk.layered.spacing.nodeNodeBetweenLayers': '100', // Horizontal space between layers/columns
                  'elk.layered.nodePlacement.strategy': 'SIMPLE', // Simpler placement strategy
                  'elk.padding': '[top=20,left=20,bottom=20,right=20]', // Padding around the entire graph
                  'elk.edgeRouting': 'ORTHOGONAL', // Orthogonal (right-angle) lines with bends
                  // 'elk.edgeRouting': 'SPLINES', // Curved lines (alternative)
              },
              children: elkNodes,
              edges: elkEdges,
          };

          try {
              console.log("Starting ELK.js layout for", elkNodes.length, "nodes and", elkEdges.length, "edges...");
              const result = await elk.layout(graph);
              console.log("ELK.js layout complete.", result);

              if (result && result.children) {
                  const initialCanvasX = 50; // Arbitrary starting X position for the whole layout
                  const initialCanvasY = 50; // Arbitrary starting Y position for the whole layout
                  
                  const nodesToUpdateConnectionsFor = []; // Store IDs of nodes that moved

                  result.children.forEach(elkNode => {
                      const drawflowNodeId = parseInt(elkNode.id); // Convert ELK's string ID back to integer
                      const nodeElement = document.getElementById(`node-${drawflowNodeId}`);
                      
                      if (nodeElement) {
                          // Get Drawflow's internal node data object
                          const nodeData = this.editor.getNodeFromId(drawflowNodeId);

                          if (nodeData) {
                              // 2. Update Drawflow's internal data for the node's position
                              nodeData.pos_x = elkNode.x + initialCanvasX;
                              nodeData.pos_y = elkNode.y + initialCanvasY;

                              // 3. Directly update the DOM element's position using translate3d
                              // Drawflow applies transform property for positioning, not left/top
                              nodeElement.style.transform = `translate3d(${nodeData.pos_x}px, ${nodeData.pos_y}px, 0px)`;
                              
                              // Add to list for connection updates
                              nodesToUpdateConnectionsFor.push(drawflowNodeId);
                          } else {
                              console.warn(`Drawflow internal data not found for node ID: ${drawflowNodeId}`);
                          }
                      } else {
                          console.warn(`DOM element not found for node ID: ${drawflowNodeId}`);
                      }
                  });

                  // 4. After all nodes have been visually moved,
                  // tell Drawflow to update all affected connections.
                  // This is crucial for lines to follow the nodes.
                  nodesToUpdateConnectionsFor.forEach(nodeId => {
                      this.editor.updateConnection(nodeId);
                  });

                  // Optional: Center or zoom the view after layout
                  // (This is more complex and would require calculating the bounding box
                  // of the laid out graph and adjusting this.editor.canvas_x, this.editor.canvas_y,
                  // and this.editor.zoom accordingly. For now, a simple offset is applied.)

              } else {
                  console.warn("ELK.js layout returned no children or invalid result.");
              }
          } catch (error) {
              console.error("ELK.js layout failed:", error);
              // You might want to display a more user-friendly error message here
          }
      },
    }
  };