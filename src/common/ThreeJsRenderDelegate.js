import * as THREE from 'three';
class TextureRegistry {
  constructor(basename) {
    this.basename = basename;
    this.textures = [];
    this.loader = new THREE.TextureLoader();
  }
  getTexture(filename) {
    if (this.textures[filename]) {
      return Promise.resolve(this.textures[filename]);
    }

    let ressourePath = filename;
    if (filename[0] !== '/') {
      ressourePath = this.basename + '[' + filename + ']';
    }

    let filetype = undefined;
    if (filename.indexOf('.png') >= filename.length - 5) {
      filetype = 'image/png';
    } else if (filename.indexOf('.jpg') >= filename.length - 5) {
      filetype = 'image/jpeg';
    } else if (filename.indexOf('.jpeg') >= filename.length - 5) {
      filetype = 'image/jpeg';
    } else {
      throw new Error('Unknown filetype');
    }

    let promise;
    window.driver.getFile(ressourePath, (loadedFile) => {
      if (!loadedFile) {
        throw new Error('Unknown file: ' + ressourePath);
      }

      let blob = new Blob([loadedFile.slice(0)], { type: filetype });
      let blobUrl = URL.createObjectURL(blob);
      this.textures[filename] = {
        blob: blob,
        blobUrl: blobUrl,
        matrix: new THREE.Matrix3(),
      };
      promise = new Promise((resolve, reject) => {
        // load a resource
        this.loader.load(
          // resource URL
          blobUrl,
          //'./_BaseColor_0.png',

          // onLoad callback
          (texture) => {
            this.textures[filename].texture = texture;
            resolve(texture);
          },

          // onProgress callback currently not supported
          undefined,

          // onError callback
          (err) => {
            reject(err);
          }
        );
      });
    });
    return promise;
  }
}

class HydraMesh {
  constructor(id, hydraInterface) {
    this._geometry = new THREE.BufferGeometry();
    this._id = id;
    this._interface = hydraInterface;
    this._points = undefined;
    this._normals = undefined;
    this._indices = undefined;

    const material = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      vertexColors: false, //,
    });

    this._mesh = new THREE.Mesh(this._geometry, material);
    window.scene.add(this._mesh); // FIXME
  }
  updateOrder(attribute, attributeName) {
    if (attribute && this._indices) {
      let values = [];
      for (let i = 0; i < this._indices.length; i++) {
        let index = this._indices[i];
        values.push(
          attribute[3 * index],
          attribute[3 * index + 1],
          attribute[3 * index + 2]
        );
      }
      this._geometry.setAttribute(
        attributeName,
        new THREE.Float32BufferAttribute(values, 3)
      );
    }
  }
  updateIndices(indices) {
    this._indices = [];
    for (let i = 0; i < indices.length; i++) {
      this._indices.push(indices[i]);
    }
    //this._geometry.setIndex( indicesArray );
    this.updateOrder(this._points, 'position');
    this.updateOrder(this._normals, 'normal');
  }
  setTransform(matrix) {
    this._mesh.matrix.set(...matrix);
    this._mesh.matrix.transpose();
    this._mesh.matrixAutoUpdate = false;
  }
  updateNormals(normals) {
    //this._geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
    this._normals = normals.slice(0);
    this.updateOrder(this._normals, 'normal');
  }
  setMaterial(materialId) {
    console.log('Material: ' + materialId);
    if (this._interface.materials[materialId]) {
      this._mesh.material = this._interface.materials[materialId]._material;
    }
  }
  updatePrimvar(name, data, dimension) {
    if (name === 'points' || name === 'normals') {
      return;
    }

    if (name === 'st') {
      name = 'uv';
    }

    console.log('Setting PrimVar: ' + name);
    this._geometry.setAttribute(
      name,
      new THREE.Float32BufferAttribute(data, dimension)
    );
  }
  updatePoints(points) {
    this._points = points.slice(0);
    this.updateOrder(this._points, 'position');
  }

  commit() {
    if (this._geomIsDirty) {
      this._geomIsDirty = false;

      const indices = this._attributes.index.data;
      const geom = new THREE.BufferGeometry();
      for (const attr in this._attributes) {
        let indexedBuffer = this._attributes[attr].data;
        const dimensions = this._attributes[attr].dimensions;

        if (attr === 'position' || attr === 'normal')
          indexedBuffer = this.updateOrder(indexedBuffer, indices);

        switch (dimensions) {
          case 3:
            geom.addAttribute(
              attr,
              new THREE.BufferAttribute(indexedBuffer, dimensions)
            );
            break;
          case 2:
            geom.addAttribute(
              attr,
              new THREE.BufferAttribute(indexedBuffer, dimensions)
            );
            break;
          case 1:
            // Do nothing for index buffers
            break;
        }
      }
      console.log('TODO - Geometry Update');
      return; //

      if (!this._geomId) {
        this._geom = geom;
        this._geomId = this._interface.modelBuilder.addGeometry(this._geom);
        this._fragId = this._interface.modelBuilder.addFragment(
          this._geomId,
          'default'
        );

        this._interface.modelBuilder.changeFragmentGeometry(
          this._fragId,
          this._geom
        );
      } else {
        this._interface.modelBuilder.changeGeometry(
          this._geom,
          this._interface.modelBuilder.packNormals(geom)
        );
        this._geom = geom;
      }
    }

    if (this._xfmIsDirty) {
      this._xfmIsDirty = false;
      console.log('TODO - Transform Update');
      //        this._interface.modelBuilder.changeFragmentTransform(this._fragId, this._transform)
    }

    if (this._matIsDirty) {
      this._matIsDirty = false;
      // Guessing if material is still default, we should switch fragment to use first official material
      if (this._matName === 'default') {
        for (let name in this._interface.materials) {
          if (name !== 'default') {
            this._matName = name;
            break;
          }
        }
      }
      console.log('TODO - Material Update');
      //        this._interface.modelBuilder.changeFragmentMaterial(this._fragId, this._matName)
    }
  }
}

class HydraMaterial {
  constructor(id, hydraInterface) {
    this._id = id;
    this._nodes = {};
    this._interface = hydraInterface;
    this._material = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      vertexColors: false,
    });
  }

  updateNode(networkId, path, parameters) {
    console.log('Updating Material Node: ' + networkId + ' ' + path);
    this._nodes[path] = parameters;
  }

  assignTexture(
    mainMaterial,
    parameterName,
    materialParameterMapName,
    materialParameterName,
    parameterScaleValue
  ) {
    if (mainMaterial[parameterName] && mainMaterial[parameterName].nodeIn) {
      let textureFileName = mainMaterial[parameterName].nodeIn.file;
      this._interface.registry.getTexture(textureFileName).then((texture) => {
        this._material[materialParameterMapName] = texture;
        if (materialParameterName !== undefined) {
          this._material[materialParameterName] = parameterScaleValue;
        }
        this._material.needsUpdate = true;
      });
    } else {
      this._material[materialParameterMapName] = undefined;
      if (materialParameterName !== undefined) {
        this._material[materialParameterName] = 0.0;
      }
    }
  }

  updateFinished(type, relationships) {
    //return;
    for (let relationship of relationships) {
      relationship.nodeIn = this._nodes[relationship.inputId];
      relationship.nodeOut = this._nodes[relationship.outputId];
      relationship.nodeIn[relationship.inputName] = relationship;
      relationship.nodeOut[relationship.outputName] = relationship;
    }
    console.log('Finalizing Material: ' + this._id);

    // find the main material node
    let mainMaterialNode = undefined;
    for (let node of Object.values(this._nodes)) {
      if (node.diffuseColor) {
        mainMaterialNode = node;
        break;
      }
    }

    if (!mainMaterialNode) {
      this._material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        vertexColors: false,
      });
      return;
    }

    console.log('Creating Material: ' + this._id);
    this._material = new THREE.MeshPhysicalMaterial({});
    this.assignTexture(mainMaterialNode, 'diffuseColor', 'map');
    this.assignTexture(
      mainMaterialNode,
      'clearcoat',
      'clearcoatMap',
      'clearcoat',
      1.0
    );
    this.assignTexture(
      mainMaterialNode,
      'clearcoatRoughness',
      'clearcoatRoughnessMap',
      'clearcoatRoughness',
      5.0
    );
    this.assignTexture(
      mainMaterialNode,
      'roughness',
      'roughnessMap',
      'roughness',
      1.5
    );
    this.assignTexture(
      mainMaterialNode,
      'metallic',
      'metalnessMap',
      'metalness',
      1.0
    );
    this.assignTexture(mainMaterialNode, 'normal', 'normalMap');
  }
}

export class RenderDelegateInterface {
  constructor(filename) {
    this.registry = new TextureRegistry(filename);
    this.materials = {};
    this.meshes = {};
  }
  createRPrim(typeId, id, instancerId) {
    console.log('Creating RPrim: ' + typeId + ' ' + id);
    let mesh = new HydraMesh(id, this);
    this.meshes[id] = mesh;
    return mesh;
  }

  createBPrim(typeId, id) {
    console.log('Creating BPrim: ' + typeId + ' ' + id);
    /*let mesh = new HydraMesh(id, this);
    this.meshes[id] = mesh;
    return mesh;*/
  }

  createSPrim(typeId, id) {
    console.log('Creating SPrim: ' + typeId + ' ' + id);

    if (typeId === 'material') {
      let material = new HydraMaterial(id, this);
      this.materials[id] = material;
      return material;
    } else {
      return undefined;
    }
  }
  CommitResources() {
    for (const id in this.meshes) {
      const hydraMesh = this.meshes[id];
      hydraMesh.commit();
    }
  }
}
