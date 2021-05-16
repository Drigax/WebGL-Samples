class ShadowMappingExperience{
    constructor(glContext){
        this.name = "ShadowMappingExperience";
        console.log("Created" + this.name);

        this.camera = new Camera();
        this.camera.setPosition(0, 5, -10);
    }

    update() {

    }

    render() {

    }
}

// Defines a 4x4 transformation matrix.
// Axes used here are left handed, +Y up, +X right, -Z forward in alignment with WebGL spec.
// See: https://www.tutorialspoint.com/webgl/webgl_basics.htm
class Matrix {
    constructor() {
        this.m00 = 1;
        this.m01 = 0;
        this.m02 = 0;
        this.m03 = 0;
        this.m10 = 0;
        this.m11 = 1;
        this.m12 = 0;
        this.m13 = 0;
        this.m20 = 0;
        this.m21 = 0;
        this.m22 = 1;
        this.m23 = 0;
        this.m30 = 0;
        this.m31 = 0;
        this.m32 = 0;
        this.m33 = 1;
    }
}

class Object {
    constructor() {
        this.transform = new Matrix();
    }

    setPosition(x, y, z){
        this.transform.m30 = x;
        this.transform.m31 = y;
        this.transform.m32 = z;
    }
}

class Mesh extends Object {
    constructor() {
        super();
        this.vertices = [];
        this.indices  = [];
        this.material = new PhongShaderMaterial();
    }

    render() {

    }
}

class Material {

}

class PhongShaderMaterial extends Material {
    constructor() {
        super();
    }
}

class Camera extends Object {
    constructor() {
        super();
        this.viewProjection = new Matrix();
    }
}

class Texture {
    constructor(urlOrData) {

    }
}

class Light extends Object {
    constructor() {
        super();
        this.brightness = 1; // brightness is measured in phong shader units, lumen.
        this.shadowMapping = new ShadowMap();
    }
}

class ShadowMap {

}