"use strict";

var vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;

// Used to pass in the resolution of the canvas
uniform vec2 u_resolution;

// all shaders have a main function
void main() {

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = a_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

var fragmentShaderSource = `#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

out vec4 frag_color;

uniform vec2 u_resolution;
uniform vec2 u_zoom;
uniform vec2 u_center;

#define MAX_ITERATIONS 1000

int get_iterations()
{
    vec2 c = (gl_FragCoord.xy - u_resolution.xy / 2.0) / (u_resolution.y / u_zoom.y) + u_center;
    float real = c.x;
    float imag = c.y;
 
    int iterations = 0;
    float const_real = real;
    float const_imag = imag;

    float real2 = real * real;
    float imag2 = imag * imag;
 
    for (int i = 0; i < MAX_ITERATIONS; i++)
    {
        imag = (real + real) * imag + const_imag;
        real = real2 - imag2 + const_real;
        real2 = real * real;
        imag2 = imag * imag;  

        if (real2 + imag2 > 4.0)
            return i;
    }
    return MAX_ITERATIONS;
}
vec4 return_color()
{
    int iter = get_iterations();
    if (iter == MAX_ITERATIONS)
    {
        gl_FragDepth = 0.0f;
        return vec4(0.0f, 0.0f, 0.0f, 1.0f);
    }
 
    int iterations = iter % 12;    
    if (iterations == 0) {
      return vec4(1.0f, 0.0f, 0.0f, 1.0f);
    }
    else if (iterations == 1) {
      return vec4(1.0f, 0.27058825f, 0.0f, 1.0f);
    }
    else if (iterations == 2) {
      return vec4(1.0f, 0.64705884f, 0.0f, 1.0f);
    }
    else if (iterations == 3) {
      return vec4(1.0f, 0.84313726f, 0.0f, 1.0f);
    }
    else if (iterations == 4) {
      return vec4(1.0f, 1.0f, 0.0f, 1.0f);
    }
    else if (iterations == 5) {
      return vec4(0.6039216f, 0.8039216f, 0.19607843f, 1.0f);
    }
    else if (iterations == 6) {
      return vec4(0.0f, 0.5019608f, 0.0f, 1.0f);
    }
    else if (iterations == 7) {
      return vec4(0.0f, 0.54509807f, 0.54509807f, 1.0f);
    }
    else if (iterations == 8) {
      return vec4(0.0f, 0.0f, 1.0f, 1.0f);
    }
    else if (iterations == 9) {
      return vec4(0.41568628f, 0.3529412f, 0.8039216f, 1.0f);
    }
    else if (iterations == 10) {
      return vec4(0.5019608f, 0.0f, 0.5019608f, 1.0f);
    }
    else if (iterations == 11) {
      return vec4(0.78039217f, 0.08235294f, 0.52156866f, 1.0f);
    }
}
 
void main()
{
    frag_color = return_color();
}
`;

let zoom = 2;
let center = [-0.5, 0];

function main() {
  // Get A WebGL context
  var canvas = document.querySelector("#canvas");

  let drawScene = configureGL(canvas);
  addControls(canvas, drawScene);
  
  drawScene();

}

function addControls(canvas, drawScene) {
  canvas.addEventListener('keydown', (e) => {
    if(e.key == 'ArrowUp'){
      center[1] += 0.1*zoom;
    }
    else if(e.key == 'ArrowDown'){
      center[1] -= 0.1*zoom;
    }
    else if(e.key == 'ArrowLeft'){
      center[0] -= 0.1*zoom;
    }
    else if(e.key == 'ArrowRight'){
      center[0] += 0.1*zoom;
    }
    else if(e.key == 'w'){
      zoom /= 1.1;
    }
    else if(e.key == 's'){
      zoom *= 1.1;
    }
    drawScene();
  });
}

function configureGL(canvas){
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // Use our boilerplate utils to compile the shaders and link into a program
  var program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);

  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  // look up uniform locations
  var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  var zoomUniformLocation = gl.getUniformLocation(program, "u_zoom");
  var centerUniformLocation = gl.getUniformLocation(program, "u_center");

  // Create a buffer and put a single pixel space rectangle in
  // it (2 triangles)
  // Create a buffer and put three 2d clip space points in it
  var positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  var positions = [
    0, 0,
    window.innerWidth, 0,
    0, window.innerHeight,
    0, window.innerHeight,
    window.innerWidth, 0,
    window.innerWidth, window.innerHeight,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create a vertex array object (attribute state)
  var vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset);

    gl.disable(gl.DITHER);

  function drawScene(){

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // Pass in the canvas resolution so we can convert from
    // pixels to clipspace in the shader
    gl.uniform2f(resolutionUniformLocation, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.uniform2f(zoomUniformLocation, zoom, zoom);
    gl.uniform2f(centerUniformLocation, center[0], center[1]);

    // draw
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  }

  return drawScene;
}

main();
