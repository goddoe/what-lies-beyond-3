import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Custom scanline + glitch shader
const GlitchScanlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    scanlineIntensity: { value: 0.05 },
    glitchIntensity: { value: 0.0 },
    noiseIntensity: { value: 0.0 },
    pixelSize: { value: 0.0 },
    colorShift: { value: 0.0 },
    brightness: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float scanlineIntensity;
    uniform float glitchIntensity;
    uniform float noiseIntensity;
    uniform float pixelSize;
    uniform float colorShift;
    uniform float brightness;
    varying vec2 vUv;

    float random(vec2 st) {
      return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      // Pixelation (Era 3: Minecraft style)
      if (pixelSize > 0.0) {
        uv = floor(uv / pixelSize) * pixelSize + pixelSize * 0.5;
      }

      // Glitch offset
      if (glitchIntensity > 0.0) {
        float glitchLine = step(0.99 - glitchIntensity * 0.1, random(vec2(floor(time * 20.0), floor(uv.y * 40.0))));
        uv.x += glitchLine * glitchIntensity * 0.05 * (random(vec2(time)) - 0.5);

        // Color channel split
        float split = glitchIntensity * 0.003;
        float r = texture2D(tDiffuse, uv + vec2(split, 0.0)).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;
        gl_FragColor = vec4(r, g, b, 1.0);
      } else {
        gl_FragColor = texture2D(tDiffuse, uv);
      }

      // Scanlines
      float scanline = sin(uv.y * 800.0 + time * 2.0) * 0.5 + 0.5;
      gl_FragColor.rgb -= scanlineIntensity * scanline;

      // Noise
      if (noiseIntensity > 0.0) {
        float noise = random(uv + time) * noiseIntensity;
        gl_FragColor.rgb += noise - noiseIntensity * 0.5;
      }

      // Color channel rotation (Era 4: distortion)
      if (colorShift > 0.0) {
        vec3 c = gl_FragColor.rgb;
        gl_FragColor.rgb = mix(c, vec3(c.g, c.b, c.r), colorShift);
      }

      // Brightness compensation (counteracts darkening from scanlines/effects)
      gl_FragColor.rgb *= brightness;
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer.renderer);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom pass — only enabled during defiance effects to save GPU
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.3, 0.6, 0.85);
    this.bloomPass.enabled = false;
    this.composer.addPass(this.bloomPass);

    this.glitchPass = new ShaderPass(GlitchScanlineShader);
    this.composer.addPass(this.glitchPass);

    // OutputPass: Linear → sRGB conversion (required for correct brightness with EffectComposer)
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    // PostFX disabled by default — use direct renderer for performance
    this.enabled = false;
  }

  setGlitch(intensity) {
    this.glitchPass.uniforms.glitchIntensity.value = intensity;
    if (intensity > 0) this.enabled = true;
  }

  setBloom(enabled) {
    this.bloomPass.enabled = enabled;
  }

  setScanlines(intensity) {
    this.glitchPass.uniforms.scanlineIntensity.value = intensity;
  }

  setNoise(intensity) {
    this.glitchPass.uniforms.noiseIntensity.value = intensity;
  }

  setPixelSize(size) {
    this.glitchPass.uniforms.pixelSize.value = size;
    if (size > 0) this.enabled = true;
  }

  setColorShift(amount) {
    this.glitchPass.uniforms.colorShift.value = amount;
    if (amount > 0) this.enabled = true;
  }

  setBrightness(value) {
    this.glitchPass.uniforms.brightness.value = value;
  }

  update(time) {
    this.glitchPass.uniforms.time.value = time;
  }

  render() {
    this.composer.render();
  }

  resize(width, height) {
    this.composer.setSize(width, height);
  }
}
