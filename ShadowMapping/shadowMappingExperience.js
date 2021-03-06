class Experience {
    constructor(glContext) {
        this.gl = glContext;
        this.clearColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
        this.meshes = [];
        this.materials = [];
        this.lights = [];
        this.camera = null;
        this.deltaTime = 16;
        this._showOverlay = false;
        this.overlay = null;
    }

    update(deltaTimeMs) {
        this.deltaTime = deltaTimeMs;
    }

    /**
     * Using the provided light orientation, generate a depth map of the scene from the perspective of the light.
     *
     * adapted from https://learnopengl.com/Advanced-Lighting/Shadows/Shadow-Mapping
     */
    renderShadowMap(light) {
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.cullFace(this.gl.BACK);

        console.log(this.gl.getParameter(this.gl.DEPTH_WRITEMASK));

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, light.getShadowMapFramebuffer());
        this.gl.colorMask(true, true, true, true);
        this.gl.viewport(0, 0, Light.ShadowMapWidth, Light.ShadowMapHeight);


        // clear the depth and color buffers.
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

        // In order to create our shadowMap, we want to pretend that the light is a "camera" into the scene, and render what it "sees".
        // However, we only care about how far all the fragments in "view" are.
        const projectionMatrix = mat4.create();
        const aspect = 1;
        const fieldOfView = light.getAngle() * Math.PI / 180;   // in radians
        mat4.perspective(projectionMatrix,
            fieldOfView,
            aspect,
            0,
            light.getMaxFalloffDistance());

        // TODO: Make this a static reference for our light class?
        const depthTestMaterial = new DepthTestMaterial(this.gl);
        depthTestMaterial.setMaxZ(light.getMaxFalloffDistance());
        const programInfo = depthTestMaterial.loadProgram();

        const viewMatrix = mat4.create();
            mat4.invert(viewMatrix,
            light.getTransform());

        // Set projection matrix and view matrices
        this.gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix
        );

        this.gl.uniformMatrix4fv(
            programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix
        );

        this.meshes.forEach(mesh => {
            mesh.render(programInfo);
        });

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    render() {
        if (this.lights.length > 0) {
            this.renderShadowMap(this.lights[0]);
        }
        this.gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.colorMask(true, true, true, true);

        // set so that we render to the canvas.
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // set default backface culling.
        this.gl.cullFace(this.gl.BACK);

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
            const viewMatrix = mat4.create();
            mat4.invert(viewMatrix,
                        this.camera.getTransform());

            const numComponents = 3;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;

            const material = mesh.material ?? new FlatShadedMaterial(this.gl, vec4.fromValues(0.5, 0.5, 0.5, 1.0));
            const programInfo = material.loadProgram();

            // Set projection matrix and view matrices
            this.gl.uniformMatrix4fv(
                programInfo.uniformLocations.projectionMatrix,
                false,
                projectionMatrix
            );

            this.gl.uniformMatrix4fv(
                programInfo.uniformLocations.viewMatrix,
                false,
                viewMatrix
            );

            // TODO: add support for multiple lights
            // we should keep MAX_LIGHTS * NUM_LIGHT_PROPERIES uniforms to store the light information for each light that affects this mesh.

            // If the current shader program uses lighting uniforms, add this info to the uniform buffer.
            if (programInfo.uniformLocations.lightMatrix && this.lights.length > 0){
                this.gl.uniformMatrix4fv(
                    programInfo.uniformLocations.lightMatrix,
                    false,
                    this.lights[0].getTransform()
                );
            }
            if (programInfo.uniformLocations.lightBrightness && this.lights.length > 0){
                this.gl.uniform1f(
                    programInfo.uniformLocations.lightBrightness,
                    this.lights[0].getBrightness()
                );
            }

            if (programInfo.uniformLocations.shadowMapSampler && this.lights.length > 0){
                // TODO: for now, we are defaulting to using texture slot 0 to store the shadowmap, but this will not scale to support a variable number of lights and material textures.
                // Think of a way to dynamically choose which texture slot to bind as we encounter more textures to bind.
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.lights[0].getShadowMap());
                gl.uniform1i(programInfo.uniformLocations.shadowMapSampler, 0);
            }

            const attributeBuffers = mesh.render(programInfo);
        });

        if (this.overlay && this._showOverlay){
            const programInfo = this.overlay.material.loadProgram();
            this.overlay.render(programInfo);
        }
    }
}

class ShadowMappingExperience extends Experience {
    constructor(glContext) {
        super(glContext);
        this.name = "ShadowMappingExperience";
        console.log("Created" + this.name);

        this.camera = new Camera();
        this.camera.setPosition(0, 5, 10);
        this.camera.setRotationDegrees(-15, 0, 0);

        const box = new BoxMesh(glContext);
        this.meshes.push(box);
        box.setPosition(0, 3, 0);
        box.setRotationDegrees(0, 0, 0);
        box.material = new PhongShaderMaterial(glContext,
            [0.1, 0.0, 0.0, 1.0],
            [0.5, 0.0, 0.0, 1.0],
            [0.5, 0.5, 0.5, 1.0],
            3.0);

        const ground = new GroundPlaneMesh(glContext);
        this.meshes.push(ground);
        ground.setPosition(0, 0, 0);
        ground.setScaling(5, 5, 5);

        const light = new DirectionalLight(glContext);
        const lightLookat = mat4.create();
        const lightPos = vec3.fromValues(-5, 10, 5);
        const lightRot = quat.create();
        light.setPosition(lightPos[0], lightPos[1], lightPos[2]);

        mat4.targetTo(lightLookat, lightPos, box.getPosition(), vec3.fromValues(0, 1, 0));
        mat4.getRotation(lightRot, lightLookat);

        light.setPosition(lightPos[0], lightPos[1], lightPos[2]);
        light.setRotation(lightRot[0], lightRot[1], lightRot[2], lightRot[3]);
        light.setBrightness(1);
        this.lights.push(light);

        this.overlay = new ScreenQuadMesh(glContext, light.getShadowMap());

        let cameraMin = -3;
        let cameraMax = 3;
        let cameraSpeed = 1;
        let lightMin = 0;
        let lightMax = 10;
        let lightSpeed = 10;
        let cameraIncreasing = false;
        let lightIncreasing = false;


        this.update = (deltaTimeMs) => {
            //todo: this should be in the constructor's context
            super.update(deltaTimeMs);

            let doAlternatingXMovement = function (object, minX, maxX, speed, increasing) {
                const position = object.getPosition();
                if (position[0] < minX) {
                    increasing = true;
                }
                else if (position[0] > maxX) {
                    increasing = false;
                }
                position[0] += speed * (deltaTimeMs/1000) * (increasing ? 1 : -1);
                object.setPosition(position[0], position[1], position[2]);
                return increasing;
            }

            cameraIncreasing = doAlternatingXMovement(this.camera, cameraMin, cameraMax, cameraSpeed, cameraIncreasing);
            lightIncreasing = doAlternatingXMovement(light, lightMin, lightMax, lightSpeed, lightIncreasing);

            mat4.targetTo(lightLookat, light.getPosition(), box.getPosition(), vec3.fromValues(0, 1, 0));
            mat4.getRotation(lightRot, lightLookat);
            light.setRotation(lightRot[0], lightRot[1], lightRot[2], lightRot[3]);
        }

        window.addEventListener("keyup", (event) => {
            if (event.key === "Enter"){
                this._showOverlay = !this._showOverlay;
                console.log("Switching to " + (this._showOverlay ? "shadowMap" : "camera") + " view.");
            }
          }, true);
    }

    render() {
        super.render();
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

    //
    // Initialize a texture and load an image.
    // When the image finished loading copy it into the texture.
    //
    // sourced from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
    //
    static loadTexture(gl, url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Because images have to be downloaded over the internet
        // they might take a moment until they are ready.
        // Until then put a single pixel in the texture so we can
        // use it immediately. When the image has finished downloading
        // we'll update the texture with the contents of the image.
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    width, height, border, srcFormat, srcType,
                    pixel);

        const image = new Image();
        image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        srcFormat, srcType, image);

        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (GlHelper.isPowerOf2(image.width) && GlHelper.isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        };
        image.src = url;

        return texture;
    }

    static isPowerOf2(value) {
        return (value & (value - 1)) == 0;
    }

}

class Object3d {
    constructor(glContext) {
        this._transform = mat4.create();
        this._position = vec3.create();
        this._rotation = quat.create();
        this._scaling = vec3.fromValues(1.0, 1.0, 1.0);
        this.gl = glContext;
    }

    getTransform(){
        if (this._isDirty) {
            mat4.fromRotationTranslationScale(this._transform, this._rotation, this._position, this._scaling);
            this._isDirty = false;
        }
        return this._transform;
    }

    getPosition(){
        return this._position;
    }

    setPosition(x, y, z) {
        this._isDirty = true;
        this._position[0] = x; // m30
        this._position[1] = y; // m31
        this._position[2] = z; // m32
    }

    setRotationDegrees(x, y, z){
        this._isDirty = true;
        quat.fromEuler(this._rotation, x, y, z);
    }

    getRotation(){
        return this._rotation;
    }

    setRotation(x, y, z, w) {
        this._isDirty = true;
        this._rotation[0] = x;
        this._rotation[1] = y;
        this._rotation[2] = z;
        this._rotation[3] = w;
    }

    getScaling(){
        return this._scaling;
    }

    setScaling(x, y, z){
        this._isDirty = true;
        this._scaling[0] = x;
        this._scaling[1] = y;
        this._scaling[2] = z;
    }
}

class Mesh extends Object3d {
    constructor(glContext) {
        super(glContext);
        this.vertices = [];
        this.normals = [];
        this.uvs = [];
        this.indices = [];
        this.colors = [];
        this.triangleDrawMode = glContext.TRIANGLES;
        this.vertexBuffers = {};
        this.material = new PhongShaderMaterial(glContext,
                                                [0.1, 0.1, 0.1, 1.0],
                                                [0.5, 0.5, 0.5, 1.0],
                                                [1.0, 1.0, 1.0, 1.0],
                                                0.3);
    }

    _init(){
        // vertex positions
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,
            new Float32Array(this.vertices),
            this.gl.STATIC_DRAW);

        // triangle indices
        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(this.indices), this.gl.STATIC_DRAW);

        // vertex normals
        const normalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,
            new Float32Array(this.normals),
            this.gl.STATIC_DRAW);

        // vertex UVs
        const uvBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,
                new Float32Array(this.uvs),
                this.gl.STATIC_DRAW);

        // vertex colors
        const colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,
                new Float32Array(this.colors),
                this.gl.STATIC_DRAW);

        this.vertexBuffers["position"] = positionBuffer;
        this.vertexBuffers["normal"] = normalBuffer;
        this.vertexBuffers["uv"] = uvBuffer;
        this.vertexBuffers["index"] = indexBuffer;
        this.vertexBuffers["color"] = colorBuffer;
    }

    render(programInfo) {
        if (programInfo.uniformLocations.modelMatrix) {
            this.gl.uniformMatrix4fv(
                programInfo.uniformLocations.modelMatrix,
                false,
                this.getTransform()
            );
        }

        // Vertex attribute buffer binding
        // Position Buffer
        if (programInfo.attribLocations.vertexPosition !== undefined){
            const numComponents = 3; // 3d vertex position vector
            const type = this.gl.FLOAT;   // for now, only support floating point vertex formats
            const normalize = false;
            const stride = 0;
            const offset = 0;

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffers["position"]);

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
        }

        // Normal Buffer
        if (programInfo.attribLocations.vertexNormal !== undefined) {
            const numComponents = 3
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffers["normal"]);
            this.gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            this.gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexNormal
            );
        }

        // UV Buffer
        if (programInfo.attribLocations.vertexUV !== undefined) {
            const numComponents = 2
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffers["uv"]);
            this.gl.vertexAttribPointer(
                programInfo.attribLocations.vertexUV,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            this.gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexUV
            );
        }

        // Color Buffer
        if (programInfo.attribLocations.vertexColor !== undefined) {
            const numComponents = 4;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffers["color"]);
            this.gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            this.gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexColor
            );
        }

        // Indices Buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexBuffers["index"]);

        this.gl.drawElements(this.triangleDrawMode, this.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }
}

class BoxMesh extends Mesh {
    constructor(glContext) {
        super(glContext);
        /**
         * box geometry borrowed from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Creating_3D_objects_using_WebGL
         */
        this.vertices = [
            // Front face
            -0.5, -0.5,  0.5,
             0.5, -0.5,  0.5,
             0.5,  0.5,  0.5,
            -0.5,  0.5,  0.5,

            // Back face
            -0.5, -0.5, -0.5,
            -0.5,  0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5, -0.5, -0.5,

            // Top face
            -0.5,  0.5, -0.5,
            -0.5,  0.5,  0.5,
             0.5,  0.5,  0.5,
             0.5,  0.5, -0.5,

            // Bottom face
            -0.5, -0.5, -0.5,
             0.5, -0.5, -0.5,
             0.5, -0.5,  0.5,
            -0.5, -0.5,  0.5,

            // Right face
             0.5, -0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5,  0.5,  0.5,
             0.5, -0.5,  0.5,

            // Left face
            -0.5, -0.5, -0.5,
            -0.5, -0.5,  0.5,
            -0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5,
          ];

        this.normals = [
            // Front
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,

            // Back
            0.0,  0.0, -1.0,
            0.0,  0.0, -1.0,
            0.0,  0.0, -1.0,
            0.0,  0.0, -1.0,

            // Top

            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0,

            // Bottom
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,

            // Right
            1.0,  0.0,  0.0,
            1.0,  0.0,  0.0,
            1.0,  0.0,  0.0,
            1.0,  0.0,  0.0,

            // Left
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0
            ];
        this.indices = [
                0,  1,  2,      0,  2,  3,    // front
                4,  5,  6,      4,  6,  7,    // back
                8,  9,  10,     8,  10, 11,   // top
                12, 13, 14,     12, 14, 15,   // bottom
                16, 17, 18,     16, 18, 19,   // right
                20, 21, 22,     20, 22, 23,   // left
              ];
        this.triangleDrawMode = glContext.TRIANGLES;

        this._init();
    }
}

class PlaneMesh extends Mesh {
    constructor(glContext) {
        super(glContext);
        this.vertices = [
            1, 1, 0.0, // top right
            0, 1, 0.0, // bottom right
            1, 0, 0.0, // top left
            0, 0, 0.0  // bottom left
        ];
        this.normals = [
            0.0,  0.0,  1.0, // pointing towards +Z
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
        ]
        this.uvs = [
            1.0, 1.0,
            1.0, 0.0,
            0.0, 1.0,
            0.0, 0.0
        ]
        this.colors = [
            1.0, 0.0, 0.0, 1.0,
            0.0, 1.0, 0.0, 1.0,
            0.0, 0.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
        ]
        this.indices = [0, 1, 2,  0, 2, 1,
                        2, 1, 3,  2, 3, 1];
        this.triangleDrawMode = glContext.TRIANGLES;
        this._init();
    }
}

class ScreenQuadMesh extends PlaneMesh {
    constructor(glContext, texture) {
        super(glContext);

        this.material = new ScreenQuadMaterial(glContext, texture);
        this._transform2d = mat3.create();
    }

    getTransform(){
        const isDirty = this._isDirty;
        super.getTransform();

        if(isDirty){
            mat3.identity(this._transform2d);
            mat3.scale(this._transform2d, this._transform2d, vec2.fromValues(this._scaling[0], this._scaling[1]));
            mat3.rotate(this._transform2d, this._transform2d, quat.getAxisAngle(vec3.fromValues(0, 0, 1), this._rotation));
            mat3.translate(this._transform2d, this._transform2d, vec2.fromValues(this._position[0], this._position[1]));
        }
        return this._transform2d;
    }

    render(programInfo) {
        if (programInfo.uniformLocations.transform2d) {
            this.gl.uniformMatrix3fv(
                programInfo.uniformLocations.transform2d,
                false,
                this.getTransform()
            );
        }

        // Vertex attribute buffer binding
        // Position Buffer
        if (programInfo.attribLocations.vertexPosition !== undefined){
            const numComponents = 3; // 3d vertex position vector
            const type = this.gl.FLOAT;   // for now, only support floating point vertex formats
            const normalize = false;
            const stride = 0;
            const offset = 0;

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffers["position"]);

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
        }

        // Normal Buffer
        if (programInfo.attribLocations.vertexNormal !== undefined) {
            const numComponents = 3
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffers["normal"]);
            this.gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            this.gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexNormal
            );
        }

        // UV Buffer
        if (programInfo.attribLocations.vertexUV !== undefined) {
            const numComponents = 2
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffers["uv"]);
            this.gl.vertexAttribPointer(
                programInfo.attribLocations.vertexUV,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            this.gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexUV
            );
        }

        // Color Buffer
        if (programInfo.attribLocations.vertexColor !== undefined) {
            const numComponents = 4;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffers["color"]);
            this.gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            this.gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexColor
            );
        }

        // Indices Buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexBuffers["index"]);

        this.gl.drawElements(this.triangleDrawMode, this.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }
}

/**
 * A GroundPlaneMesh is similar to a Plane Mesh, except with vertices defined such that
 */
class GroundPlaneMesh extends Mesh {
    constructor(glContext) {
        super(glContext);
        this.vertices = [
            -0.5,  0.0,  0.5, // front left
             0.5,  0.0,  0.5, // front right
            -0.5,  0.0, -0.5, // back left
             0.5,  0.0, -0.5  // back right
       ];
       this.normals = [
           0.0,  1.0,  0.0, // pointing towards +Y
           0.0,  1.0,  0.0,
           0.0,  1.0,  0.0,
           0.0,  1.0,  0.0,
       ]
       this.indices = [0, 1, 2,   0, 2, 1,
                       2, 1, 3,   2, 3, 1];
       this.triangleDrawMode = glContext.TRIANGLES;
       this._init();
    }
}

class Material {
    /**
     * Vertex shader source courtesy of MDN WebGL tutorial:
     * https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
     *
     */
    static vertexShaderSource = `
        precision highp float;

        attribute vec4 aVertexPosition;
        attribute vec4 aVertexNormal;
        attribute vec2 aVertexUv;

        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform mat4 uProjectionMatrix;

        varying vec4 vVertexNormal;
        varying vec2 vVertexUv;

        varying vec4 vViewPosition;     // where is the view in worldspace?

        varying vec4 vModelPosition;    // where is the vertex in the model's space?
        varying vec4 vWorldPosition;    // where is this vert in worldspace?
        varying vec4 vWorldNormal;      // where is this normal pointing in worldspace?
        varying vec4 vCameraPosition;   // where is this vert in cameraspace?
        varying vec4 vClipPosition;     // where is this vert in clipspace?

        void main() {
            vModelPosition = vec4(aVertexPosition.xyz, 1.0);
            vVertexNormal = aVertexNormal;
            vVertexUv = aVertexUv;
            vWorldPosition = uModelMatrix * vModelPosition;
            vWorldNormal =  vec4(mat3(uModelMatrix) * vVertexNormal.xyz, 0.0);
            vCameraPosition = uViewMatrix * vWorldPosition;
            vClipPosition = uProjectionMatrix * vCameraPosition;
            vViewPosition = uViewMatrix[3]; // Remember, we are column major, so column values are Right, Up, Forward, Translation

            gl_Position = vClipPosition;
        }
    `;

    constructor(glContext) {
        this.gl = glContext;
    }
}

class DepthTestMaterial extends Material {
    constructor(glContext, ambientColor, diffuseColor, specularColor, glossiness) {
        super(glContext);

        if (!DepthTestMaterial.shaderProgram) {
            DepthTestMaterial.shaderProgram = GlHelper.createShaderProgram(glContext, Material.vertexShaderSource, DepthTestMaterial.fragmentShaderSource);
        }
        this._maxZ = 255.0;
    }

    static fragmentShaderSource = `
        precision highp float;

        varying vec4 vViewPosition;     // where is the view in worldspace?

        varying vec4 vModelPosition;    // where is the vertex in the model's space?
        varying vec4 vWorldPosition;    // where is this vert in worldspace?
        varying vec4 vCameraPosition;   // where is this vert in cameraspace?
        varying vec4 vClipPosition;     // where is this vert in clipspace?

        uniform float uMaxZ;

        void main() {
            vec3 dist = vWorldPosition.xyz;
            //float normDist = dist;
            gl_FragColor = vec4( dist.x, dist.y, dist.z, 1.0);
        }
    `

    static shaderProgram = null;

    setMaxZ (maxZ){
        this._maxZ = maxZ;
    }

    loadProgram() {
        const shaderProgram = DepthTestMaterial.shaderProgram;
        this.gl.useProgram(shaderProgram);
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                vertexNormal: this.gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
                vertexUv: this.gl.getAttribLocation(shaderProgram, 'aVertexUv')
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelMatrix:  this.gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                viewMatrix:  this.gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                maxZ: this.gl.getUniformLocation(shaderProgram, 'uMaxZ'),
            },
        };

        if (programInfo.uniformLocations.maxZ && this._maxZ){
            // setup texture sampler to be projected onto the quad
            this.gl.uniform1f(programInfo.uniformLocations.maxZ, this._maxZ);
        }

        return programInfo;
    }
}

class ScreenQuadMaterial extends Material {
    constructor(glContext, texture){
        super(glContext);

        this._texture = texture;

        if (!ScreenQuadMaterial.shaderProgram) {
            ScreenQuadMaterial.shaderProgram = GlHelper.createShaderProgram(glContext, ScreenQuadMaterial.vertexShaderSource, ScreenQuadMaterial.fragmentShaderSource);
        }
    }

    static vertexShaderSource = `
        precision highp float;

        attribute vec2 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat3 uTransform2d;

        varying vec2 vVertexUv;
        varying vec4 vColor;

        void main() {
            vec2 vertPos = aVertexPosition - vec2(0.5, 0.5); // move from 0->1 to -0.5-> 0.5;
            vertPos *= 2.0; // -0.5->0.5 to -1->1;
            gl_Position = vec4(uTransform2d * vec3(vertPos, 0.0), 1.0);

            // Use vertex position as our texture coordinates, since this is intended for a unit quad.
            vVertexUv = aVertexPosition;
            vColor = aVertexColor;
        }
    `;

    static fragmentShaderSource = `
        precision highp float;

        uniform sampler2D uTexture;

        varying vec2 vVertexUv;
        varying vec4 vColor;

        void main() {
            vec3 texPixel = texture2D(uTexture, vVertexUv).xyz;
            gl_FragColor = vec4(texPixel.x > 0.99, texPixel.y > 0.99, texPixel.z > 0.99, 1.0);
        }
    `;

    static shaderProgram = null;

    loadProgram() {
        const shaderProgram = ScreenQuadMaterial.shaderProgram;
        this.gl.useProgram(shaderProgram);
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                vertexColor: this.gl.getAttribLocation(shaderProgram, 'aVertexColor')
            },
            uniformLocations: {
                transform2d:  this.gl.getUniformLocation(shaderProgram, 'uTransform2d'),
                texture:  this.gl.getUniformLocation(shaderProgram, 'uTexture'),
            },
        };

        if (programInfo.uniformLocations.texture && this._texture){
            // setup texture sampler to be projected onto the quad
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this._texture);
            this.gl.uniform1i(programInfo.uniformLocations.texture, 0);
        }

        return programInfo;
    }
}

class PhongShaderMaterial extends Material {

    /**
     * Phong reflection model adapted from: https://en.wikipedia.org/wiki/Phong_reflection_model
     * Phong reflection model checked for correctness against: https://www.mathematik.uni-marburg.de/~thormae/lectures/graphics1/code/WebGLShaderLightMat/ShaderLightMat.html
     */
    static fragmentShaderSource = `
        precision highp float;

        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform vec4 uAmbientColor;
        uniform vec4 uDiffuseColor;
        uniform vec4 uSpecularColor;
        uniform float uGlossiness;
        uniform mat4 uLightMatrix;
        uniform float uLightBrightness;
        uniform sampler2D uShadowMapSampler;


        varying vec4 vViewPosition;     // where is the view in worldspace?

        varying vec4 vModelPosition;    // where is the vertex in the model's space?
        varying vec4 vWorldPosition;    // where is this vert in worldspace?
        varying vec4 vWorldNormal;      // where does this normal point in worldspace?
        varying vec4 vCameraPosition;   // where is this vert in cameraspace?
        varying vec4 vClipPosition;     // where is this vert in clipspace?

        vec3 phongBrdf(vec3 vR, vec3 vV, vec3 diffuseColor, vec3 specularColor, float glossiness) {
            vec3 color = diffuseColor;
            float specularPercentage = max(dot(vR, vV), 0.0);
            float specularIntensity = 1.0;//pow(specularPercentage, max(uGlossiness, 0.0));
            return color + (specularColor * specularIntensity); //TODO: fix specular reflection...
        }

        float lightIntensity(float cameraDistance){
            return 40.0/pow(cameraDistance, 2.0);
        }

        void main() {
            vec3  vLightPos = uLightMatrix[3].xyz; // remember, we are column major. Transform columns are Right, Up, Forward, Position

            vec3  vN = normalize(vWorldNormal.xyz);
            vec3  vL = normalize(vLightPos - vec3(vWorldPosition));
            vec3  vR = reflect(-vL, vN);
            vec3  vV = normalize(-vCameraPosition.xyz);

            vec3 luminance = uAmbientColor.xyz;
            float illuminance = dot(vL, vN) * lightIntensity(length(vCameraPosition.xyz));
            if (illuminance > 0.0){
                vec3 brdfColor = phongBrdf(vR, vV, uDiffuseColor.rgb, uSpecularColor.rgb, uGlossiness);
                luminance += brdfColor * illuminance * vec3(1.0, 1.0, 1.0); // for now, use white light.
            }

            gl_FragColor = vec4(luminance, 1.0);
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
                vertexNormal: this.gl.getAttribLocation(shaderProgram, 'aVertexNormal')
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelMatrix:  this.gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                viewMatrix:  this.gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                ambientColor:  this.gl.getUniformLocation(shaderProgram, 'uAmbientColor'),
                diffuseColor:  this.gl.getUniformLocation(shaderProgram, 'uDiffuseColor'),
                specularColor:  this.gl.getUniformLocation(shaderProgram, 'uSpecularColor'),
                lightMatrix:  this.gl.getUniformLocation(shaderProgram, 'uLightMatrix'),
                lightBrightness:  this.gl.getUniformLocation(shaderProgram, 'uLightBrightness'),
                shadowMapSampler: this.gl.getUniformLocation(shaderProgram, 'uShadowMapSampler'),
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
        precision highp float;

        uniform vec4 uColor;
        uniform sampler2D uColorTexture;
        varying vec2 vTextureCoord;

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
        this.gl.useProgram(shaderProgram);
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelMatrix:  this.gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                viewMatrix:  this.gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                color:  this.gl.getUniformLocation(shaderProgram, 'uColor'),
                colorTexture: this.gl.getUniformLocation(shaderProgram, 'uColorTexture'),
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
    constructor(glContext, castShadow) {
        super(glContext);
        this._brightness = 1; // brightness is measured in phong shader units, lumen.
        this._angle = 45; // for now, emulate a spot light
        this._maxFalloffDistance = 50;
        this._shadowMap = null;
        this._colorMap = null;
        this._shadowMapFramebuffer;

        this._init();
    }

    _init(){
        // initialize shadow map buffers.
        this._colorMap = this.gl.createTexture();
        // set a texture slot to use this depthmap texture.
        this.gl.bindTexture(this.gl.TEXTURE_2D, this._colorMap);

        // Configure our depth map settings...
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, Light.ShadowMapWidth, Light.ShadowMapHeight, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

        // TODO: this should be created once at light creation...
        this._shadowMap = this.gl.createTexture();

        // set a texture slot to use this depthmap texture.
        this.gl.bindTexture(this.gl.TEXTURE_2D, this._shadowMap);

        // Configure our depth map settings...
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT16 , Light.ShadowMapWidth, Light.ShadowMapHeight, 0, this.gl.DEPTH_COMPONENT , this.gl.UNSIGNED_SHORT, null);


        this._shadowMapFramebuffer = this.gl.createFramebuffer();

        // bind this texture to be used as our framebuffer if we are rendering to the shadowmap instead of the canvas.
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._shadowMapFramebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this._shadowMap, 0);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this._colorMap, 0);

        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.log("The created frame buffer is invalid: " + status.toString());
        }

        // switch back to default backbuffer.
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    render() {

    }

    getAngle(){
        return this._angle;
    }

    setAngle(angle){
        this.angle = angle;
    }

    setBrightness(brightness) {
        this._brightness = brightness;
    }

    getBrightness(brightness) {
        return this._brightness;
    }

    setShadowMap(shadowMap) {
        this._shadowMap = shadowMap;
    }

    getShadowMap() {
        return this._shadowMap;
    }

    getColorMap() {
        return this._colorMap;
    }

    getShadowMapFramebuffer() {
        return this._shadowMapFramebuffer;
    }

    getMaxFalloffDistance() {
        return this._maxFalloffDistance;
    }

    setMaxFalloffDistance(distance) {
        this._maxFalloffDistance = distance;
    }

    static ShadowMapWidth = 1024
    static ShadowMapHeight = 1024
}

class DirectionalLight extends Light {
    constructor(glContext, castShadow){
        super(glContext, castShadow);
    }

    render(){

    }
}