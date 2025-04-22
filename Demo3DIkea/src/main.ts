import * as BN from '@babylonjs/core';
import '@babylonjs/loaders';
import './style.css'
import { AddInspector } from './debug';

// Create the canvas and engine
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new BN.Engine(canvas, true);

let selectedRoot: BN.TransformNode | null = null; 
const handles: BN.Mesh[] = []; 

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
  camera.upperRadiusLimit = 20;
  camera.wheelDeltaPercentage = 0.01;

  // Create a light
  const light = new BN.HemisphericLight('light', new BN.Vector3(0, 1, 0), scene);

  const assetsManager = new BN.AssetsManager(scene);
  
  // Add a couple different table models
  const modelTask0 = assetsManager.addMeshTask(
    'modelTask', 
    '', 
    './models/', 
    'rec_table1.glb'
  );
  const modelTask1 = assetsManager.addMeshTask(
    'modelTask', 
    '', 
    './models/', 
    'rec_table2.glb'
  );
  const modelTask2 = assetsManager.addMeshTask(
    'modelTask', 
    '', 
    './models/', 
    'round_table1.glb'
  );
  const modelTask3 = assetsManager.addMeshTask(
    'modelTask', 
    '', 
    './models/', 
    'round_table2.glb'
  );

  const modelTasks: BN.MeshAssetTask[] = [modelTask0, modelTask1, modelTask2, modelTask3];

  // Distance between loaded models
  const spaceDistance = 5;

  modelTasks.forEach((modelTask, index) => {
    modelTask.onSuccess = (task) => 
      {
        // Reparent meshes to a new node - to standardize hierarchy across meshes
        let rootNode = new BN.TransformNode(`rootNode${index}`, scene);
        rootNode.position = new BN.Vector3(0, 0, spaceDistance*index);
    
        task.loadedMeshes[0].getChildMeshes().forEach((m) => {
          m.parent = rootNode;
        });
        
        // Enable selection of models
        scene.onPointerObservable.add( (pointerInfo) =>
        {
          if(pointerInfo.type === BN.PointerEventTypes.POINTERTAP)
            {
              const pick = scene.pick(scene.pointerX, scene.pointerY);
             
              const mesh = pick.pickedMesh!;
        
              if(mesh)
              {
                const root = mesh.parent;
                if (root)
                {
                  SelectModel(root as BN.TransformNode);

                  // Set selected model as camera's target and zoom in
                  camera.setTarget(root as BN.TransformNode);
                  camera.radius = 5;
                }
                else
                {
                  UnselectAll();
                }
              }
            }
        });
      }
      
      // Handle errors
      modelTask.onError = (_task, message, exception) => 
      {
        console.error('Failed to load mesh:', message, exception);
      };
  });
  
  assetsManager.load();
  
  return scene;
}

// Create handles - spheres located on vertices located furthes away from models center on x axis
function CreateHandles( mesh: BN.AbstractMesh )
{
  const positions = mesh.getVerticesData(BN.VertexBuffer.PositionKind)!;

  let minX =  Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }

  const eps = 1e-3;
  const localExtremes: BN.Vector3[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    // Get vertices close to the min and max X bounds
    if (Math.abs(x - minX) < eps || Math.abs(x - maxX) < eps) {
      // Check if a similar vertex (in local space) is already added - crude deduplication
      let foundSimilar = false;
      for(const existing of localExtremes){
          if( BN.Vector3.DistanceSquared(existing, new BN.Vector3(x, positions[i + 1], positions[i + 2])) < eps * eps){
              foundSimilar = true;
              break;
          }
      }
      if (!foundSimilar) {
        localExtremes.push(new BN.Vector3(
          x,
          positions[i + 1],
          positions[i + 2],
        ));
      }
    }
  }

  const worldMatrix = mesh.getWorldMatrix();

  // Get the world positions for the handles based on current mesh transform
  const worldExtremes = localExtremes.map(local =>
    BN.Vector3.TransformCoordinates(local, worldMatrix)
  );

  const handleMat = new BN.StandardMaterial("handleMat", mesh.getScene());
  handleMat.diffuseColor = BN.Color3.Yellow();
  handleMat.emissiveColor = BN.Color3.Yellow();
  handleMat.disableLighting = true;

  for (const worldPos of worldExtremes) {
    
    const sphereHandle = BN.MeshBuilder.CreateSphere(
      "HandleSphere", { diameter: 0.05 }, // Adjust diameter as needed
      mesh.getScene() // Ensure sphere is in the main scene
    );
    sphereHandle.position.copyFrom(worldPos);
    sphereHandle.isPickable = true;
    sphereHandle.material = handleMat;

    // Create Drag Behavior per Sphere
    const dragBehavior = new BN.PointerDragBehavior({ dragAxis: new BN.Vector3(1, 0, 0) });
    
    dragBehavior.useObjectOrientationForDragging = false;
    sphereHandle.addBehavior(dragBehavior); // Add unique behavior instance

    // Store initial state on Drag Start
    let initialScaleX = 1;
    let initialHandlePosition = new BN.Vector3();
    let initialMeshCenter = new BN.Vector3();

    dragBehavior.onDragStartObservable.add(() => {
      if (selectedRoot) {
        initialScaleX = selectedRoot.scaling.x;
        initialHandlePosition = sphereHandle.position.clone(); 
        initialMeshCenter = selectedRoot.getAbsolutePosition().clone(); 
      }
    });

    // Apply Scaling on Drag End 
    dragBehavior.onDragEndObservable.add(() => {
      if (selectedRoot) {
        const currentHandlePosition = sphereHandle.position;

        // Calculate distance from center along X-axis only
        const initialDistX = Math.abs(initialHandlePosition.x - initialMeshCenter.x);
        const currentDistX = Math.abs(currentHandlePosition.x - initialMeshCenter.x);


        if (initialDistX > 1e-5) { // Avoid division by zero
          const scaleFactor = currentDistX / initialDistX;
          selectedRoot.scaling.x = initialScaleX * scaleFactor;
        } 

        // TODO: Update handles positions instead of unselecting the model
        UnselectAll();
      }
       
    });

    // Add sphere to global handles array
    handles.push(sphereHandle); 
  }
}

// Make sure SelectModel clears old handles before creating new ones
function SelectModel ( root: BN.TransformNode )
{
  // Clear previous handles if a different model is selected
  while(handles.length) {
    handles.pop()?.dispose();
  }

  // Set current model as global variable
  selectedRoot = root;

  // Assuming the root node itself doesn't have vertices, process its children
  root.getChildMeshes().forEach( (childMesh) =>
  {
    // Only create handles for meshes that actually have vertices
    if (childMesh instanceof BN.Mesh && childMesh.getVerticesData(BN.VertexBuffer.PositionKind)) {
         CreateHandles(childMesh);
    }
  });
}

// Reset model selection and get rid of handles
function UnselectAll()
{
  while(handles.length) {
    handles.pop()?.dispose();
  }
  selectedRoot = null;
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
