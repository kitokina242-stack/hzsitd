/**
 * HZSITD — 3D Model Viewer for Hero & Footer (bezabih.glb)
 * Uses the exact original 3D object as it is, with its authentic textures and materials.
 */
(function () {
  'use strict';

  function initViewer() {
    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
      return;
    }

    var heroWrap = document.getElementById('hero-3d-wrap');
    var footerWrap = document.getElementById('footer-3d-wrap');
    var heroCanvas = document.getElementById('hero-3d-canvas');
    var footerCanvas = document.getElementById('footer-3d-canvas');

    if (!heroCanvas && !footerCanvas) return;

    function createScene(canvas) {
      if (!canvas || !canvas.parentElement) return null;
      var parent = canvas.parentElement;
      var w = (parent && parent.clientWidth > 0) ? parent.clientWidth : Math.round(window.innerWidth * 0.5);
      var h = (parent && parent.clientHeight > 0) ? parent.clientHeight : Math.round(window.innerHeight * 0.75);

      var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(1);
      renderer.outputEncoding = THREE.sRGBEncoding;

      var scene = new THREE.Scene();
      var fov = 45;
      var camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
      camera.position.set(0, 0, 4);

      // Natural studio lighting to display the model's authentic textures
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));

      var keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(5, 7, 5);
      scene.add(keyLight);

      var fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
      fillLight.position.set(-5, -2, -2);
      scene.add(fillLight);

      return {
        canvas: canvas,
        renderer: renderer,
        scene: scene,
        camera: camera,
        pivot: null,
        fov: fov
      };
    }

    var heroView = heroCanvas ? createScene(heroCanvas) : null;
    var footerView = footerCanvas ? createScene(footerCanvas) : null;

    // Viewport visibility observer: Only render what's on screen
    var heroInView = true;
    var footerInView = false;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (heroWrap && entry.target === heroWrap) {
            heroInView = entry.isIntersecting;
          } else if (footerWrap && entry.target === footerWrap) {
            footerInView = entry.isIntersecting;
          }
        });
      }, { rootMargin: '100px' });

      if (heroWrap) observer.observe(heroWrap);
      if (footerWrap) observer.observe(footerWrap);
    }

    // Load original bezabih.glb with static version tag so browser can cache it
    var loader = new THREE.GLTFLoader();
    setTimeout(function () {
      loader.load(
        '../assets/bezabih.glb?v=pure_original_v4',
        function (gltf) {
          var baseModel = gltf.scene;

          var box = new THREE.Box3().setFromObject(baseModel);
          var size = box.getSize(new THREE.Vector3());
          var height = size.y || 1.86;

          function setupModelInView(view) {
            if (!view) return;
            var clone = baseModel.clone(true);

            var visibleHeight = 2 * Math.tan((view.fov / 2) * (Math.PI / 180)) * 4;
            var scale = (visibleHeight * 0.97) / height;
            clone.scale.setScalar(scale);

            // Bottom anchor alignment with zero gap
            var posY = -visibleHeight / 2 - (box.min.y * scale);
            var posX = -((box.min.x + box.max.x) / 2) * scale;
            var posZ = -((box.min.z + box.max.z) / 2) * scale;

            clone.position.set(posX, posY, posZ);

            var pivot = new THREE.Group();
            pivot.add(clone);
            view.scene.add(pivot);
            view.pivot = pivot;
          }

          setupModelInView(heroView);
          setupModelInView(footerView);

          var hasIntro = document.getElementById('intro-overlay');
          if (!hasIntro || window.__heroShouldReveal) {
            if (heroWrap) heroWrap.classList.add('appeared');
          }
          if (footerWrap) footerWrap.classList.add('appeared');

          // Smooth 30 FPS render loop — zero rendering during intro to eliminate all stutter
          var interval = 1000 / 30; // 33.3ms
          var then = performance.now();

          function animate(now) {
            requestAnimationFrame(animate);

            // NEVER render 3D scenes while the intro loader overlay is active!
            var overlay = document.getElementById('intro-overlay');
            if (overlay && !window.__heroShouldReveal) {
              return;
            }

            var elapsed = now - then;
            if (elapsed < interval) return;
            then = now - (elapsed % interval);

            var dtRatio = Math.min(elapsed / 16.67, 2.0);

            if (heroInView && heroView && heroView.pivot) {
              heroView.pivot.rotation.y += 0.007 * dtRatio;
              heroView.renderer.render(heroView.scene, heroView.camera);
            }

            if (footerInView && footerView && footerView.pivot) {
              footerView.pivot.rotation.y += 0.007 * dtRatio;
              footerView.renderer.render(footerView.scene, footerView.camera);
            }
          }
          requestAnimationFrame(animate);
        },
        undefined,
        function (err) {
          console.error('Failed to load bezabih.glb:', err);
        }
      );
    }, 300);

    // Responsive resize handler
    window.addEventListener('resize', function () {
      [heroView, footerView].forEach(function (view) {
        if (!view || !view.canvas.parentElement) return;
        var p = view.canvas.parentElement;
        var nw = p.clientWidth;
        var nh = p.clientHeight;
        if (nw > 0 && nh > 0) {
          view.camera.aspect = nw / nh;
          view.camera.updateProjectionMatrix();
          view.renderer.setSize(nw, nh, false);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewer);
  } else {
    initViewer();
  }
})();
