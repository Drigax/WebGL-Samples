class Experience {
    constructor(glContext) {
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

        // calculate projection matrix for the main camera.
        const fieldOfView = this.camera.fov * Math.PI / 180;   // in radians
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        const projectionMatrix = mat4.create();

        mat4.perspective(projectionMatrix,
            fieldOfView,
            aspect,
            this.camera.nearClippingPlane,
            this.camera.farClippingPlane);

        this.meshes.forEach(mesh => {
            const modelViewMatrix = mat4.create();
            mat4.translate(modelViewMatrix,
                           modelViewMatrix,
                           [-0.0, 0.0, -6.0]);

            const numComponents = 3;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;

            const material = mesh.material ?? new FlatShadedMaterial(this.gl, vec4.fromValues(0.5, 0.5, 0.5, 1.0));
            const programInfo = material.loadProgram();

            // Set projection matrix and model view matrices
            this.gl.uniformMatrix4fv(
                programInfo.uniformLocations.projectionMatrix,
                false,
                projectionMatrix
            );

            this.gl.uniformMatrix4fv(
                programInfo.uniformLocations.modelViewMatrix,
                false,
                modelViewMatrix
            );

            const attributeBuffers = mesh.render(programInfo);
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
    constructor(glContext) {
        super(glContext);
        this.name = "ShadowMappingExperience";
        console.log("Created" + this.name);

        this.camera = new Camera();
        this.camera.setPosition(0, 5, -10);

        const box = new BoxMesh(glContext);
        this.meshes.push(box);
        box.setPosition(0, 2, 0);
        box.material = new PhongShaderMaterial(glContext,
            [0.5, 0.0, 0.0, 1.0],
            [0.5, 0.0, 0.0, 1.0],
            [0.5, 0.5, 0.5, 1.0],
            0.3);

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

class Object3d {
    constructor(glContext) {
        this.transform = mat4.create();
        this.gl = glContext;
    }

    setPosition(x, y, z) {
        this.transform[12] = x; // m30
        this.transform[13] = y; // m31
        this.transform[14] = z; // m32
    }
}

class Mesh extends Object3d {
    constructor(glContext) {
        super(glContext);
        this.vertices = [];
        this.indices = [];
        this.triangleDrawMode = glContext.TRIANGLES;
        this.material = new PhongShaderMaterial(glContext,
            vec4.fromValues(0.5, 0.5, 0.5, 1.0),
            vec4.fromValues(0.5, 0.5, 0.5, 1.0),
            vec4.fromValues(1.0, 1.0, 1.0, 1.0),
            0.3
        );
    }

    render(programInfo) {
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

        this.gl.bufferData(this.gl.ARRAY_BUFFER,
            new Float32Array(this.vertices),
            this.gl.STATIC_DRAW);

        const numComponents = 3; // 3d vertex position vector
        const type = this.gl.FLOAT;   // for now, only support floating point vertex formats
        const normalize = false;
        const stride = 0;
        const offset = 0;

        this.gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        this.gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition
        );

        const vertexCount = this.vertices.length / numComponents;
        this.gl.drawArrays(this.triangleDrawMode, offset, vertexCount);
    }
}

class BoxMesh extends Mesh {
    constructor(glContext) {
        super(glContext);
        this.vertices = [
        -0.5, 0.5, 0.5,
        -0.5, -0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, -0.5, 0.5,
        0.5, 0.5, -0.5,
        0.5, -0.5, -0.5,
        -0.5, 0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5, 0.5, 0.5,
        -0.5, -0.5, 0.5
        ];
        this.indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.triangleDrawMode = glContext.TRIANGLE_STRIP;
    }
}

class PlaneMesh extends Mesh {
    constructor(glContext) {
        super(glContext);
        this.vertices = [
            0.5, 0.5, 0.0,
            -0.5, 0.5, 0.0,
            0.5, -0.5, 0.0,
            -0.5, -0.5, 0.0
        ];
        this.indices = [0, 1, 2, 3];
        this.triangleDrawMode = glContext.TRIANGLE_STRIP;
    }
}

/**
 * A GroundPlaneMesh is similar to a Plane Mesh, except with vertices defined such that
 */
class GroundPlaneMesh extends Mesh {
    constructor(glContext) {
        super(glContext);
        this.vertices = [
            -0.5, 0.0, 0.5,
            0.5, 0.0, 0.5,
            -0.5, 0.0, -0.5,
            0.5, 0.0, -0.5
        ];
        this.indices = [0, 1, 2, 3];
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

        void main() {
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
        uniform highp vec4 uAmbientColor;
        uniform highp vec4 uDiffuseColor;
        uniform highp vec4 uSpecularColor;
        uniform highp vec4 uGlossiness;

        void main() {
            gl_FragColor = uAmbientColor;
        }
    `;

    static shaderProgram = null;

    constructor(glContext, ambientColor, diffuseColor, specularColor, glossiness) {
        super(glContext);

        this.ambientColor   = ambientColor  ?? vec4.fromValues(0.5, 0.5, 0.5, 1.0);
        this.diffuseColor   = diffuseColor  ?? vec4.fromValues(0.5, 0.5, 0.5, 1.0);
        this.specularColor  = specularColor ?? vec4.fromValues(1.0, 1.0, 1.0, 1.0);
        this.glossiness     = glossiness    ?? 0.3;

        if (!PhongShaderMaterial.shaderProgram) {
            PhongShaderMaterial.shaderProgram = GlHelper.createShaderProgram(glContext, Material.vertexShaderSource, PhongShaderMaterial.fragmentShaderSource);
        }
    }

    loadProgram() {
        const shaderProgram = PhongShaderMaterial.shaderProgram;
        this.gl.useProgram(shaderProgram);
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix:  this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                ambientColor:  this.gl.getUniformLocation(shaderProgram, 'uAmbientColor'),
                diffuseColor:  this.gl.getUniformLocation(shaderProgram, 'uDiffuseColor'),
                specularColor:  this.gl.getUniformLocation(shaderProgram, 'uSpecularColor'),
                glossiness:  this.gl.getUniformLocation(shaderProgram, 'uGlossiness'),
            },
        };

        // set uniform values.
        this.gl.uniform4fv(
            programInfo.uniformLocations.ambientColor,
            this.ambientColor
        );
        this.gl.uniform4fv(
            programInfo.uniformLocations.diffuseColor,
            this.diffuseColor
        );
        this.gl.uniform4fv(
            programInfo.uniformLocations.specularColor,
            this.specularColor
        );
        this.gl.uniform1f(
            programInfo.uniformLocations.glossiness,
            this.glossiness
        );

        return programInfo;
    }
}

class FlatShadedMaterial extends Material {
    static fragmentShaderSource = `
        uniform highp vec4 uColor;

        void main() {
            gl_FragColor = uColor;
        }
    `;

    static shaderProgram = null;

    constructor(glContext, color) {
        super(glContext);

        this.color = color ?? vec4.fromValues(0.5, 0.5, 0.5, 1.0);

        if (!FlatShadedMaterial.shaderProgram) {
            FlatShadedMaterial.shaderProgram = GlHelper.createShaderProgram(glContext, Material.vertexShaderSource, FlatShadedMaterial.fragmentShaderSource);
        }
    }

    loadProgram() {
        const shaderProgram = FlatShadedMaterial.shaderProgram;
        this.gl.loadProgram(shaderProgram);
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix:  this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                color:  this.gl.getUniformLocation(shaderProgram, 'uColor'),
            },
        };

        // set uniform values.
        this.gl.uniform4fv(
            programInfo.uniformLocations.color,
            this.color
        );

        return programInfo;
    }
}

class Camera extends Object3d {
    constructor() {
        super();
        this.viewProjection = mat4.create();
        this.fov = 45;
        this.nearClippingPlane = 0.1;
        this.farClippingPlane = 2000;
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