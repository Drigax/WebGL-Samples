/*
 * I suppose some description of this file should go here...
 * This file is essentially main(), here we setup our rendering context for the experience to use, and setup a render loop...
 *
*/

function main() {
    // Retrieve the rendering canvas reference we will be drawing to.
    const canvas = document.getElementById("renderingCanvas");
    if (!canvas) {
        console.error("Unable to find rendering canvas! exiting...");
        return;
    }

    // Get rendering context
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("Unable to retreive webGL2 rendering context! exiting...");
        return;
    }

    const fpsTextField = document.getElementById("fpsCounter");
    if (!fpsTextField){
        console.warn("Unable to find FPS counter element.");
    }

    let fps = 60;

    console.log("ShadowMapping - main()!");
    // Set clear color to black.
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    console.log("clearing scene...");
    gl.clear(gl.COLOR_BUFFER_BIT);


    fpsTextField.textContent = fps + " FPS";
}

window.onload = main;