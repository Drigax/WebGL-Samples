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
    const glContext = canvas.getContext("webgl2");
    if (!glContext) {
        console.error("Unable to retreive webGL2 rendering context! exiting...");
        return;
    }

    const fpsTextField = document.getElementById("fpsCounter");
    if (!fpsTextField){
        console.warn("Unable to find FPS counter element.");
    }

    let lastFrameTime = window.performance.now();
    let currentFrameTime = 0;
    let fps = 0;
    let frameCount = 0;
    let fpsUpdateFrameCount = 60;

    // Simple lambda that will update our FPS ticker, and tell our render loop how long to wait until rendering the next frame.
    // returns milisecond difference since previous frame.
    const updateFps = () => {
        frameCount++;
        const diff = currentFrameTime - lastFrameTime;
        lastFrameTime = currentFrameTime;
        currentFrameTime = window.performance.now();
        if (frameCount >= fpsUpdateFrameCount){
            console.log("difference between frames: " + diff);
            fps = 1/(diff/1000);
            fpsTextField.textContent = parseFloat(fps).toFixed(0) + " FPS";
            frameCount = 0;
        }
        return diff;
    }

    console.log("ShadowMapping - main()!");

    // Set clear color to black.
    glContext.clearColor(0.0, 0.0, 0.0, 1.0);

    console.log("clearing scene...");
    glContext.clear(glContext.COLOR_BUFFER_BIT);

    let experience = new ShadowMappingExperience(glContext);

    const renderNextFrame = () => {
        const diff = updateFps();
        setTimeout(() => {
            experience.update(diff);
            startRender(glContext);
            experience.render();
            renderNextFrame();
        }, Math.max(16.0 - (diff/1000.0), 0.0)); //Limit to ~60 FPS
    }

    renderNextFrame();
}

function startRender(glContext) {
    // Set clear color to black.
    glContext.clearColor(0.0, 0.0, 0.0, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT);
}

window.onload = main;