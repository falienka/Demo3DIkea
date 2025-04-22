import {Scene} from '@babylonjs/core';
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