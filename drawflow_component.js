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
    }
  };