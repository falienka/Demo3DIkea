import * as BN from '@babylonjs/core';
import '@babylonjs/loaders';
import './style.css'
import { AddInspector } from './debug';

// Create the canvas and engine
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new BN.Engine(canvas, true);

// Prepare scene
function createScene(): BN.Scene
{
  const scene = new BN.Scene(engine);

  // Set up camera
  const camera = new BN.ArcRotateCamera(
    'camera',
    Math.PI / 2,
    Math.PI / 4,
    5,
    new BN.Vector3(0, 0.5, 0),
    scene
  );
  camera.attachControl(true);
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 10;
  camera.wheelDeltaPercentage = 0.01;

  // Create a light
  const light = new BN.HemisphericLight('light', new BN.Vector3(0, 1, 0), scene);

  const assetsManager = new BN.AssetsManager(scene);

  const modelTask = assetsManager.addMeshTask(
    'modelTask', 
    '', 
    './models/', 
    'rec_table1.glb'
  );

  modelTask.onSuccess = (task) => 
  {
    console.log(task.loadedMeshes);
  }
  
  // Handle errors
  modelTask.onError = (_task, message, exception) => 
  {
    console.error('Failed to load mesh:', message, exception);
  };
  
  assetsManager.load();

  return scene;
}

// Create the scene
const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

// Resize viewport with the window
window.addEventListener('resize', () => {
  engine.resize();
});

AddInspector(scene);
