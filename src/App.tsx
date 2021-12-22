import React, { useEffect, useLayoutEffect, useState } from 'react';
import './App.css';
//@ts-ignore
import { OrbitControls } from './common/OrbitControls.js';
//@ts-ignore
import { RenderDelegateInterface } from './common/ThreeJsRenderDelegate.js';
import { loadFile } from './common/utils';
import * as THREE from 'three';

function App() {
  useLayoutEffect(() => {
    let scene;
    let defaultTexture;

    let params = new URL(document!.location).searchParams;
    let name = params.get('name');

    let filename = params.get('file') || 'simpleShading.usda';

    init();

    Promise.all([loadFile(filename), usd()]).then(async ([usdFile, Usd]) => {
      let extension = filename.split('.')[1];
      let inputFile = 'input.' + extension;
      Usd.FS.createDataFile(
        '/',
        inputFile,
        new Uint8Array(usdFile as ArrayBuffer),
        true,
        true,
        true
      );

      let renderInterface = new RenderDelegateInterface(inputFile);
      let driver = (window.driver = new Usd.HdWebSyncDriver(
        renderInterface,
        inputFile
      ));

      driver.Draw();

      const stage = window.driver.GetStage();
      const endTimeCode = stage.GetEndTimeCode();
      animate(16.7, endTimeCode);
    });

    function init() {
      //

      const camera = (window.camera = new THREE.PerspectiveCamera(
        27,
        window.innerWidth / window.innerHeight,
        1,
        3500
      ));
      const cameraZ = params.get('cameraZ');
      const cameraY = params.get('cameraY');
      camera.position.z = cameraZ ? parseInt(cameraZ, 10) : 7;
      camera.position.y = cameraY ? parseInt(cameraY, 10) : 7;

      scene = window.scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);

      //

      //const light = new THREE.HemisphereLight();
      //scene.add( light );
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.z = 50;
      directionalLight.position.y = 20;
      directionalLight.position.x = -10;
      scene.add(directionalLight);

      const light = new THREE.AmbientLight(0x202020); // soft white light
      scene.add(light);

      const renderer = (window.renderer = new THREE.WebGLRenderer({
        antialias: true,
      }));

      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.toneMapping = THREE.CineonToneMapping;
      renderer.toneMappingExposure = 1;

      document.body.appendChild(renderer.domElement);
      const controls = (window._controls = new OrbitControls(
        camera,
        renderer.domElement
      ));
      controls.update();
      window.addEventListener('resize', onWindowResize);
    }

    async function animate(timeout = 16.7, endTimecode) {
      window._controls.update();
      let secs = new Date().getTime() / 1000;
      await new Promise((resolve) => setTimeout(resolve, 10));
      const time = (secs * (1000 / timeout)) % endTimecode;
      window.driver.SetTime(time);
      driver.Draw();

      render();

      requestAnimationFrame(animate.bind(null, timeout, endTimecode));
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function render() {
      const time = Date.now() * 0.001;
      window.renderer.render(window.scene, window.camera);
    }
  }, []);

  return <div className="App" id="container"></div>;
}

export default App;
