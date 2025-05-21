from nicegui import ui, app
import time
import json
from typing import Dict, Any, Optional

# Serve Drawflow assets
app.add_static_files('/drawflow_src', 'drawflow_src')

class DrawflowEditor(ui.element, component='drawflow_component.js'):
    """
    A NiceGUI custom component for embedding a Drawflow editor.
    """
    def __init__(self, initial_data: Optional[Dict[str, Any]] = None):
        """
        Initializes the DrawflowEditor.

        Args:
            initial_data: Optional Drawflow data to load into the editor on startup.
                          This should be in the format exported by Drawflow.
        """
        super().__init__()
        self._props['initial_data'] = initial_data if initial_data else {} # Pass as prop

        # Cache busting for assets
        ts = int(time.time())
        ui.add_head_html(f'<link rel="stylesheet" href="/drawflow_src/drawflow.min.css?{ts}">')
        ui.add_head_html(f'<script src="/drawflow_src/drawflow.min.js?{ts}"></script>')
        ui.add_head_html(f'<link rel="stylesheet" href="/drawflow_src/dfTheme.css?{ts + 0.5}">')
        ui.add_head_html(f'<link rel="stylesheet" href="/drawflow_src/custom_drawflow.css?{ts+1}">')
        ui.add_head_html(f'<script src="/drawflow_src/elk.bundled.js?{ts + 2}"></script>')

    def load_data(self, data: Dict[str, Any]) -> None:
        """
        Loads Drawflow data into the editor, replacing current content.

        Args:
            data: The Drawflow data structure to load (typically from a previous export).
        """
        self.run_method('importData', data)

    async def get_data(self) -> Dict[str, Any] | None:
        """
        Exports the current Drawflow data from the editor.

        Returns:
            A dictionary representing the Drawflow data, or None if the export fails or is empty.
            The structure is defined by Drawflow's export format, e.g.:
            {
                "drawflow": {
                    "Home": { // Module name
                        "data": {
                            "node_id_1": {
                                "id": 1,
                                "name": "Node Title",
                                "data": { "templateId": "basic", "title": "...", ... }, // Custom data
                                "class": "drawflow-node start-node", // Assigned class
                                "html": "...", // Rendered HTML of the node
                                "typenode": "vue", // or 'html'
                                "inputs": {}, // Input connections
                                "outputs": { // Output connections
                                    "output_1": {"connections": [{"node": "2", "output": "input_1"}]}
                                },
                                "pos_x": 100,
                                "pos_y": 150
                            },
                            // ... other nodes
                        }
                    }
                }
            }
        """
        return await self.run_method('exportData')

    def clear_data(self) -> None:
        """Clears all nodes and connections from the Drawflow editor."""
        self.run_method('clearEditor')

    def add_node(self, template_id: str, params: Dict[str, Any]) -> None:
        """
        Adds a new node to the Drawflow editor based on a template.

        Args:
            template_id: The ID of the node template to use (e.g., 'basic_start', 'detailed_intermediate').
            params: A dictionary of parameters for the node. Must include:
                    'title' (str): Title of the node.
                    'x' (int | float): X-coordinate for the node.
                    'y' (int | float): Y-coordinate for the node.
                    Optional: 'content' (str), 'tooltip' (str).
        """
        if not all(k in params for k in ['title', 'x', 'y']):
            raise ValueError("params must include 'title', 'x', and 'y'")
        self.run_method('addTemplateNode', template_id, params)

    def zoom_in(self) -> None:
        """Zooms into the editor."""
        self.run_method('zoomIn')

    def zoom_out(self) -> None:
        """Zooms out of the editor."""
        self.run_method('zoomOut')

    def zoom_reset(self) -> None:
        """Resets the editor zoom to default."""
        self.run_method('resetZoom')

    async def auto_layout_nodes(self) -> None:
        """
        Triggers the automatic layout of nodes using ELK.js in the Drawflow editor.
        """
        await self.run_method("autoLayoutNodes")


@ui.page('/')
async def main_page():
    # This helps ensure the page and content area can provide height to children
    ui.query('body').style('min-height: 100vh; margin: 0; padding: 0;')
    ui.query('.nicegui-content').classes('h-screen p-0 m-0').style('display: flex; flex-direction: column;')

    initial_flow_data = None # Start empty

    with ui.splitter(value=70).classes('w-full h-full no-wrap overflow-hidden flex-grow') as splitter:
        with splitter.before:
            # The DrawflowEditor will try to fill this panel.
            # The parent (splitter.before) needs to have a defined size.
            drawflow = DrawflowEditor(initial_data=initial_flow_data).classes('h-full w-full')

        with splitter.after:
            with ui.column().classes('w-full p-4 bg-white rounded-xl shadow-md h-full overflow-y-auto'):
                ui.label('Node Builder').classes('text-h6 font-semibold')

                # Updated templates to reflect different node types
                template_id_to_display_name = {
                    'basic_start': 'Basic Start Node',
                    'basic_intermediate': 'Basic Task Node',
                    'basic_end': 'Basic End Node',
                    'detailed_intermediate': 'Detailed Info Node'
                }
                # The options for ui.select will be the display names
                select_options = list(template_id_to_display_name.values())
                # The initial value for ui.select must be one of these display names
                initial_display_value = template_id_to_display_name['basic_intermediate']

                tpl_select = ui.select(
                    options=sorted(select_options), # Pass the list of display names
                    value=initial_display_value,    # Set initial value to a display name
                    label='Template'
                ).classes('w-full')

                # Helper to get the actual template_id from the selected display name
                def get_selected_template_id():
                    selected_display_name = tpl_select.value
                    for id_val, display_name in template_id_to_display_name.items():
                        if display_name == selected_display_name:
                            return id_val
                    return None

                xpos = ui.number(label='X', value=50, format='%.0f').classes('w-full')
                ypos = ui.number(label='Y', value=50, format='%.0f').classes('w-full')
                title = ui.input(label='Title', value='My Node').classes('w-full')
                content = ui.input(label='Content', value='Node details...').classes('w-full')
                tooltip = ui.input(label='Tooltip', value='More info here').classes('w-full')

                ui.button('Add Node', on_click=lambda: drawflow.add_node(
                    get_selected_template_id(), # Use helper to get the actual ID
                    {'title': title.value, 'content': content.value,
                     'tooltip': tooltip.value, 'x': xpos.value, 'y': ypos.value}
                )).props('color=primary').classes('w-full mt-2')

                ui.separator().classes('my-4')
                ui.label('Controls').classes('text-h6 font-semibold')

                with ui.row().classes('w-full justify-around items-center gap-2 mt-2'):
                    ui.button('Zoom In', on_click=drawflow.zoom_in, icon='zoom_in').props('flat dense')
                    ui.button('Zoom Out', on_click=drawflow.zoom_out, icon='zoom_out').props('flat dense')
                    ui.button('Reset Zoom', on_click=drawflow.zoom_reset, icon='center_focus_strong').props('flat dense')

                ui.separator().classes("my-4")
                ui.label("Layout Controls").classes("text-h6 font-semibold")

                ui.button(
                    "Auto-Layout Nodes",
                    on_click=drawflow.auto_layout_nodes,
                    icon="auto_awesome"
                ).props("color=info").classes("w-full mt-2")


                output = ui.code(language='json').classes('w-full scroll-auto grow min-h-[200px] mt-4 border rounded p-2')

                async def handle_export():
                    data = await drawflow.get_data()
                    if data:
                        output.set_content(json.dumps(data, indent=2))
                    else:
                        output.set_content('// No data or export failed')

                async def handle_clear():
                    drawflow.clear_data()
                    output.set_content('// Editor Cleared')

                with ui.row().classes('w-full justify-start gap-2 mt-4'):
                    ui.button('Export', on_click=handle_export).props('icon=file_download color=secondary')
                    ui.button('Clear', on_click=handle_clear).props('icon=delete color=negative')

ui.run(reload=False) # reload=True is often useful during development