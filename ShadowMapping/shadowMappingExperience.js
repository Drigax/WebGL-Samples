class Experience {
    constructor(glContext){
        this.gl = glContext;
        this.clearColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
        this.meshes = [];
        this.materials = [];
        this.lights = [];
        this.camera = null;
    }

    update() {

    }

    render() {
        this.gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        // clear the depth and color buffers.
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.meshes.forEach(mesh => {
            const material = mesh.material | new FlatShadedMaterial(this.gl, vec4.fromValues(0.5, 0.5, 0.5, 1.0));
            mesh.material.render();
            mesh.render();
        });
    }
}

class GlHelper {
    /**
     * Creates and links a shader program given vertex and fragment source.
     * Shader compilation code courtesy of Mozilla - MDN WebGL tutorial
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
     * @param {WebGLContext} gl
     * @param {string} vertexShaderSource
     * @param {string} fragmentShaderSource
     *
     * @returns {}
     */
    static createShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
        const vertexShader = GlHelper.compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = GlHelper.compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        // check if compilation was successful
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        return shaderProgram;
    }

    /**
     * compiles a shader given source.
     * Shader compilation code courtesy of Mozilla - MDN WebGL tutorial
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
     *
     * @param {*} gl
     * @param {*} shaderType
     * @param {*} shaderSource
     */
    static compileShader(gl, shaderType, shaderSource) {
        const shader = gl.createShader(shaderType);

        // Send the source to the shader object

        gl.shaderSource(shader, shaderSource);

        // Compile the shader program

        gl.compileShader(shader);

        // check if compilation was successful
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Unable to compile the shader program: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

}

class ShadowMappingExperience extends Experience {
    constructor(glContext){
        super(glContext);
        this.name = "ShadowMappingExperience";
        console.log("Created" + this.name);

        this.camera = new Camera();
        this.camera.setPosition(0, 5, -10);

        const box = new BoxMesh(glContext);
        this.meshes.push(box);
        box.setPosition(0, 2, 0);

        const plane = new PlaneMesh(glContext);
        this.meshes.push(plane);
        plane.setPosition(0, 0, 0);
    }

    update() {
        super.update();
    }

    render() {
        super.render()
    }
}

// Defines a 4x4 transformation matrix.
// Axes used here are left handed, +Y up, +X right, -Z forward in alignment with WebGL spec.
// See: https://www.tutorialspoint.com/webgl/webgl_basics.htm
class Matrix {
    constructor() {
        this.m = mat4.create();
    }
}

class Object3d {
    constructor(glContext) {
        this.transform = new Matrix();
        this.gl = glContext;
    }

    setPosition(x, y, z){
        this.transform.m30 = x;
        this.transform.m31 = y;
        this.transform.m32 = z;
    }
}

class Mesh extends Object3d {
    constructor(glContext) {
        super(glContext);
        this.vertices = [];
        this.indices  = [];
        this.triangleDrawMode = glContext.TRIANGLES;
        this.material = new PhongShaderMaterial(glContext,
                                                vec4.fromValues(0.5, 0.5, 0.5, 1.0),
                                                vec4.fromValues(0.5, 0.5, 0.5, 1.0),
                                                vec4.fromValues(1.0, 1.0, 1.0, 1.0),
                                                0.3
                                                );
    }

    render() {
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

        this.gl.bufferData(this.gl.ARRAY_BUFFER,
                      new Float32Array(this.vertices),
                      this.gl.STATIC_DRAW);
        
        return positionBuffer;
    }
}

class BoxMesh extends Mesh {
    constructor(glContext){
        super(glContext);
        this.vertices = [-0.5,  0.5,  0.5,
                         -0.5, -0.5,  0.5,
                          0.5,  0.5,  0.5,
                          0.5, -0.5,  0.5,
                          0.5,  0.5, -0.5,
                          0.5, -0.5, -0.5,
                         -0.5,  0.5, -0.5,
                         -0.5, -0.5, -0.5,
                         -0.5,  0.5,  0.5,
                         -0.5, -0.5,  0.5
                        ];
        this.indices = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.triangleDrawMode = glContext.TRIANGLE_STRIP;
    }
}

class PlaneMesh extends Mesh {
    constructor(glContext) {
        super(glContext);
        this.vertices = [ 0.5,  0.5, 0.0,
                         -0.5,  0.5, 0.0,
                          0.5, -0.5, 0.0,
                         -0.5, -0.5, 0.0
                        ];
        this.indices  = [0, 1, 2, 3];
        this.triangleDrawMode = glContext.TRIANGLE_STRIP;
    }
}

/**
 * A GroundPlaneMesh is similar to a Plane Mesh, except with vertices defined such that
 */
class GroundPlaneMesh extends Mesh {
    constructor(glContext) {
        super(glContext);
        this.vertices = [ -0.5,  0.0,  0.5,
                           0.5,  0.0,  0.5,
                          -0.5,  0.0, -0.5,
                           0.5,  0.0, -0.5
                        ];
        this.indices  = [0, 1, 2, 3];
        this.triangleDrawMode = glContext.TRIANGLE_STRIP;
    }
}

class Material {
    /**
     * Vertex shader source courtesy of MDN WebGL tutorial:
     * https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
     *
     */
    static vertexShaderSource = `
        attribute highp vec4 aVertexPosition;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        void main(){
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        }
    `;

    constructor(glContext) {
        this.gl = glContext;
    }
}

class PhongShaderMaterial extends Material {
    /**
     * Vertex shader source courtesy of MDN WebGL tutorial:
     * https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
     *
     */
    static fragmentShaderSource = `
        uniform highp vec4 ambientColor;
        uniform highp vec4 diffuseColor;
        uniform highp vec4 specularColor;
        uniform highp vec4 glossiness;

        void main() {
            gl_FragColor = ambientColor;
        }
    `;

    static shaderProgram = null;

    constructor(glContext, ambientColor, diffuseColor, specularColor, glossiness) {
        super(glContext);

        this.ambientColor  = ambientColor  | vec4.fromValues(0.5, 0.5, 0.5, 1.0);
        this.diffuseColor  = diffuseColor  | vec4.fromValues(0.5, 0.5, 0.5, 1.0);
        this.specularColor = specularColor | vec4.fromValues(1.0, 1.0, 1.0, 1.0);
        this.glossiness    = glossiness    | 0.3;

        if (!PhongShaderMaterial.shaderProgram){
            PhongShaderMaterial.shaderProgram = GlHelper.createShaderProgram(glContext, Material.vertexShaderSource, PhongShaderMaterial.fragmentShaderSource);
        }
    }

    render() {

    }
}

class FlatShadedMaterial extends Material {
    static fragmentShaderSource = `
        uniform highp vec4 color;

        void main() {
            gl_FragColor = color;
        }
    `;

    static shaderProgram = null;

    constructor(glContext, color) {
        super(glContext);

        if (!FlatShadedMaterial.shaderProgram){
            FlatShadedMaterial.shaderProgram = GlHelper.createShaderProgram(glContext, Material.vertexShaderSource, FlatShadedMaterial.fragmentShaderSource);
        }
    }
}

class Camera extends Object3d {
    constructor() {
        super();
        this.viewProjection = new Matrix();
    }
}

class Texture {
    constructor(urlOrData) {

    }
}

class Light extends Object3d {
    constructor() {
        super();
        this.brightness = 1; // brightness is measured in phong shader units, lumen.
        this.shadowMapping = new ShadowMap();
    }
}

class ShadowMap {

}