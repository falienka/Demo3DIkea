import {Scene, AbstractMesh, TransformNode, Color3, MeshBuilder, StandardMaterial} from '@babylonjs/core';
import {Inspector} from '@babylonjs/inspector'; 

export function AddInspector(scene: Scene)
{
    // Initialize and hide
    Inspector.Show(scene, { overlay: false, enablePopup: true });
    scene.debugLayer.hide();

    // Allow show with F1 key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault(); // Prevent browser help dialog
            if (scene.debugLayer.isVisible()) {
            scene.debugLayer.hide();
            } else {
            scene.debugLayer.show();
            }
        }
    });
}

export function ShowPivot(node: AbstractMesh | TransformNode, color: Color3)
{
  const pivotMarker = MeshBuilder.CreateSphere("pivotMarker", { diameter: 0.1 }, node.getScene());
  pivotMarker.material = new StandardMaterial("pivotMat", node.getScene());
  (pivotMarker.material as StandardMaterial).diffuseColor = color;
  pivotMarker.isPickable = false;

  // Position the marker at the node's pivot point
  pivotMarker.position = node.getAbsolutePivotPoint();
}